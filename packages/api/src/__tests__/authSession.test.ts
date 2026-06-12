import { describe, expect, it } from 'vitest'
import {
  computeSessionExpiresAt,
  generateRefreshToken,
  hashToken,
  parseUserAgent,
} from '../lib/authSession.js'

describe('authSession helpers', () => {
  it('hashToken is sha256 hex', () => {
    const hash = hashToken('test-refresh-token')
    expect(hash).toHaveLength(64)
    expect(hashToken('test-refresh-token')).toBe(hash)
  })

  it('generateRefreshToken returns unique values', () => {
    const a = generateRefreshToken()
    const b = generateRefreshToken()
    expect(a).not.toBe(b)
    expect(a).toHaveLength(64)
  })

  it('parseUserAgent extracts browser and OS', () => {
    const ua =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    expect(parseUserAgent(ua)).toBe('Chrome on Windows')
  })

  it('parseUserAgent handles missing user agent', () => {
    expect(parseUserAgent(null)).toBe('Unknown device')
  })

  it('computeSessionExpiresAt caps sliding window by absolute TTL', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z')
    const nearAbsolute = new Date('2026-03-25T00:00:00Z')
    const expiresAt = computeSessionExpiresAt(createdAt, nearAbsolute)
    const absoluteCap = new Date('2026-04-01T00:00:00Z')
    expect(expiresAt.getTime()).toBe(absoluteCap.getTime())
  })

  it('computeSessionExpiresAt uses sliding window when below absolute cap', () => {
    const createdAt = new Date('2026-06-01T00:00:00Z')
    const now = new Date('2026-06-10T00:00:00Z')
    const expiresAt = computeSessionExpiresAt(createdAt, now)
    const sliding = new Date('2026-07-10T00:00:00Z')
    expect(expiresAt.getTime()).toBe(sliding.getTime())
  })
})
