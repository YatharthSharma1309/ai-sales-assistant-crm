import type { DealStage } from '@prisma/client'
import { prisma } from './prisma.js'
import { CLOSED_STAGES, OPEN_STAGES } from './stages.js'

// Re-export stage defaults from shared - use local map for API
const DEFAULT_STAGE_WIN_RATE: Record<string, number> = {
  DISCOVERY: 10,
  DEMO_SCHEDULED: 25,
  TRIAL: 40,
  PROPOSAL: 60,
  NEGOTIATION: 75,
  CLOSED_WON: 100,
  CLOSED_LOST: 0,
}

export async function buildPipelineForecast(
  organizationId: string,
  options?: { assignedToId?: string },
) {
  const repFilter = options?.assignedToId
    ? { assignedToId: options.assignedToId }
    : {}

  const [openDeals, closedByStage] = await Promise.all([
    prisma.deal.findMany({
      where: {
        organizationId,
        stage: { in: [...OPEN_STAGES] },
        ...repFilter,
      },
      select: { stage: true, arr: true, probability: true, updatedAt: true },
    }),
    prisma.deal.groupBy({
      by: ['stage'],
      where: {
        organizationId,
        stage: { in: [...CLOSED_STAGES] },
        ...repFilter,
      },
      _count: { stage: true },
    }),
  ])

  const closedWon = closedByStage.find((r) => r.stage === 'CLOSED_WON')?._count.stage ?? 0
  const closedLost = closedByStage.find((r) => r.stage === 'CLOSED_LOST')?._count.stage ?? 0
  const winRate = closedWon + closedLost > 0 ? closedWon / (closedWon + closedLost) : 0.2

  const stageWinRates = new Map<DealStage, number>()
  for (const stage of OPEN_STAGES) {
    const historical = await prisma.deal.count({
      where: { organizationId, stage, ...repFilter },
    })
    stageWinRates.set(
      stage,
      historical > 0
        ? Math.round((DEFAULT_STAGE_WIN_RATE[stage] ?? 20) * (0.5 + winRate))
        : DEFAULT_STAGE_WIN_RATE[stage] ?? 20,
    )
  }

  const stageForecast = OPEN_STAGES.map((stage) => {
    const deals = openDeals.filter((d) => d.stage === stage)
    const totalArr = deals.reduce((s, d) => s + (d.arr ?? 0), 0)
    const avgProbability =
      deals.length > 0
        ? deals.reduce((s, d) => s + d.probability, 0) / deals.length
        : stageWinRates.get(stage) ?? 20
    const suggestedProbability = stageWinRates.get(stage) ?? avgProbability
    return {
      stage,
      count: deals.length,
      totalArr,
      avgProbability: Math.round(avgProbability),
      suggestedProbability,
      expectedValue: Math.round((totalArr * suggestedProbability) / 100),
    }
  })

  const weightedPipeline = openDeals.reduce(
    (sum, d) => sum + ((d.arr ?? 0) * d.probability) / 100,
    0,
  )
  const forecastPipeline = stageForecast.reduce((s, row) => s + row.expectedValue, 0)

  const staleThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
  const staleWhere = {
    organizationId,
    stage: { in: [...OPEN_STAGES] },
    updatedAt: { lt: staleThreshold },
    ...repFilter,
  }
  const [staleDealCount, staleDeals] = await Promise.all([
    prisma.deal.count({ where: staleWhere }),
    prisma.deal.findMany({
      where: staleWhere,
      select: { id: true, title: true, updatedAt: true, stage: true },
      orderBy: { updatedAt: 'asc' },
      take: 10,
    }),
  ])

  const bottleneck = [...stageForecast].sort((a, b) => b.count - a.count)[0]

  let healthScore = 100
  if (staleDealCount > 0) healthScore -= Math.min(30, staleDealCount * 3)
  if (openDeals.length === 0) healthScore = 50
  const healthLabel =
    healthScore >= 75 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs attention'

  return {
    weightedPipeline,
    forecastPipeline,
    winRate: Math.round(winRate * 100),
    stageForecast,
    pipelineHealth: {
      score: healthScore,
      label: healthLabel,
      staleDealCount,
      staleDeals,
      bottleneckStage: bottleneck?.count > 2 ? bottleneck.stage : null,
      dealsAtRisk: staleDealCount,
    },
  }
}

export function suggestedProbabilityForStage(stage: DealStage): number {
  return DEFAULT_STAGE_WIN_RATE[stage] ?? 20
}
