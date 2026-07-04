import jwt from 'jsonwebtoken'
import type { Request, Response, NextFunction } from 'express'
import { isAccessSessionValid } from './authSession.js'
import { membershipMiddleware } from './membership.js'

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production')
  }
  return 'dev-secret-change-me'
}

export const JWT_SECRET = resolveJwtSecret()

export type AuthPayload = {
  userId: string
  organizationId: string
  role: string
  sid?: string
}

export function signAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

/** @deprecated Use signAccessToken + createSession */
export function signToken(payload: AuthPayload): string {
  return signAccessToken(payload)
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const token = header.slice(7)
    req.auth = verifyToken(token)

    if (req.auth.sid) {
      const valid = await isAccessSessionValid(req.auth.sid)
      if (!valid) {
        res.status(401).json({ error: 'Session expired' })
        return
      }
    }

    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

export function protectedMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  void authMiddleware(req, res, () => {
    void membershipMiddleware(req, res, next)
  })
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}
