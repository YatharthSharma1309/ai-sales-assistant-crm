import { afterEach, describe, expect, it } from 'vitest'
import { assertProductionEnvironment } from '../lib/productionCheck.js'

describe('assertProductionEnvironment', () => {
  afterEach(() => {
    delete process.env.NODE_ENV
    delete process.env.DATABASE_URL
    delete process.env.JWT_SECRET
    delete process.env.FRONTEND_URL
    delete process.env.API_PUBLIC_URL
    delete process.env.TRUST_PROXY
    delete process.env.RATE_LIMIT_DISABLED
    delete process.env.SECRETS_ENCRYPTION_KEY
    delete process.env.INBOUND_EMAIL_WEBHOOK_SECRET
  })

  it('does nothing outside production', () => {
    process.env.NODE_ENV = 'development'
    expect(() => assertProductionEnvironment()).not.toThrow()
  })

  it('throws when required production variables are missing', () => {
    process.env.NODE_ENV = 'production'
    process.env.JWT_SECRET = 'short'
    expect(() => assertProductionEnvironment()).toThrow(
      /Production environment misconfigured/,
    )
  })

  it('passes with a valid production configuration', () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db'
    process.env.JWT_SECRET = 'a'.repeat(32)
    process.env.FRONTEND_URL = 'https://app.example.com'
    process.env.API_PUBLIC_URL = 'https://api.example.com'
    process.env.TRUST_PROXY = '1'
    process.env.SECRETS_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    process.env.INBOUND_EMAIL_WEBHOOK_SECRET = 'webhook-secret'
    expect(() => assertProductionEnvironment()).not.toThrow()
  })
})
