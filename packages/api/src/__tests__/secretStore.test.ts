import { afterEach, describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret } from '../lib/secretStore.js'

describe('secretStore', () => {
  afterEach(() => {
    delete process.env.SECRETS_ENCRYPTION_KEY
    delete process.env.NODE_ENV
  })

  it('stores plaintext in non-production when encryption key is unset', () => {
    process.env.NODE_ENV = 'development'
    expect(encryptSecret('my-secret')).toBe('my-secret')
    expect(decryptSecret('my-secret')).toBe('my-secret')
  })

  it('round-trips encrypted secrets when key is set', () => {
    process.env.SECRETS_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const encrypted = encryptSecret('workspace-google-secret')
    expect(encrypted.startsWith('enc:v1:')).toBe(true)
    expect(decryptSecret(encrypted)).toBe('workspace-google-secret')
  })
})
