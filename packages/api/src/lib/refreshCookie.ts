import type { CookieOptions } from 'express'
import type { Request, Response } from 'express'

export const REFRESH_COOKIE_NAME = 'crm_refresh'

const isProduction = process.env.NODE_ENV === 'production'
const sameSite =
  (process.env.REFRESH_COOKIE_SAME_SITE as 'lax' | 'strict' | 'none' | undefined) ??
  (isProduction ? 'none' : 'lax')

function cookieOptions(expires?: Date): CookieOptions {
  const secure = isProduction || sameSite === 'none'
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/auth',
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    ...(expires ? { expires } : {}),
  }
}

export function setRefreshCookie(
  res: Response,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(REFRESH_COOKIE_NAME, token, cookieOptions(expiresAt))
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions())
}

export function readRefreshToken(req: Request): string | undefined {
  const cookie = req.cookies?.[REFRESH_COOKIE_NAME]
  if (typeof cookie === 'string' && cookie.length > 0) return cookie

  const body = req.body?.refreshToken
  if (typeof body === 'string' && body.length > 0) return body

  return undefined
}
