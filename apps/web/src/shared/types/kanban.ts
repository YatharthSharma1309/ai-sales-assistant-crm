import type { Deal, DealStage } from '../types'

export type KanbanStageColumn = {
  stage: DealStage
  deals: Deal[]
  total: number
  page: number
  perStage: number
  hasMore: boolean
}

export type KanbanResponse = {
  stages: KanbanStageColumn[]
  perStage: number
}
