import { afterEach, describe, expect, it } from 'vitest'
import {
  getOpenRouterModel,
  isOpenRouterConfigured,
} from '../lib/openRouter.js'

describe('openRouter', () => {
  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_MODEL
  })

  it('isOpenRouterConfigured is false when key is missing', () => {
    delete process.env.OPENROUTER_API_KEY
    expect(isOpenRouterConfigured()).toBe(false)
  })

  it('isOpenRouterConfigured is true when key is set', () => {
    process.env.OPENROUTER_API_KEY = 'sk-or-test'
    expect(isOpenRouterConfigured()).toBe(true)
  })

  it('getOpenRouterModel defaults to meta-llama/llama-3.3-70b-instruct:free', () => {
    expect(getOpenRouterModel()).toBe('meta-llama/llama-3.3-70b-instruct:free')
  })

  it('getOpenRouterModel uses OPENROUTER_MODEL when set', () => {
    process.env.OPENROUTER_MODEL = 'google/gemini-2.0-flash-001'
    expect(getOpenRouterModel()).toBe('google/gemini-2.0-flash-001')
  })
})
