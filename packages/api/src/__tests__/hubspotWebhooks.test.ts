import { describe, expect, it } from 'vitest'
import { getHubSpotWebhookUrl } from '../lib/hubspotWebhooks.js'

describe('hubspotWebhooks', () => {
  it('builds webhook URL from API_PUBLIC_URL', () => {
    const prev = process.env.API_PUBLIC_URL
    process.env.API_PUBLIC_URL = 'https://api.example.com'
    expect(getHubSpotWebhookUrl()).toBe(
      'https://api.example.com/api/integrations/hubspot/webhook',
    )
    process.env.API_PUBLIC_URL = prev
  })
})
