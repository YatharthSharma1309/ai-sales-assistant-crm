import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('rateLimit configuration', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('uses a high dev ceiling on the global limiter', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.RATE_LIMIT_DISABLED
    const { GLOBAL_RATE_LIMIT_MAX } = await import('../middleware/rateLimit.js')
    expect(GLOBAL_RATE_LIMIT_MAX).toBe(5000)
  })

  it('keeps production global limit at 100 requests per window', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.RATE_LIMIT_DISABLED
    const { GLOBAL_RATE_LIMIT_MAX } = await import('../middleware/rateLimit.js')
    expect(GLOBAL_RATE_LIMIT_MAX).toBe(100)
  })

  it('disables rate limits when RATE_LIMIT_DISABLED=1', async () => {
    process.env.NODE_ENV = 'production'
    process.env.RATE_LIMIT_DISABLED = '1'
    const { isRateLimitDisabled } = await import('../middleware/rateLimit.js')
    expect(isRateLimitDisabled()).toBe(true)
  })
})
