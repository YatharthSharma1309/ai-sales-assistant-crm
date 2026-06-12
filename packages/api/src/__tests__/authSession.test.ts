import { describe, expect, it } from 'vitest'
import {
  generateRefreshToken,
  hashToken,
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
})
