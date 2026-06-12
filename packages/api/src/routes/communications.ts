import { Router } from 'express'
import { z } from 'zod'
import { protectedMiddleware } from '../lib/auth.js'
import { prisma } from '../lib/prisma.js'
import { sendEmail } from '../lib/emailSend.js'
import {
  extractTokenFromAddress,
  formatEmailLogAddress,
  generateEmailLogToken,
} from '../lib/emailLogToken.js'
import { recalculateLeadScore } from '../lib/leadScoring.js'
import {
  assertActivityRecordAccess,
  handleActivityAccessError,
} from '../lib/activityAccess.js'
import { handleOrgValidationError } from '../lib/orgValidation.js'

const router = Router()
const INBOUND_WEBHOOK_SECRET = process.env.INBOUND_EMAIL_WEBHOOK_SECRET

const inboundSchema = z.object({
  from: z.string().email().or(z.string().min(3)),
  to: z.union([z.string(), z.array(z.string())]),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  messageId: z.string().optional(),
})

function verifyInboundWebhook(req: { headers: Record<string, unknown> }): boolean {
  if (!INBOUND_WEBHOOK_SECRET) return process.env.NODE_ENV !== 'production'
  const header =
    req.headers['x-webhook-secret'] ?? req.headers['x-inbound-secret']
  return header === INBOUND_WEBHOOK_SECRET
}

router.post('/inbound', async (req, res) => {
  if (!verifyInboundWebhook(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const parsed = inboundSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const recipients = Array.isArray(parsed.data.to)
    ? parsed.data.to
    : [parsed.data.to]

  let organizationId: string | null = null
  for (const address of recipients) {
    const token = extractTokenFromAddress(address)
    if (!token) continue
    const org = await prisma.organization.findFirst({
      where: { emailLogToken: token },
      select: { id: true },
    })
    if (org) {
      organizationId = org.id
      break
    }
  }

  if (!organizationId) {
    res.status(404).json({ error: 'Unknown BCC address' })
    return
  }

  const fromEmail = parsed.data.from.match(/<([^>]+)>/)?.[1] ?? parsed.data.from
  const subject = parsed.data.subject ?? '(no subject)'
  const body = parsed.data.text ?? parsed.data.html ?? ''
  const externalMessageId = parsed.data.messageId

  if (externalMessageId) {
    const existing = await prisma.activity.findFirst({
      where: { organizationId, externalMessageId },
    })
    if (existing) {
      res.json({ logged: false, duplicate: true, activityId: existing.id })
      return
    }
  }

  const contact = await prisma.contact.findFirst({
    where: {
      organizationId,
      email: fromEmail.toLowerCase(),
    },
    select: { id: true },
  })

  const lead = contact
    ? await prisma.lead.findFirst({
        where: { organizationId, contactId: contact.id },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      })
    : null

  const activity = await prisma.activity.create({
    data: {
      organizationId,
      contactId: contact?.id,
      leadId: lead?.id,
      type: 'EMAIL',
      title: `Inbound email: ${subject}`,
      body: `From: ${fromEmail}\n\n${body}`,
      externalMessageId,
    },
  })

  if (lead?.id) {
    await recalculateLeadScore(lead.id, organizationId)
  }

  res.json({ logged: true, activityId: activity.id })
})

router.use(protectedMiddleware)

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  contactId: z.string().optional(),
  logToTimeline: z.boolean().optional(),
})

router.post('/send', async (req, res) => {
  const parsed = sendSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const {
    to,
    subject,
    body,
    leadId,
    dealId,
    contactId,
    logToTimeline,
  } = parsed.data
  const orgId = req.auth!.organizationId

  try {
    await assertActivityRecordAccess(req, orgId, { leadId, dealId, contactId })

    let resolvedContactId = contactId
    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: orgId },
      })
      resolvedContactId = resolvedContactId ?? lead?.contactId ?? undefined
    }
    if (dealId) {
      const deal = await prisma.deal.findFirst({
        where: { id: dealId, organizationId: orgId },
      })
      resolvedContactId = resolvedContactId ?? deal?.contactId ?? undefined
    }

    let org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { emailLogToken: true },
    })
    if (!org?.emailLogToken) {
      org = await prisma.organization.update({
        where: { id: orgId },
        data: { emailLogToken: generateEmailLogToken() },
        select: { emailLogToken: true },
      })
    }
    const bccAddress = formatEmailLogAddress(org!.emailLogToken!)

    const result = await sendEmail({ to, subject, body, bcc: [bccAddress] })

    let activityId: string | undefined
    if (logToTimeline !== false) {
      const activity = await prisma.activity.create({
        data: {
          organizationId: orgId,
          leadId,
          dealId,
          contactId: resolvedContactId,
          createdById: req.auth!.userId,
          type: 'EMAIL',
          title: result.sent ? `Email sent: ${subject}` : `Email draft: ${subject}`,
          body: `To: ${to}\n\n${body}`,
        },
      })
      activityId = activity.id
    }

    res.json({ ...result, activityId })
  } catch (error) {
    if (handleActivityAccessError(error, res)) return
    if (handleOrgValidationError(error, res)) return
    res.status(500).json({
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
