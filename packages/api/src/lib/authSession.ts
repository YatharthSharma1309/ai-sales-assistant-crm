import crypto from 'crypto'
import type { Request, Response } from 'express'
import { prisma } from './prisma.js'
import { signAccessToken, type AuthPayload } from './auth.js'
import { setRefreshCookie, clearRefreshCookie } from './refreshCookie.js'

const SLIDING_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30)
const ABSOLUTE_TTL_DAYS = Number(
  process.env.REFRESH_TOKEN_ABSOLUTE_TTL_DAYS ?? 90,
)
const DAY_MS = 24 * 60 * 60 * 1000

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function computeSessionExpiresAt(
  createdAt: Date,
  now = new Date(),
): Date {
  const sliding = new Date(now.getTime() + SLIDING_TTL_DAYS * DAY_MS)
  const absolute = new Date(createdAt.getTime() + ABSOLUTE_TTL_DAYS * DAY_MS)
  return sliding < absolute ? sliding : absolute
}

function isSessionActive(session: {
  revokedAt: Date | null
  expiresAt: Date
  absoluteExpiresAt: Date
}): boolean {
  const now = new Date()
  return (
    !session.revokedAt &&
    session.expiresAt > now &&
    session.absoluteExpiresAt > now
  )
}

/** Returns false if session was revoked or expired (used for access JWT sid checks). */
export async function isAccessSessionValid(sessionId: string): Promise<boolean> {
  const session = await prisma.authSession.findUnique({
    where: { id: sessionId },
    select: { revokedAt: true, expiresAt: true, absoluteExpiresAt: true },
  })
  if (!session) return false
  return isSessionActive(session)
}

export type SessionTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  expiresAt: Date
}

export type RotateResult =
  | { ok: true; tokens: SessionTokens }
  | { ok: false; reason: 'invalid' | 'reuse' }

export async function createSession(
  req: Request,
  payload: Omit<AuthPayload, 'sid'>,
): Promise<SessionTokens> {
  const refreshToken = generateRefreshToken()
  const now = new Date()
  const expiresAt = computeSessionExpiresAt(now, now)
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_TTL_DAYS * DAY_MS)
  const session = await prisma.authSession.create({
    data: {
      userId: payload.userId,
      familyId: 'pending',
      tokenHash: hashToken(refreshToken),
      organizationId: payload.organizationId,
      role: payload.role,
      userAgent: req.headers['user-agent']?.slice(0, 500) ?? null,
      ipAddress: req.ip ?? null,
      expiresAt,
      absoluteExpiresAt,
    },
  })

  await prisma.authSession.update({
    where: { id: session.id },
    data: { familyId: session.id },
  })

  const accessToken = signAccessToken({
    ...payload,
    sid: session.id,
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
    expiresAt,
  }
}

export async function rotateRefreshToken(
  rawRefreshToken: string,
): Promise<RotateResult> {
  const tokenHash = hashToken(rawRefreshToken)
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
  })

  if (!session) {
    return { ok: false, reason: 'invalid' }
  }

  if (session.revokedAt) {
    await revokeSessionFamily(session.familyId)
    return { ok: false, reason: 'reuse' }
  }

  if (!isSessionActive(session)) {
    return { ok: false, reason: 'invalid' }
  }

  if (!session.organizationId || !session.role) {
    return { ok: false, reason: 'invalid' }
  }

  const newRefreshToken = generateRefreshToken()
  const expiresAt = computeSessionExpiresAt(session.createdAt)

  const newSession = await prisma.$transaction(async (tx) => {
    await tx.authSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    })

    return tx.authSession.create({
      data: {
        userId: session.userId,
        tokenHash: hashToken(newRefreshToken),
        organizationId: session.organizationId,
        role: session.role,
        familyId: session.familyId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt,
        absoluteExpiresAt: session.absoluteExpiresAt,
        lastUsedAt: new Date(),
      },
    })
  })

  const accessToken = signAccessToken({
    userId: session.userId,
    organizationId: session.organizationId,
    role: session.role,
    sid: newSession.id,
  })

  return {
    ok: true,
    tokens: {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60,
      expiresAt,
    },
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeSessionByRefreshToken(
  rawRefreshToken: string,
): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken)
  await prisma.authSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeSessionFamily(familyId: string): Promise<void> {
  await prisma.authSession.updateMany({
    where: { familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function revokeAllSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<void> {
  await prisma.authSession.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  })
}

export async function listActiveSessions(userId: string) {
  const now = new Date()
  return prisma.authSession.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
      absoluteExpiresAt: { gt: now },
    },
    orderBy: { lastUsedAt: 'desc' },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      organizationId: true,
      role: true,
      lastUsedAt: true,
      createdAt: true,
      expiresAt: true,
    },
  })
}

export function parseUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device'

  let browser = 'Browser'
  if (ua.includes('Edg/')) browser = 'Edge'
  else if (ua.includes('Chrome/')) browser = 'Chrome'
  else if (ua.includes('Firefox/')) browser = 'Firefox'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari'

  let os = 'Unknown OS'
  if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS')) os = 'macOS'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Linux')) os = 'Linux'

  return `${browser} on ${os}`
}

export function sessionAuthResponse(
  res: Response,
  tokens: SessionTokens,
  body: Record<string, unknown>,
) {
  setRefreshCookie(res, tokens.refreshToken, tokens.expiresAt)
  return {
    ...body,
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
    token: tokens.accessToken,
  }
}

export function refreshAuthResponse(res: Response, tokens: SessionTokens) {
  setRefreshCookie(res, tokens.refreshToken, tokens.expiresAt)
  return {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
    token: tokens.accessToken,
  }
}

export function clearSessionCookie(res: Response) {
  clearRefreshCookie(res)
}
