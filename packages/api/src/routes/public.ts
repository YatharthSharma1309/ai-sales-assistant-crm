import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { recalculateLeadScore } from '../lib/leadScoring.js'
import { publicLeadLimiter } from '../middleware/rateLimit.js'

const router = Router()

const captureSchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  message: z.string().optional(),
})

router.get('/lead-form/:slug', publicLeadLimiter, async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { slug: req.params.slug },
    select: { id: true, name: true, slug: true },
  })
  if (!org) {
    res.status(404).json({ error: 'Workspace not found' })
    return
  }
  res.json({ organizationName: org.name, slug: org.slug })
})

router.post('/leads', publicLeadLimiter, async (req, res) => {
  const parsed = captureSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { token, name, email, company, message } = parsed.data

  const org = await prisma.organization.findFirst({
    where: { leadCaptureToken: token },
    select: { id: true, name: true },
  })

  if (!org) {
    res.status(401).json({ error: 'Invalid capture token' })
    return
  }

  const title = company
    ? `${company} — ${name}`
    : `${name} (web inquiry)`

  const notes = [
    message ? `Message: ${message}` : null,
    `Email: ${email}`,
    'Source: Web lead capture form',
  ]
    .filter(Boolean)
    .join('\n')

  const lead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      title,
      source: 'Web form',
      status: 'NEW',
      notes,
    },
  })

  await recalculateLeadScore(lead.id, org.id)

  res.status(201).json({
    ok: true,
    leadId: lead.id,
    message: `Thanks! ${org.name} will be in touch soon.`,
  })
})

export default router
