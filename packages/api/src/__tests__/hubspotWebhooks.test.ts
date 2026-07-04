import crypto from 'crypto'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import type { Request } from 'express'
import {
  getHubSpotWebhookUrl,
  verifyHubSpotWebhookV3,
} from '../lib/hubspotWebhooks.js'

function signV3(
  secret: string,
  method: string,
  uri: string,
  body: string,
  timestamp: string,
): string {
  const rawString = `${method}${uri}${body}${timestamp}`
  return crypto.createHmac('sha256', secret).update(rawString).digest('base64')
}

function mockReq(
  headers: Record<string, string>,
  method = 'POST',
): Request {
  return { method, headers } as Request
}

describe('hubspotWebhooks', () => {
  const secret = 'test-hubspot-secret'
  const uri = 'https://api.example.com/api/integrations/hubspot/webhook'
  const body = '[{"subscriptionType":"contact.creation"}]'

  beforeEach(() => {
    process.env.HUBSPOT_CLIENT_SECRET = secret
  })

  afterEach(() => {
    delete process.env.HUBSPOT_CLIENT_SECRET
  })

  it('builds webhook URL from API_PUBLIC_URL', () => {
    const prev = process.env.API_PUBLIC_URL
    process.env.API_PUBLIC_URL = 'https://api.example.com'
    expect(getHubSpotWebhookUrl()).toBe(
      'https://api.example.com/api/integrations/hubspot/webhook',
    )
    process.env.API_PUBLIC_URL = prev
  })

  it('accepts a valid v3 signature', () => {
    const timestamp = String(Date.now())
    const signature = signV3(secret, 'POST', uri, body, timestamp)

    expect(
      verifyHubSpotWebhookV3(
        mockReq({
          'x-hubspot-signature-v3': signature,
          'x-hubspot-request-timestamp': timestamp,
        }),
        body,
        uri,
      ),
    ).toBe(true)
  })

  it('rejects stale timestamps', () => {
    const timestamp = String(Date.now() - 6 * 60 * 1000)
    const signature = signV3(secret, 'POST', uri, body, timestamp)

    expect(
      verifyHubSpotWebhookV3(
        mockReq({
          'x-hubspot-signature-v3': signature,
          'x-hubspot-request-timestamp': timestamp,
        }),
        body,
        uri,
      ),
    ).toBe(false)
  })

  it('rejects future timestamps outside the window', () => {
    const timestamp = String(Date.now() + 6 * 60 * 1000)
    const signature = signV3(secret, 'POST', uri, body, timestamp)

    expect(
      verifyHubSpotWebhookV3(
        mockReq({
          'x-hubspot-signature-v3': signature,
          'x-hubspot-request-timestamp': timestamp,
        }),
        body,
        uri,
      ),
    ).toBe(false)
  })

  it('rejects invalid signatures', () => {
    const timestamp = String(Date.now())

    expect(
      verifyHubSpotWebhookV3(
        mockReq({
          'x-hubspot-signature-v3': 'bad-signature',
          'x-hubspot-request-timestamp': timestamp,
        }),
        body,
        uri,
      ),
    ).toBe(false)
  })
})
