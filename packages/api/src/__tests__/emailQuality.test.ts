import { describe, expect, it } from 'vitest'
import { scoreEmailDraft } from '../lib/emailQuality.js'

describe('scoreEmailDraft', () => {
  it('scores personalized emails higher', () => {
    const generic = scoreEmailDraft({
      subject: 'Hi',
      body: 'Hello there.',
    })
    const personalized = scoreEmailDraft({
      subject: 'Quick follow-up on your demo request',
      body: 'Hi Alex, thanks for speaking with us at Acme Corp yesterday. Would you like to schedule a short demo next week? Let me know what time works best.',
      contactName: 'Alex',
      companyName: 'Acme Corp',
    })

    expect(personalized.score).toBeGreaterThan(generic.score)
    expect(personalized.factors.length).toBeGreaterThan(0)
  })
})
