import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import { requireRole } from '../lib/rbac.js'
import {
  assigneeInclude,
  assigneeListInclude,
  buildLeadListWhere,
  canAccessAssignedRecord,
  validateAssignee,
  validateAssigneeChange,
  AssigneeError,
} from '../lib/ownership.js'
import {
  assertContactInOrg,
  handleAssigneeError,
  handleOrgValidationError,
} from '../lib/orgValidation.js'
import { parsePageQuery, paginatedResponse } from '../lib/pagination.js'
import { recalculateLeadScore, recalculateOrgLeadScores } from '../lib/leadScoring.js'

const router = Router()
router.use(protectedMiddleware)

const statusEnum = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'])

const createLeadSchema = z.object({
  title: z.string().min(1),
  status: statusEnum.optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  contactId: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
})

const importSchema = z.object({
  leads: z
    .array(
      z.object({
        title: z.string().min(1),
        status: statusEnum.optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .min(1)
    .max(500),
})

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const status =
    typeof req.query.status === 'string' ? req.query.status : undefined
  const assignedTo =
    typeof req.query.assignedTo === 'string' ? req.query.assignedTo : undefined

  const statusParsed = status ? statusEnum.safeParse(status) : null
  if (status && !statusParsed?.success) {
    res.status(400).json({ error: 'Invalid status filter' })
    return
  }

  const { page, pageSize, skip } = parsePageQuery(req)
  const where = buildLeadListWhere(req, {
    q: q || undefined,
    status: statusParsed?.success ? statusParsed.data : undefined,
    assignedTo,
  })

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      include: {
        contact: { include: { account: true } },
        ...assigneeListInclude,
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  res.json(paginatedResponse(leads, total, page, pageSize))
})

router.post(
  '/recalculate-scores',
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const result = await recalculateOrgLeadScores(req.auth!.organizationId)
    res.json(result)
  },
)

router.post('/import', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = importSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const orgId = req.auth!.organizationId

  const created = await prisma.$transaction(
    parsed.data.leads.map((lead) =>
      prisma.lead.create({
        data: {
          ...lead,
          organizationId: orgId,
          assignedToId: req.auth!.userId,
        },
        include: { contact: true, ...assigneeInclude },
      }),
    ),
  )

  res.status(201).json({ imported: created.length, leads: created })
})

router.post('/', async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const orgId = req.auth!.organizationId
    const contactId = parsed.data.contactId || undefined

    await assertContactInOrg(orgId, contactId)

    let assignedToId = req.auth!.userId
    if (parsed.data.assignedToId !== undefined) {
      validateAssigneeChange(req, parsed.data.assignedToId)
      assignedToId = parsed.data.assignedToId ?? req.auth!.userId
    }

    if (!(await validateAssignee(orgId, assignedToId))) {
      res.status(400).json({ error: 'Invalid assignee' })
      return
    }

    const lead = await prisma.lead.create({
      data: {
        title: parsed.data.title,
        status: parsed.data.status,
        source: parsed.data.source,
        notes: parsed.data.notes,
        contactId,
        assignedToId,
        organizationId: orgId,
      },
      include: { contact: { include: { account: true } }, ...assigneeInclude },
    })

    await recalculateLeadScore(lead.id, orgId)
    const scored = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: { contact: { include: { account: true } }, ...assigneeInclude },
    })

    res.status(201).json(scored ?? lead)
  } catch (err) {
    if (handleOrgValidationError(err, res)) return
    if (handleAssigneeError(err, res)) return
    throw err
  }
})

router.get('/:id', async (req, res) => {
  const lead = await prisma.lead.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
    include: {
      contact: { include: { account: true } },
      ...assigneeInclude,
      activities: {
        include: { createdBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!lead || !canAccessAssignedRecord(req, lead.assignedToId)) {
    res.status(404).json({ error: 'Lead not found' })
    return
  }

  res.json(lead)
})

router.patch('/:id', async (req, res) => {
  const parsed = createLeadSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const existing = await prisma.lead.findFirst({
      where: {
        id: String(req.params.id),
        organizationId: req.auth!.organizationId,
      },
    })

    if (!existing || !canAccessAssignedRecord(req, existing.assignedToId)) {
      res.status(404).json({ error: 'Lead not found' })
      return
    }

    if (parsed.data.contactId !== undefined) {
      await assertContactInOrg(
        req.auth!.organizationId,
        parsed.data.contactId,
      )
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

    const lead = await prisma.lead.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { contact: { include: { account: true } }, ...assigneeInclude },
    })

    await recalculateLeadScore(lead.id, req.auth!.organizationId)
    const scored = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: { contact: { include: { account: true } }, ...assigneeInclude },
    })

    res.json(scored ?? lead)
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
  const existing = await prisma.lead.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
  })

  if (!existing || !canAccessAssignedRecord(req, existing.assignedToId)) {
    res.status(404).json({ error: 'Lead not found' })
    return
  }

  await prisma.lead.delete({ where: { id: existing.id } })
  res.json({ deleted: true })
})

export default router
