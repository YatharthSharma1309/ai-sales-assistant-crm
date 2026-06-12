import { describe, expect, it } from 'vitest'
import { isOpenStage, OPEN_STAGES } from './pipeline'

describe('pipeline constants', () => {
  it('re-exports shared open stages', () => {
    expect(OPEN_STAGES).toHaveLength(5)
    expect(isOpenStage('PROPOSAL')).toBe(true)
    expect(isOpenStage('CLOSED_LOST')).toBe(false)
  })
})
