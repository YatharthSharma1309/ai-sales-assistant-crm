import { describe, expect, it } from 'vitest'
import { computeLeadScore } from '../lib/leadScoring.js'

describe('leadScoring', () => {
  it('scores qualified leads with email higher', () => {
    const { score, factors } = computeLeadScore({
      status: 'QUALIFIED',
      source: 'referral',
      hasContactEmail: true,
      jobTitle: 'VP Sales',
      recentActivityCount: 3,
    })

    expect(score).toBeGreaterThan(50)
    expect(factors.length).toBeGreaterThan(2)
  })

  it('clamps score between 0 and 100', () => {
    const low = computeLeadScore({
      status: 'UNQUALIFIED',
      hasContactEmail: false,
      recentActivityCount: 0,
    })
    expect(low.score).toBeGreaterThanOrEqual(0)

    const high = computeLeadScore({
      status: 'QUALIFIED',
      source: 'inbound referral',
      hasContactEmail: true,
      jobTitle: 'CEO',
      recentActivityCount: 10,
    })
    expect(high.score).toBeLessThanOrEqual(100)
  })
})
