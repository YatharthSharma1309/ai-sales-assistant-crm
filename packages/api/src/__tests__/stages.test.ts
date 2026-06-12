import { describe, expect, it } from 'vitest'
import { CLOSED_STAGES, isOpenStage, OPEN_STAGES } from '../lib/stages.js'

describe('stages', () => {
  it('exports open pipeline stages', () => {
    expect(OPEN_STAGES).toContain('DISCOVERY')
    expect(OPEN_STAGES).toHaveLength(5)
  })

  it('identifies open vs closed stages', () => {
    expect(isOpenStage('TRIAL')).toBe(true)
    expect(isOpenStage('CLOSED_WON')).toBe(false)
    expect(CLOSED_STAGES).toEqual(['CLOSED_WON', 'CLOSED_LOST'])
  })
})
