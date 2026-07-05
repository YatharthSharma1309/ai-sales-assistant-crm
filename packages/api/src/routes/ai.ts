import { Router } from 'express'
import { z } from 'zod'
import { protectedMiddleware } from '../lib/auth.js'
import { aiLimiter } from '../middleware/rateLimit.js'
import { prisma } from '../lib/prisma.js'
import {
  buildEmailContextFromDeal,
  buildEmailContextFromLead,
  buildMockEmail,
  generateEmailWithAI,
  type EmailContext,
} from '../lib/emailContext.js'
import {
  buildMockMeetingSummary,
  formatMeetingActivityBody,
  generateMeetingSummaryWithAI,
  meetingSummaryResultSchema,
} from '../lib/meetingSummary.js'
import { scoreEmailDraft } from '../lib/emailQuality.js'
import { isOpenRouterConfigured } from '../lib/openRouter.js'
import {
  assertDealAccess,
  assertLeadAccess,
  handleRecordAccessError,
} from '../lib/recordAccess.js'
import { assertContactInOrg, handleOrgValidationError } from '../lib/orgValidation.js'

const router = Router()
router.use(protectedMiddleware)
router.use(aiLimiter)

const exclusiveIdRefine = {
  refine: (data: { leadId?: string; dealId?: string }) =>
    !(data.leadId && data.dealId),
  message: 'Provide leadId or dealId, not both',
}

const contextQuerySchema = z
  .object({
    leadId: z.string().optional(),
    dealId: z.string().optional(),
  })
  .refine(exclusiveIdRefine.refine, { message: exclusiveIdRefine.message })

const emailSchema = z
  .object({
    leadId: z.string().optional(),
    dealId: z.string().optional(),
    contactName: z.string().optional(),
    companyName: z.string().optional(),
    dealStage: z.string().optional(),
    lastActivity: z.string().optional(),
    tone: z.enum(['professional', 'friendly', 'urgent']).default('professional'),
    goal: z
      .enum(['schedule_demo', 'check_in', 'proposal_follow_up'])
      .default('check_in'),
    saveToTimeline: z.boolean().optional(),
  })
  .refine(exclusiveIdRefine.refine, { message: exclusiveIdRefine.message })
  .refine(
    (data) =>
      data.leadId ||
      data.dealId ||
      (data.contactName && data.contactName.length > 0),
    { message: 'Provide leadId, dealId, or contactName' },
  )

const summarizeSchema = z
  .object({
    title: z.string().min(1),
    transcript: z.string().min(20),
    leadId: z.string().optional(),
    dealId: z.string().optional(),
    contactId: z.string().optional(),
    saveToTimeline: z.boolean().optional(),
    createTasks: z.boolean().optional(),
  })
  .refine(exclusiveIdRefine.refine, { message: exclusiveIdRefine.message })

const MAX_ACTION_ITEMS = 10

router.get('/context', async (req, res) => {
  const parsed = contextQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { leadId, dealId } = parsed.data
  const orgId = req.auth!.organizationId

  if (!leadId && !dealId) {
    res.status(400).json({ error: 'Provide leadId or dealId' })
    return
  }

  try {
    if (leadId) await assertLeadAccess(req, orgId, leadId)
    if (dealId) await assertDealAccess(req, orgId, dealId)

    let context: EmailContext | null = null
    if (leadId) context = await buildEmailContextFromLead(leadId, orgId)
    else if (dealId) context = await buildEmailContextFromDeal(dealId, orgId)

    if (!context) {
      res.status(404).json({ error: 'Record not found' })
      return
    }

    res.json(context)
  } catch (err) {
    if (handleRecordAccessError(err, res)) return
    throw err
  }
})

router.post('/generate-email', async (req, res) => {
  const parsed = emailSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const {
    leadId,
    dealId,
    tone,
    goal,
    saveToTimeline,
    contactName,
    companyName,
    dealStage,
    lastActivity,
  } = parsed.data

  const orgId = req.auth!.organizationId

  try {
    let context: EmailContext

    if (leadId) {
      await assertLeadAccess(req, orgId, leadId)
      const built = await buildEmailContextFromLead(leadId, orgId)
      if (!built) {
        res.status(404).json({ error: 'Lead not found' })
        return
      }
      context = built
    } else if (dealId) {
      await assertDealAccess(req, orgId, dealId)
      const built = await buildEmailContextFromDeal(dealId, orgId)
      if (!built) {
        res.status(404).json({ error: 'Deal not found' })
        return
      }
      context = built
    } else {
      context = {
        contactName: contactName!,
        companyName,
        dealStage,
        lastActivity,
        recentActivities: lastActivity ? [lastActivity] : [],
        sourceType: 'manual',
      }
    }

    let subject: string
    let body: string
    let source: string
    let message: string | undefined

    if (!isOpenRouterConfigured()) {
      const mock = buildMockEmail(context, goal)
      subject = mock.subject
      body = mock.body
      source = 'mock'
      message = 'Set OPENROUTER_API_KEY for AI-generated drafts'
    } else {
      try {
        const result = await generateEmailWithAI(context, tone, goal)
        subject = result.subject
        body = result.body
        source = 'openrouter'
      } catch (error) {
        const mock = buildMockEmail(context, goal)
        subject = mock.subject
        body = mock.body
        source = 'mock'
        message =
          error instanceof Error
            ? `OpenRouter unavailable (${error.message}); using template draft`
            : 'OpenRouter unavailable; using template draft'
      }
    }

    let activityId: string | undefined

    if (saveToTimeline && context.sourceType !== 'manual') {
      const activity = await prisma.activity.create({
        data: {
          organizationId: orgId,
          leadId: leadId ?? undefined,
          dealId: dealId ?? undefined,
          contactId: context.contactId,
          createdById: req.auth!.userId,
          type: 'EMAIL',
          title: `Follow-up draft: ${subject}`,
          body,
        },
      })
      activityId = activity.id
    }

    res.json({
      subject,
      body,
      source,
      message,
      context,
      activityId,
      quality: scoreEmailDraft({
        subject,
        body,
        contactName: context.contactName,
        companyName: context.companyName,
      }),
    })
  } catch (err) {
    if (handleRecordAccessError(err, res)) return
    throw err
  }
})

async function resolveMeetingLinks(
  req: Parameters<typeof assertLeadAccess>[0],
  orgId: string,
  ids: { leadId?: string; dealId?: string; contactId?: string },
) {
  let contactId = ids.contactId
  let leadId = ids.leadId
  let dealId = ids.dealId
  const context: Record<string, unknown> = {}

  if (leadId) {
    const lead = await assertLeadAccess(req, orgId, leadId)
    const fullLead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
      include: { contact: { include: { account: true } } },
    })
    if (!fullLead) return null
    if (contactId && contactId !== fullLead.contactId) {
      throw new Error('Contact does not match lead')
    }
    contactId = contactId ?? fullLead.contactId ?? undefined
    context.leadTitle = fullLead.title
    context.leadStatus = fullLead.status
    if (fullLead.contact) {
      context.contactName = `${fullLead.contact.firstName} ${fullLead.contact.lastName}`
      context.company = fullLead.contact.account?.name
    }
  }

  if (dealId) {
    const deal = await assertDealAccess(req, orgId, dealId)
    const fullDeal = await prisma.deal.findFirst({
      where: { id: dealId, organizationId: orgId },
      include: { contact: true, account: true },
    })
    if (!fullDeal) return null
    if (contactId && contactId !== fullDeal.contactId) {
      throw new Error('Contact does not match deal')
    }
    contactId = contactId ?? fullDeal.contactId ?? undefined
    context.dealTitle = deal.title
    context.dealStage = deal.stage
    if (fullDeal.contact) {
      context.contactName = `${fullDeal.contact.firstName} ${fullDeal.contact.lastName}`
    }
    if (fullDeal.account) context.company = fullDeal.account.name
  }

  if (contactId) {
    await assertContactInOrg(orgId, contactId)
    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId },
      include: { account: true },
    })
    if (!contact) return null
    context.contactName = `${contact.firstName} ${contact.lastName}`
    if (contact.account) context.company = contact.account.name
  }

  return { contactId, leadId, dealId, context }
}

router.post('/summarize-meeting', async (req, res) => {
  const parsed = summarizeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const {
    title,
    transcript,
    leadId,
    dealId,
    contactId,
    saveToTimeline,
    createTasks,
  } = parsed.data

  const orgId = req.auth!.organizationId

  try {
    const links = await resolveMeetingLinks(req, orgId, {
      leadId,
      dealId,
      contactId,
    })

    if ((leadId || dealId || contactId) && !links) {
      res.status(404).json({ error: 'Linked record not found' })
      return
    }

    let result
    let source: string
    let message: string | undefined

    if (!isOpenRouterConfigured()) {
      result = buildMockMeetingSummary(transcript, title)
      source = 'mock'
      message = 'Set OPENROUTER_API_KEY for AI-generated summaries'
    } else {
      try {
        result = await generateMeetingSummaryWithAI(
          transcript,
          title,
          links?.context ?? {},
        )
        source = 'openrouter'
      } catch (error) {
        result = buildMockMeetingSummary(transcript, title)
        source = 'mock'
        message =
          error instanceof Error
            ? `OpenRouter unavailable (${error.message}); using template summary`
            : 'OpenRouter unavailable; using template summary'
      }
    }

    const validated = meetingSummaryResultSchema.parse(result)
    const actionItems = validated.actionItems.slice(0, MAX_ACTION_ITEMS)

    let meetingActivityId: string | undefined
    const taskActivityIds: string[] = []

    if (saveToTimeline) {
      const meetingActivity = await prisma.activity.create({
        data: {
          organizationId: orgId,
          leadId: links?.leadId,
          dealId: links?.dealId,
          contactId: links?.contactId,
          createdById: req.auth!.userId,
          type: 'MEETING',
          title: `Meeting: ${title}`,
          body: formatMeetingActivityBody({ ...validated, actionItems }, transcript),
        },
      })
      meetingActivityId = meetingActivity.id

      if (createTasks !== false) {
        for (const item of actionItems) {
          const dueAt = new Date()
          dueAt.setDate(dueAt.getDate() + (item.dueInDays ?? 3))
          const task = await prisma.activity.create({
            data: {
              organizationId: orgId,
              leadId: links?.leadId,
              dealId: links?.dealId,
              contactId: links?.contactId,
              createdById: req.auth!.userId,
              type: 'TASK',
              title: item.title,
              dueAt,
            },
          })
          taskActivityIds.push(task.id)
        }
      }
    }

    if (links?.dealId) {
      const objectionCount = validated.objections.length
      const riskLevel =
        objectionCount >= 2 ? 'high' : objectionCount === 1 ? 'medium' : 'low'
      const riskNote =
        validated.objections.length > 0
          ? `Objections: ${validated.objections.join('; ')}`
          : validated.summary.slice(0, 280)

      await prisma.deal.update({
        where: { id: links.dealId },
        data: { riskLevel, riskNote },
      })
    }

    res.json({
      ...validated,
      actionItems,
      source,
      message,
      meetingActivityId,
      taskActivityIds,
    })
  } catch (err) {
    if (handleRecordAccessError(err, res)) return
    if (handleOrgValidationError(err, res)) return
    if (err instanceof Error && err.message.includes('Contact does not match')) {
      res.status(400).json({ error: err.message })
      return
    }
    throw err
  }
})

export default router
