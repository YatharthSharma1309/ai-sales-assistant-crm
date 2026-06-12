export const OPEN_STAGES = [
  'DISCOVERY',
  'DEMO_SCHEDULED',
  'TRIAL',
  'PROPOSAL',
  'NEGOTIATION',
] as const

export type OpenStage = (typeof OPEN_STAGES)[number]

export const CLOSED_STAGES = ['CLOSED_WON', 'CLOSED_LOST'] as const

export type ClosedStage = (typeof CLOSED_STAGES)[number]

export type DealStage = OpenStage | ClosedStage

export function isOpenStage(stage: string): boolean {
  return (OPEN_STAGES as readonly string[]).includes(stage)
}
