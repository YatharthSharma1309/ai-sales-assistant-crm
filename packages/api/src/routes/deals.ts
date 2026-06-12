import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import {
  assigneeInclude,
  assigneeListInclude,
  canAccessAssignedRecord,
  listOwnershipWhere,
  validateAssignee,
  validateAssigneeChange,
  AssigneeError,
} from '../lib/ownership.js'
import {
  assertAccountInOrg,
  assertContactInOrg,
  handleAssigneeError,
  handleOrgValidationError,
} from '../lib/orgValidation.js'
import { parsePageQuery, paginatedResponse } from '../lib/pagination.js'
import { buildKanbanDeals } from '../lib/kanbanDeals.js'
import { pushDealToHubSpot, pushDealToSalesforce } from '../lib/crmOutbound.js'
import { OPEN_STAGES } from '../lib/stages.js'
import type { DealStage } from '@prisma/client'

const router = Router()
router.use(protectedMiddleware)

const stageEnum = z.enum([
  'DISCOVERY',
  'DEMO_SCHEDULED',
  'TRIAL',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
])

const createDealSchema = z.object({
  title: z.string().min(1),
  stage: stageEnum.optional(),
  mrr: z.number().min(0).optional(),
  arr: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  contactId: z.string().optional().nullable(),
  accountId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  closeDate: z.string().optional().nullable(),
})

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: 'Discovery',
  DEMO_SCHEDULED: 'Demo Scheduled',
  TRIAL: 'Trial / POC',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

function parseCloseDate(value: string | null | undefined) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00.000Z`)
  }
  return new Date(value)
}

router.get('/', async (req, res) => {
  const assignedTo =
    typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined
  const { page, pageSize, skip } = parsePageQuery(req)
  const where = listOwnershipWhere(req, assignedTo)

  const [total, deals] = await Promise.all([
    prisma.deal.count({ where }),
    prisma.deal.findMany({
      where,
      include: { contact: true, account: true, ...assigneeListInclude },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  res.json(paginatedResponse(deals, total, page, pageSize))
})

router.get('/kanban', async (req, res) => {
  const assignedTo =
    typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined
  const perStage = Number(req.query.perStage) || undefined

  const stagePages: Partial<Record<DealStage, number>> = {}
  for (const stage of OPEN_STAGES) {
    const pageKey = `page_${stage}`
    const raw = req.query[pageKey]
    if (typeof raw === 'string' && raw) {
      stagePages[stage] = Math.max(1, Number(raw) || 1)
    }
  }

  const kanban = await buildKanbanDeals(req, {
    assignedTo,
    perStage,
    stagePages,
  })

  res.json(kanban)
})

router.get('/:id', async (req, res) => {
  const deal = await prisma.deal.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
    include: {
      contact: true,
      account: true,
      ...assigneeInclude,
      activities: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!deal || !canAccessAssignedRecord(req, deal.assignedToId)) {
    res.status(404).json({ error: 'Deal not found' })
    return
  }

  res.json(deal)
})

router.post('/', async (req, res) => {
  const parsed = createDealSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const orgId = req.auth!.organizationId
    const { closeDate, assignedToId: rawAssignee, contactId, accountId, ...rest } =
      parsed.data

    await assertContactInOrg(orgId, contactId)
    await assertAccountInOrg(orgId, accountId)

    let assignedToId = req.auth!.userId
    if (rawAssignee !== undefined) {
      validateAssigneeChange(req, rawAssignee)
      assignedToId = rawAssignee ?? req.auth!.userId
    }

    if (!(await validateAssignee(orgId, assignedToId))) {
      res.status(400).json({ error: 'Invalid assignee' })
      return
    }

    const deal = await prisma.deal.create({
      data: {
        ...rest,
        contactId,
        accountId,
        assignedToId,
        closeDate: closeDate ? parseCloseDate(closeDate) : undefined,
        organizationId: orgId,
      },
      include: { contact: true, account: true, ...assigneeInclude },
    })

    res.status(201).json(deal)
  } catch (err) {
    if (handleOrgValidationError(err, res)) return
    if (handleAssigneeError(err, res)) return
    throw err
  }
})

router.patch('/:id', async (req, res) => {
  const parsed = createDealSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const existing = await prisma.deal.findFirst({
      where: {
        id: String(req.params.id),
        organizationId: req.auth!.organizationId,
      },
    })

    if (!existing || !canAccessAssignedRecord(req, existing.assignedToId)) {
      res.status(404).json({ error: 'Deal not found' })
      return
    }

    if (parsed.data.contactId !== undefined) {
      await assertContactInOrg(req.auth!.organizationId, parsed.data.contactId)
    }
    if (parsed.data.accountId !== undefined) {
      await assertAccountInOrg(req.auth!.organizationId, parsed.data.accountId)
    }

    if (parsed.data.assignedToId !== undefined) {
      validateAssigneeChange(req, parsed.data.assignedToId)
      if (
        !(await validateAssignee(
          req.auth!.organizationId,
          parsed.data.assignedToId,
        ))
      ) {
        res.status(400).json({ error: 'Invalid assignee' })
        return
      }
    }

    const { closeDate, ...rest } = parsed.data
    const stageChanged =
      rest.stage !== undefined && rest.stage !== existing.stage

    const deal = await prisma.$transaction(async (tx) => {
      const updated = await tx.deal.update({
        where: { id: existing.id },
        data: {
          ...rest,
          ...(closeDate !== undefined
            ? { closeDate: closeDate ? parseCloseDate(closeDate) : null }
            : {}),
        },
        include: { contact: true, account: true, ...assigneeInclude },
      })

      if (stageChanged && rest.stage) {
        await tx.activity.create({
          data: {
            organizationId: req.auth!.organizationId,
            dealId: existing.id,
            contactId: existing.contactId,
            createdById: req.auth!.userId,
            type: 'NOTE',
            title: `Stage moved to ${STAGE_LABELS[rest.stage] ?? rest.stage}`,
            body: `Pipeline stage changed from ${STAGE_LABELS[existing.stage] ?? existing.stage} to ${STAGE_LABELS[rest.stage] ?? rest.stage}.`,
          },
        })
      }

      return updated
    })

    void pushDealToHubSpot(deal).catch(() => {})
    void pushDealToSalesforce(deal).catch(() => {})

    res.json(deal)
  } catch (err) {
    if (handleOrgValidationError(err, res)) return
    if (handleAssigneeError(err, res)) return
    if (err instanceof AssigneeError) {
      res.status(403).json({ error: err.message })
      return
    }
    throw err
  }
})

router.delete('/:id', async (req, res) => {
  const existing = await prisma.deal.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
  })

  if (!existing || !canAccessAssignedRecord(req, existing.assignedToId)) {
    res.status(404).json({ error: 'Deal not found' })
    return
  }

  await prisma.deal.delete({ where: { id: existing.id } })
  res.json({ deleted: true })
})

export default router
