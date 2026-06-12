import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import { requireRole } from '../lib/rbac.js'
import {
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
  buildInviteAcceptUrl,
} from '../lib/inviteToken.js'
import { sendTeamInviteEmail } from '../lib/sendTeamInviteEmail.js'

const router = Router()
router.use(protectedMiddleware)

const inviteSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email(),
  role: z.enum(['MANAGER', 'REP']).default('REP'),
})

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'REP']),
})

router.get('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const orgId = req.auth!.organizationId

  const memberships = await prisma.membership.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: { id: true, name: true, email: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const userIds = memberships.map((m) => m.userId)

  const [activityCounts, leadCounts, dealCounts] = await Promise.all([
    prisma.activity.groupBy({
      by: ['createdById'],
      where: {
        organizationId: orgId,
        createdById: { in: userIds },
      },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ['assignedToId'],
      where: { organizationId: orgId, assignedToId: { in: userIds } },
      _count: { id: true },
    }),
    prisma.deal.groupBy({
      by: ['assignedToId'],
      where: { organizationId: orgId, assignedToId: { in: userIds } },
      _count: { id: true },
    }),
  ])

  const activityMap = new Map(
    activityCounts.map((row) => [row.createdById, row._count.id]),
  )
  const leadMap = new Map(
    leadCounts.map((row) => [row.assignedToId, row._count.id]),
  )
  const dealMap = new Map(
    dealCounts.map((row) => [row.assignedToId, row._count.id]),
  )

  res.json(
    memberships.map((m) => ({
      id: m.id,
      role: m.role,
      joinedAt: m.createdAt,
      user: m.user,
      activityCount: activityMap.get(m.userId) ?? 0,
      leadCount: leadMap.get(m.userId) ?? 0,
      dealCount: dealMap.get(m.userId) ?? 0,
    })),
  )
})

router.get('/invites', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const orgId = req.auth!.organizationId
  const invites = await prisma.teamInvite.findMany({
    where: {
      organizationId: orgId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  res.json(
    invites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      name: inv.name,
      role: inv.role,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      invitedBy: inv.invitedBy,
    })),
  )
})

router.post('/invite', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  let { role, email, name } = parsed.data
  const orgId = req.auth!.organizationId

  if (req.auth!.role === 'MANAGER') {
    if (role === 'MANAGER') {
      res.status(403).json({ error: 'Managers can only invite reps' })
      return
    }
    role = 'REP'
  }

  const existingMember = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: { where: { organizationId: orgId } },
    },
  })

  if (existingMember?.memberships.length) {
    res.status(409).json({ error: 'User is already on this team' })
    return
  }

  const pendingInvite = await prisma.teamInvite.findFirst({
    where: {
      organizationId: orgId,
      email,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (pendingInvite) {
    res.status(409).json({ error: 'A pending invite already exists for this email' })
    return
  }

  const { raw, hash } = generateInviteToken()
  const expiresAt = inviteExpiresAt()
  const inviteUrl = buildInviteAcceptUrl(raw)

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: orgId },
  })

  const inviter = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.userId },
  })

  const invite = await prisma.teamInvite.create({
    data: {
      organizationId: orgId,
      email,
      name: name ?? null,
      role,
      tokenHash: hash,
      invitedById: req.auth!.userId,
      expiresAt,
    },
    include: {
      invitedBy: { select: { id: true, name: true } },
    },
  })

  await sendTeamInviteEmail({
    to: email,
    inviterName: inviter.name,
    organizationName: organization.name,
    role,
    inviteUrl,
    expiresAt,
  })

  const response: Record<string, unknown> = {
    id: invite.id,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    invitedBy: invite.invitedBy,
  }

  if (process.env.NODE_ENV !== 'production') {
    response.inviteUrl = inviteUrl
  }

  res.status(201).json(response)
})

router.delete(
  '/invites/:id',
  requireRole('ADMIN'),
  async (req, res) => {
    const inviteId = String(req.params.id)
    const invite = await prisma.teamInvite.findFirst({
      where: {
        id: inviteId,
        organizationId: req.auth!.organizationId,
        acceptedAt: null,
      },
    })

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' })
      return
    }

    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { revokedAt: new Date() },
    })

    res.json({ revoked: true })
  },
)

router.post(
  '/invites/:id/resend',
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const inviteId = String(req.params.id)
    const invite = await prisma.teamInvite.findFirst({
      where: {
        id: inviteId,
        organizationId: req.auth!.organizationId,
        acceptedAt: null,
        revokedAt: null,
      },
      include: { organization: true },
    })

    if (!invite) {
      res.status(404).json({ error: 'Invite not found' })
      return
    }

    const { raw, hash } = generateInviteToken()
    const expiresAt = inviteExpiresAt()
    const inviteUrl = buildInviteAcceptUrl(raw)

    const inviter = await prisma.user.findUniqueOrThrow({
      where: { id: req.auth!.userId },
    })

    const updated = await prisma.teamInvite.update({
      where: { id: invite.id },
      data: { tokenHash: hash, expiresAt },
    })

    await sendTeamInviteEmail({
      to: invite.email,
      inviterName: inviter.name,
      organizationName: invite.organization.name,
      role: invite.role,
      inviteUrl,
      expiresAt,
    })

    const response: Record<string, unknown> = {
      id: updated.id,
      expiresAt: updated.expiresAt,
    }

    if (process.env.NODE_ENV !== 'production') {
      response.inviteUrl = inviteUrl
    }

    res.json(response)
  },
)

router.patch(
  '/:membershipId/role',
  requireRole('ADMIN'),
  async (req, res) => {
    const parsed = updateRoleSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    const membershipId = String(req.params.membershipId)
    const membership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: req.auth!.organizationId,
      },
    })

    if (!membership) {
      res.status(404).json({ error: 'Team member not found' })
      return
    }

    if (
      membership.userId === req.auth!.userId &&
      parsed.data.role !== 'ADMIN'
    ) {
      res.status(400).json({ error: 'Cannot demote yourself' })
      return
    }

    if (membership.role === 'ADMIN' && parsed.data.role !== 'ADMIN') {
      const adminCount = await prisma.membership.count({
        where: {
          organizationId: req.auth!.organizationId,
          role: 'ADMIN',
        },
      })
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Cannot demote the last admin' })
        return
      }
    }

    const updated = await prisma.membership.update({
      where: { id: membership.id },
      data: { role: parsed.data.role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    res.json({
      id: updated.id,
      role: updated.role,
      user: updated.user,
    })
  },
)

router.delete(
  '/:membershipId',
  requireRole('ADMIN'),
  async (req, res) => {
    const membershipId = String(req.params.membershipId)
    const membership = await prisma.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: req.auth!.organizationId,
      },
    })

    if (!membership) {
      res.status(404).json({ error: 'Team member not found' })
      return
    }

    if (membership.userId === req.auth!.userId) {
      res.status(400).json({ error: 'Cannot remove yourself from the team' })
      return
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await prisma.membership.count({
        where: {
          organizationId: req.auth!.organizationId,
          role: 'ADMIN',
        },
      })
      if (adminCount <= 1) {
        res.status(400).json({ error: 'Cannot remove the last admin' })
        return
      }
    }

    await prisma.membership.delete({ where: { id: membership.id } })
    res.json({ deleted: true })
  },
)

export default router
