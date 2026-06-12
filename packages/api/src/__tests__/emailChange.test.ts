import { describe, expect, it } from 'vitest'
import {
  buildEmailChangeVerifyUrl,
  emailChangeExpiresAt,
  generateEmailChangeToken,
} from '../lib/emailChange.js'
import { hashToken } from '../lib/authSession.js'

describe('emailChange', () => {
  it('generateEmailChangeToken hashes with authSession hashToken', () => {
    const { raw, hash } = generateEmailChangeToken()
    expect(hashToken(raw)).toBe(hash)
  })

  it('buildEmailChangeVerifyUrl includes token', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173'
    const url = buildEmailChangeVerifyUrl('change-token')
    expect(url).toContain('verify-email-change')
    expect(url).toContain('change-token')
  })

  it('emailChangeExpiresAt is in the future', () => {
    expect(emailChangeExpiresAt().getTime()).toBeGreaterThan(Date.now())
  })
})
