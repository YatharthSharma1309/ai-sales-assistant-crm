import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import {
  createSession,
  rotateRefreshToken,
  revokeSession,
  revokeSessionByRefreshToken,
  revokeAllSessions,
  sessionAuthResponse,
  hashToken,
} from '../lib/authSession.js'
import { hashInviteToken } from '../lib/inviteToken.js'
import {
  generateEmailChangeToken,
  emailChangeExpiresAt,
  buildEmailChangeVerifyUrl,
  sendEmailChangeVerification,
  sendEmailChangeNotification,
} from '../lib/emailChange.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationId: z.string().optional(),
})

const switchOrgSchema = z.object({
  organizationId: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).optional(),
  name: z.string().min(1).optional(),
})

const emailChangeSchema = z.object({
  newEmail: z.string().email(),
  password: z.string().min(1),
})

const verifyEmailChangeSchema = z.object({
  token: z.string().min(1),
})

async function listUserOrganizations(userId: string) {
  const memberships = await prisma.membership.findMany({
    where: { userId },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    role: m.role,
  }))
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace'
  )
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { name, email, password, organizationName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  let slug = slugify(organizationName)
  const slugTaken = await prisma.organization.findUnique({ where: { slug } })
  if (slugTaken) slug = `${slug}-${Date.now()}`

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    })
    const organization = await tx.organization.create({
      data: { name: organizationName, slug },
    })
    await tx.membership.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: 'ADMIN',
      },
    })
    return { user, organization }
  })

  const tokens = await createSession(req, {
    userId: result.user.id,
    organizationId: result.organization.id,
    role: 'ADMIN',
  })

  res.status(201).json(
    sessionAuthResponse(tokens, {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      organization: result.organization,
      role: 'ADMIN',
    }),
  )
})

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { email, password, organizationId } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: { organization: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' })
    return
  }

  if (!user.memberships.length) {
    res.status(403).json({ error: 'No workspace membership' })
    return
  }

  if (!organizationId && user.memberships.length > 1) {
    res.json({
      requiresOrgSelection: true,
      user: { id: user.id, name: user.name, email: user.email },
      organizations: user.memberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    })
    return
  }

  const membership =
    (organizationId
      ? user.memberships.find((m) => m.organizationId === organizationId)
      : user.memberships[0]) ?? null

  if (!membership) {
    res.status(403).json({ error: 'Not a member of this workspace' })
    return
  }

  const tokens = await createSession(req, {
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  })

  const organizations = await listUserOrganizations(user.id)

  res.json(
    sessionAuthResponse(tokens, {
      user: { id: user.id, name: user.name, email: user.email },
      organization: membership.organization,
      role: membership.role,
      organizations,
    }),
  )
})

router.post('/refresh', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const tokens = await rotateRefreshToken(parsed.data.refreshToken)
  if (!tokens) {
    res.status(401).json({ error: 'Invalid or expired refresh token' })
    return
  }

  res.json(tokens)
})

router.post('/logout', async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  await revokeSessionByRefreshToken(parsed.data.refreshToken)
  res.json({ ok: true })
})

router.post('/logout-all', protectedMiddleware, async (req, res) => {
  await revokeAllSessions(req.auth!.userId, req.auth!.sid)
  res.json({ ok: true })
})

router.get('/me', protectedMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.auth!.userId },
    select: { id: true, name: true, email: true, pendingEmail: true },
  })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const organization = await prisma.organization.findUnique({
    where: { id: req.auth!.organizationId },
  })

  const organizations = await listUserOrganizations(req.auth!.userId)

  res.json({
    user,
    organization,
    role: req.auth!.role,
    organizations,
  })
})

router.patch('/me', protectedMiddleware, async (req, res) => {
  const schema = z.object({ name: z.string().min(1) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const user = await prisma.user.update({
    where: { id: req.auth!.userId },
    data: { name: parsed.data.name },
    select: { id: true, name: true, email: true },
  })

  res.json({ user })
})

router.patch('/me/email', protectedMiddleware, async (req, res) => {
  const parsed = emailChangeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { newEmail, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: 'Invalid password' })
    return
  }

  if (newEmail === user.email) {
    res.status(400).json({ error: 'New email must differ from current email' })
    return
  }

  const taken = await prisma.user.findUnique({ where: { email: newEmail } })
  if (taken) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  const { raw, hash } = generateEmailChangeToken()
  const expiresAt = emailChangeExpiresAt()
  const verifyUrl = buildEmailChangeVerifyUrl(raw)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmail: newEmail,
      emailChangeTokenHash: hash,
      emailChangeExpiresAt: expiresAt,
    },
  })

  await sendEmailChangeVerification(newEmail, verifyUrl)
  await sendEmailChangeNotification(user.email, newEmail)

  const devVerifyUrl =
    process.env.NODE_ENV !== 'production' ? verifyUrl : undefined

  res.json({
    ok: true,
    message: 'Verification email sent to your new address',
    verifyUrl: devVerifyUrl,
  })
})

router.delete('/me/email', protectedMiddleware, async (req, res) => {
  await prisma.user.update({
    where: { id: req.auth!.userId },
    data: {
      pendingEmail: null,
      emailChangeTokenHash: null,
      emailChangeExpiresAt: null,
    },
  })
  res.json({ ok: true })
})

router.post('/verify-email-change', async (req, res) => {
  const parsed = verifyEmailChangeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const tokenHash = hashToken(parsed.data.token)
  const user = await prisma.user.findFirst({
    where: {
      emailChangeTokenHash: tokenHash,
      emailChangeExpiresAt: { gt: new Date() },
      pendingEmail: { not: null },
    },
  })

  if (!user || !user.pendingEmail) {
    res.status(400).json({ error: 'Invalid or expired verification link' })
    return
  }

  const newEmail = user.pendingEmail

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        email: newEmail,
        pendingEmail: null,
        emailChangeTokenHash: null,
        emailChangeExpiresAt: null,
      },
    })
  })

  await revokeAllSessions(user.id)

  res.json({ ok: true, email: newEmail })
})

router.post('/change-password', protectedMiddleware, async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const user = await prisma.user.findUnique({ where: { id: req.auth!.userId } })
  if (!user || !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    res.status(401).json({ error: 'Current password is incorrect' })
    return
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  })

  await revokeAllSessions(user.id, req.auth!.sid)

  res.json({ ok: true })
})

router.post('/switch-org', protectedMiddleware, async (req, res) => {
  const parsed = switchOrgSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const membership = await prisma.membership.findFirst({
    where: {
      userId: req.auth!.userId,
      organizationId: parsed.data.organizationId,
    },
    include: { organization: true },
  })

  if (!membership) {
    res.status(403).json({ error: 'Not a member of this workspace' })
    return
  }

  if (req.auth!.sid) {
    await revokeSession(req.auth!.sid)
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.auth!.userId },
  })

  const tokens = await createSession(req, {
    userId: user.id,
    organizationId: membership.organizationId,
    role: membership.role,
  })

  const organizations = await listUserOrganizations(user.id)

  res.json(
    sessionAuthResponse(tokens, {
      user: { id: user.id, name: user.name, email: user.email },
      organization: membership.organization,
      role: membership.role,
      organizations,
    }),
  )
})

router.get('/invite/:token', async (req, res) => {
  const tokenHash = hashInviteToken(String(req.params.token))
  const invite = await prisma.teamInvite.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      organization: { select: { id: true, name: true, slug: true } },
      invitedBy: { select: { name: true } },
    },
  })

  if (!invite) {
    res.status(404).json({ error: 'Invite not found or expired' })
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  })

  res.json({
    organization: invite.organization,
    role: invite.role,
    email: invite.email,
    name: invite.name,
    inviterName: invite.invitedBy.name,
    isExistingUser: Boolean(existingUser),
    expiresAt: invite.expiresAt,
  })
})

router.post('/accept-invite', async (req, res) => {
  const parsed = acceptInviteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const tokenHash = hashInviteToken(parsed.data.token)
  const invite = await prisma.teamInvite.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { organization: true },
  })

  if (!invite) {
    res.status(400).json({ error: 'Invite not found or expired' })
    return
  }

  const existingMember = await prisma.membership.findFirst({
    where: {
      organizationId: invite.organizationId,
      user: { email: invite.email },
    },
  })

  if (existingMember) {
    res.status(409).json({ error: 'Already a member of this workspace' })
    return
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: invite.email },
  })

  if (!existingUser) {
    if (!parsed.data.password) {
      res.status(400).json({ error: 'Password required for new accounts' })
      return
    }
    if (!parsed.data.name && !invite.name) {
      res.status(400).json({ error: 'Name required for new accounts' })
      return
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const user =
      existingUser ??
      (await tx.user.create({
        data: {
          name: parsed.data.name ?? invite.name ?? invite.email.split('@')[0],
          email: invite.email,
          passwordHash: await bcrypt.hash(parsed.data.password!, 10),
        },
      }))

    await tx.membership.create({
      data: {
        organizationId: invite.organizationId,
        userId: user.id,
        role: invite.role,
      },
    })

    await tx.teamInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    })

    return user
  })

  const tokens = await createSession(req, {
    userId: result.id,
    organizationId: invite.organizationId,
    role: invite.role,
  })

  const organizations = await listUserOrganizations(result.id)

  res.json(
    sessionAuthResponse(tokens, {
      user: { id: result.id, name: result.name, email: result.email },
      organization: invite.organization,
      role: invite.role,
      organizations,
    }),
  )
})

export default router
