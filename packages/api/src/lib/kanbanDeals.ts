import type { DealStage } from '@prisma/client'
import type { Request } from 'express'
import { prisma } from './prisma.js'
import { OPEN_STAGES } from './stages.js'
import { listOwnershipWhere } from './ownership.js'
import { assigneeListInclude } from './ownership.js'

const DEFAULT_PER_STAGE = 15
const MAX_PER_STAGE = 50

export type KanbanStageColumn = {
  stage: DealStage
  deals: Awaited<ReturnType<typeof prisma.deal.findMany>>
  total: number
  page: number
  perStage: number
  hasMore: boolean
}

export type KanbanResponse = {
  stages: KanbanStageColumn[]
  perStage: number
}

export async function buildKanbanDeals(
  req: Request,
  options: {
    assignedTo?: string
    perStage?: number
    stagePages?: Partial<Record<DealStage, number>>
  },
): Promise<KanbanResponse> {
  const perStage = Math.min(
    MAX_PER_STAGE,
    Math.max(1, options.perStage ?? DEFAULT_PER_STAGE),
  )
  const baseWhere = listOwnershipWhere(req, options.assignedTo)

  const stages: KanbanStageColumn[] = []

  for (const stage of OPEN_STAGES) {
    const page = Math.max(1, options.stagePages?.[stage] ?? 1)
    const skip = (page - 1) * perStage
    const where = { ...baseWhere, stage }

    const [total, deals] = await Promise.all([
      prisma.deal.count({ where }),
      prisma.deal.findMany({
        where,
        include: { contact: true, account: true, ...assigneeListInclude },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: perStage,
      }),
    ])

    stages.push({
      stage,
      deals,
      total,
      page,
      perStage,
      hasMore: skip + deals.length < total,
    })
  }

  return { stages, perStage }
}
