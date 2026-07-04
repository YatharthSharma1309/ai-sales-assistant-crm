import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

const skipInTest =
  process.env.NODE_ENV === 'test' ||
  process.env.VITEST === 'true' ||
  process.env.RATE_LIMIT_DISABLED === '1'

function ipKey(req: Request) {
  return req.ip ?? 'unknown'
}

function userKey(req: Request) {
  return req.auth?.userId ?? ipKey(req)
}

function orgKey(req: Request) {
  return req.auth?.organizationId ?? ipKey(req)
}

function limiter(
  windowMs: number,
  max: number,
  keyGenerator: (req: Request) => string,
) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => skipInTest,
    message: { error: 'Too many requests. Try again later.' },
  })
}

export const registerLimiter = limiter(60 * 60 * 1000, 5, ipKey)

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: ipKey,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipInTest,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Try again later.' },
})

export const refreshLimiter = limiter(15 * 60 * 1000, 60, ipKey)
export const logoutLimiter = limiter(15 * 60 * 1000, 30, ipKey)
export const inviteLookupLimiter = limiter(15 * 60 * 1000, 30, ipKey)
export const acceptInviteLimiter = limiter(60 * 60 * 1000, 10, ipKey)
export const verifyEmailChangeLimiter = limiter(60 * 60 * 1000, 10, ipKey)
export const emailChangeLimiter = limiter(60 * 60 * 1000, 3, userKey)
export const changePasswordLimiter = limiter(15 * 60 * 1000, 5, userKey)
export const logoutAllLimiter = limiter(60 * 60 * 1000, 10, userKey)
export const teamInviteLimiter = limiter(60 * 60 * 1000, 20, orgKey)
export const teamResendLimiter = limiter(60 * 60 * 1000, 5, userKey)

/** LLM-backed endpoints — per user to limit cost abuse. */
export const aiLimiter = limiter(60 * 60 * 1000, 30, userKey)

/** Broad API abuse protection — auth routes have their own stricter limits. */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: ipKey,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => skipInTest || req.path === '/api/health',
  message: { error: 'Too many requests. Try again later.' },
})
