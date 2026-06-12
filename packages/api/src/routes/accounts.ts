import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import { requireRole } from '../lib/rbac.js'
import { nestedDealFilter } from '../lib/ownership.js'
import { parsePageQuery, paginatedResponse } from '../lib/pagination.js'

const router = Router()
router.use(protectedMiddleware)

const accountSchema = z.object({
  name: z.string().min(1),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  website: z.string().optional(),
})

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const { page, pageSize, skip } = parsePageQuery(req)

  const where = {
    organizationId: req.auth!.organizationId,
    ...(q
      ? {
          OR: [{ name: { contains: q } }, { industry: { contains: q } }],
        }
      : {}),
  }

  const [total, accounts] = await Promise.all([
    prisma.account.count({ where }),
    prisma.account.findMany({
      where,
      include: {
        _count: { select: { contacts: true, deals: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  res.json(paginatedResponse(accounts, total, page, pageSize))
})

router.post('/', async (req, res) => {
  const parsed = accountSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const account = await prisma.account.create({
    data: {
      ...parsed.data,
      organizationId: req.auth!.organizationId,
    },
    include: { _count: { select: { contacts: true, deals: true } } },
  })

  res.status(201).json(account)
})

router.get('/:id', async (req, res) => {
  const account = await prisma.account.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
    include: {
      contacts: { orderBy: { updatedAt: 'desc' } },
      deals: {
        where: nestedDealFilter(req),
        orderBy: { updatedAt: 'desc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  })

  if (!account) {
    res.status(404).json({ error: 'Account not found' })
    return
  }

  res.json(account)
})

router.patch('/:id', async (req, res) => {
  const parsed = accountSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const existing = await prisma.account.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
  })

  if (!existing) {
    res.status(404).json({ error: 'Account not found' })
    return
  }

  const account = await prisma.account.update({
    where: { id: existing.id },
    data: parsed.data,
    include: { _count: { select: { contacts: true, deals: true } } },
  })

  res.json(account)
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const existing = await prisma.account.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
  })

  if (!existing) {
    res.status(404).json({ error: 'Account not found' })
    return
  }

  await prisma.account.delete({ where: { id: existing.id } })
  res.json({ deleted: true })
})

export default router
