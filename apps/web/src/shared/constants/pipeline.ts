import {
  CLOSED_STAGES,
  isOpenStage,
  OPEN_STAGES,
} from '@crm/shared/stages'
import type { DealStage } from '../types'

export { CLOSED_STAGES, isOpenStage, OPEN_STAGES }

export const DEAL_STAGES: { id: DealStage; label: string }[] = [
  { id: 'DISCOVERY', label: 'Discovery' },
  { id: 'DEMO_SCHEDULED', label: 'Demo Scheduled' },
  { id: 'TRIAL', label: 'Trial / POC' },
  { id: 'PROPOSAL', label: 'Proposal' },
  { id: 'NEGOTIATION', label: 'Negotiation' },
  { id: 'CLOSED_WON', label: 'Closed Won' },
  { id: 'CLOSED_LOST', label: 'Closed Lost' },
]

export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  UNQUALIFIED: 'Unqualified',
}

export const STAGE_DEFAULT_PROBABILITY: Record<DealStage, number> = {
  DISCOVERY: 10,
  DEMO_SCHEDULED: 25,
  TRIAL: 40,
  PROPOSAL: 60,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
}

export function getStageLabel(stage: DealStage): string {
  return DEAL_STAGES.find((s) => s.id === stage)?.label ?? stage
}
