import { Router, type Request } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import {
  assertActivityRecordAccess,
  handleActivityAccessError,
} from '../lib/activityAccess.js'
import { isManagerRole } from '../lib/rbac.js'
import { handleOrgValidationError } from '../lib/orgValidation.js'
import { parsePageQuery, paginatedResponse } from '../lib/pagination.js'
import { recalculateLeadScore } from '../lib/leadScoring.js'

const router = Router()
router.use(protectedMiddleware)

const createActivitySchema = z.object({
  type: z.enum(['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK']),
  title: z.string().min(1),
  body: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  dueAt: z.string().optional(),
})

const updateActivitySchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional().nullable(),
  dueAt: z.string().optional().nullable(),
  completed: z.boolean().optional(),
})

function parseDueAt(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`)
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function canModifyActivity(
  req: Request,
  activity: {
    createdById: string | null
    lead: { assignedToId: string | null } | null
    deal: { assignedToId: string | null } | null
  },
): boolean {
  if (isManagerRole(req.auth!.role)) return true
  const isOwner = activity.createdById === req.auth!.userId
  const canAccessLead =
    !activity.lead || activity.lead.assignedToId === req.auth!.userId
  const canAccessDeal =
    !activity.deal || activity.deal.assignedToId === req.auth!.userId
  return isOwner && canAccessLead && canAccessDeal
}

router.get('/', async (req, res) => {
  const leadId = typeof req.query.leadId === 'string' ? req.query.leadId : undefined
  const contactId =
    typeof req.query.contactId === 'string' ? req.query.contactId : undefined
  const dealId = typeof req.query.dealId === 'string' ? req.query.dealId : undefined

  if (!leadId && !contactId && !dealId) {
    res.status(400).json({ error: 'Provide leadId, contactId, or dealId' })
    return
  }

  const orgId = req.auth!.organizationId
  const { page, pageSize, skip } = parsePageQuery(req)

  try {
    await assertActivityRecordAccess(req, orgId, { leadId, contactId, dealId })

    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: orgId },
      })

      const where = {
        organizationId: orgId,
        OR: [
          { leadId },
          ...(lead?.contactId ? [{ contactId: lead.contactId }] : []),
        ],
      }

      const [total, activities] = await Promise.all([
        prisma.activity.count({ where }),
        prisma.activity.findMany({
          where,
          include: {
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
      ])

      res.json(paginatedResponse(activities, total, page, pageSize))
      return
    }

    const where = {
      organizationId: orgId,
      ...(contactId ? { contactId } : {}),
      ...(dealId ? { dealId } : {}),
    }

    const [total, activities] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ])

    res.json(paginatedResponse(activities, total, page, pageSize))
  } catch (err) {
    if (handleActivityAccessError(err, res)) return
    if (handleOrgValidationError(err, res)) return
    throw err
  }
})

router.post('/', async (req, res) => {
  const parsed = createActivitySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { dueAt, ...data } = parsed.data
  const orgId = req.auth!.organizationId

  try {
    await assertActivityRecordAccess(req, orgId, {
      leadId: data.leadId,
      contactId: data.contactId,
      dealId: data.dealId,
    })

    const activity = await prisma.activity.create({
      data: {
        ...data,
        dueAt: parseDueAt(dueAt) ?? undefined,
        organizationId: orgId,
        createdById: req.auth!.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    })

    if (data.leadId) {
      await recalculateLeadScore(data.leadId, orgId)
    }

    res.status(201).json(activity)
  } catch (err) {
    if (handleActivityAccessError(err, res)) return
    if (handleOrgValidationError(err, res)) return
    throw err
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = updateActivitySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const activity = await prisma.activity.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
    include: { lead: true, deal: true },
  })

  if (!activity || !canModifyActivity(req, activity)) {
    res.status(404).json({ error: 'Activity not found' })
    return
  }

  const { completed, dueAt, ...rest } = parsed.data
  const dueAtParsed = parseDueAt(dueAt)

  const updated = await prisma.activity.update({
    where: { id: activity.id },
    data: {
      ...rest,
      ...(dueAt !== undefined ? { dueAt: dueAtParsed } : {}),
      ...(completed === true
        ? { completedAt: new Date() }
        : completed === false
          ? { completedAt: null }
          : {}),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  })

  res.json(updated)
})

router.delete('/:id', async (req, res) => {
  const activity = await prisma.activity.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
    include: { lead: true, deal: true },
  })

  if (!activity || !canModifyActivity(req, activity)) {
    res.status(404).json({ error: 'Activity not found' })
    return
  }

  await prisma.activity.delete({ where: { id: activity.id } })
  res.json({ deleted: true })
})

export default router
