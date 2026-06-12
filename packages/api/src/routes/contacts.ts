import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import { nestedDealFilter, nestedLeadFilter } from '../lib/ownership.js'
import { requireRole } from '../lib/rbac.js'
import {
  assertAccountInOrg,
  assertUniqueContactEmail,
  handleOrgValidationError,
} from '../lib/orgValidation.js'
import { parsePageQuery, paginatedResponse } from '../lib/pagination.js'
import { pushContactToHubSpot } from '../lib/crmOutbound.js'

const router = Router()
router.use(protectedMiddleware)

const contactSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  accountId: z.string().optional().nullable(),
})

router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const accountId =
    typeof req.query.accountId === 'string' ? req.query.accountId : undefined
  const { page, pageSize, skip } = parsePageQuery(req)

  const where = {
    organizationId: req.auth!.organizationId,
    ...(accountId ? { accountId } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { email: { contains: q } },
            { jobTitle: { contains: q } },
          ],
        }
      : {}),
  }

  const [total, contacts] = await Promise.all([
    prisma.contact.count({ where }),
    prisma.contact.findMany({
      where,
      include: { account: true },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),
  ])

  res.json(paginatedResponse(contacts, total, page, pageSize))
})

router.post('/', async (req, res) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const { email, accountId, ...rest } = parsed.data
    await assertAccountInOrg(req.auth!.organizationId, accountId)
    await assertUniqueContactEmail(req.auth!.organizationId, email || null)

    const contact = await prisma.contact.create({
      data: {
        ...rest,
        accountId: accountId || null,
        email: email || null,
        organizationId: req.auth!.organizationId,
      },
      include: { account: true },
    })

    res.status(201).json(contact)
  } catch (err) {
    if (handleOrgValidationError(err, res)) return
    throw err
  }
})

router.get('/:id', async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
    include: {
      account: true,
      leads: {
        where: nestedLeadFilter(req),
        orderBy: { updatedAt: 'desc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
      deals: {
        where: nestedDealFilter(req),
        orderBy: { updatedAt: 'desc' },
        include: { assignedTo: { select: { id: true, name: true } } },
      },
    },
  })

  if (!contact) {
    res.status(404).json({ error: 'Contact not found' })
    return
  }

  res.json(contact)
})

router.patch('/:id', async (req, res) => {
  const parsed = contactSchema.partial().safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  try {
    const existing = await prisma.contact.findFirst({
      where: {
        id: String(req.params.id),
        organizationId: req.auth!.organizationId,
      },
    })

    if (!existing) {
      res.status(404).json({ error: 'Contact not found' })
      return
    }

    if (parsed.data.accountId !== undefined) {
      await assertAccountInOrg(
        req.auth!.organizationId,
        parsed.data.accountId,
      )
    }

    const { email, ...rest } = parsed.data
    if (email !== undefined) {
      await assertUniqueContactEmail(
        req.auth!.organizationId,
        email || null,
        existing.id,
      )
    }
    const contact = await prisma.contact.update({
      where: { id: existing.id },
      data: {
        ...rest,
        ...(email !== undefined ? { email: email || null } : {}),
      },
      include: { account: true },
    })

    void pushContactToHubSpot(contact).catch(() => {})

    res.json(contact)
  } catch (err) {
    if (handleOrgValidationError(err, res)) return
    throw err
  }
})

router.delete('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const existing = await prisma.contact.findFirst({
    where: {
      id: String(req.params.id),
      organizationId: req.auth!.organizationId,
    },
  })

  if (!existing) {
    res.status(404).json({ error: 'Contact not found' })
    return
  }

  await prisma.contact.delete({ where: { id: existing.id } })
  res.json({ deleted: true })
})

export default router
