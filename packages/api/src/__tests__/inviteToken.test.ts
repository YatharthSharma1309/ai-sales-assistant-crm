import { describe, expect, it } from 'vitest'
import {
  buildInviteAcceptUrl,
  generateInviteToken,
  hashInviteToken,
  inviteExpiresAt,
} from '../lib/inviteToken.js'

describe('inviteToken', () => {
  it('generateInviteToken returns matching hash', () => {
    const { raw, hash } = generateInviteToken()
    expect(raw).toHaveLength(64)
    expect(hashInviteToken(raw)).toBe(hash)
  })

  it('hashInviteToken is deterministic', () => {
    expect(hashInviteToken('abc')).toBe(hashInviteToken('abc'))
    expect(hashInviteToken('abc')).not.toBe(hashInviteToken('def'))
  })

  it('buildInviteAcceptUrl encodes token', () => {
    process.env.FRONTEND_URL = 'http://localhost:5173'
    const url = buildInviteAcceptUrl('token/with+special')
    expect(url).toContain('invite/accept')
    expect(url).toContain(encodeURIComponent('token/with+special'))
  })

  it('inviteExpiresAt is in the future', () => {
    const expires = inviteExpiresAt()
    expect(expires.getTime()).toBeGreaterThan(Date.now())
  })
})
