import crypto from 'crypto'
import type { Request } from 'express'
import { prisma } from './prisma.js'
import { signAccessToken, type AuthPayload } from './auth.js'

const REFRESH_TOKEN_TTL_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30)

export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function refreshExpiresAt(): Date {
  const days = REFRESH_TOKEN_TTL_DAYS
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

export type SessionTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function createSession(
  req: Request,
  payload: Omit<AuthPayload, 'sid'>,
): Promise<SessionTokens> {
  const refreshToken = generateRefreshToken()
  const session = await prisma.authSession.create({
    data: {
      userId: payload.userId,
      tokenHash: hashToken(refreshToken),
      organizationId: payload.organizationId,
      role: payload.role,
      userAgent: req.headers['user-agent']?.slice(0, 500) ?? null,
      ipAddress: req.ip ?? null,
      expiresAt: refreshExpiresAt(),
    },
  })

  const accessToken = signAccessToken({
    ...payload,
    sid: session.id,
  })

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
  }
}

export async function rotateRefreshToken(
  rawRefreshToken: string,
): Promise<SessionTokens | null> {
  const tokenHash = hashToken(rawRefreshToken)
  const session = await prisma.authSession.findUnique({
    where: { tokenHash },
  })

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt < new Date() ||
    !session.organizationId ||
    !session.role
  ) {
    return null
  }

  const newRefreshToken = generateRefreshToken()
  const newHash = hashToken(newRefreshToken)

  await prisma.authSession.update({
    where: { id: session.id },
    data: {
      tokenHash: newHash,
      lastUsedAt: new Date(),
      expiresAt: refreshExpiresAt(),
    },
  })

  const accessToken = signAccessToken({
    userId: session.userId,
    organizationId: session.organizationId,
    role: session.role,
    sid: session.id,
  })

  return {
    accessToken,
    refreshToken: newRefreshToken,
    expiresIn: 15 * 60,
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

export function sessionAuthResponse(
  tokens: SessionTokens,
  body: Record<string, unknown>,
) {
  return {
    ...body,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    token: tokens.accessToken,
  }
}
