import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import { requireRole } from '../lib/rbac.js'
import {
  formatEmailLogAddress,
  generateEmailLogToken,
} from '../lib/emailLogToken.js'

const router = Router()
router.use(protectedMiddleware)

const updateOrgSchema = z.object({
  name: z.string().min(1),
})

router.get('/', async (req, res) => {
  const organization = await prisma.organization.findUnique({
    where: { id: req.auth!.organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      _count: {
        select: {
          memberships: true,
          leads: true,
          deals: true,
        },
      },
    },
  })

  if (!organization) {
    res.status(404).json({ error: 'Organization not found' })
    return
  }

  res.json(organization)
})

router.get('/email-log', async (req, res) => {
  let org = await prisma.organization.findUnique({
    where: { id: req.auth!.organizationId },
    select: { emailLogToken: true },
  })

  if (!org?.emailLogToken) {
    org = await prisma.organization.update({
      where: { id: req.auth!.organizationId },
      data: { emailLogToken: generateEmailLogToken() },
      select: { emailLogToken: true },
    })
  }

  const address = formatEmailLogAddress(org!.emailLogToken!)
  if (req.auth!.role === 'ADMIN') {
    res.json({ address, token: org!.emailLogToken })
    return
  }
  res.json({ address })
})

router.post('/email-log/regenerate', requireRole('ADMIN'), async (req, res) => {
  const org = await prisma.organization.update({
    where: { id: req.auth!.organizationId },
    data: { emailLogToken: generateEmailLogToken() },
    select: { emailLogToken: true },
  })

  res.json({
    address: formatEmailLogAddress(org.emailLogToken!),
    token: org.emailLogToken,
  })
})

router.patch('/', requireRole('ADMIN'), async (req, res) => {
  const parsed = updateOrgSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const organization = await prisma.organization.update({
    where: { id: req.auth!.organizationId },
    data: { name: parsed.data.name },
    select: { id: true, name: true, slug: true },
  })

  res.json(organization)
})

export default router
