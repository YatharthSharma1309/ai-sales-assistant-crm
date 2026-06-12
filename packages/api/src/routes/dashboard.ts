import { Router } from 'express'
import { prisma } from '../lib/prisma.js'
import { protectedMiddleware } from '../lib/auth.js'
import { isManagerRole, requireRole } from '../lib/rbac.js'
import { CLOSED_STAGES, OPEN_STAGES } from '../lib/stages.js'
import { buildPipelineForecast } from '../lib/pipelineForecast.js'

const router = Router()
router.use(protectedMiddleware)

router.get('/stats', async (req, res) => {
  const orgId = req.auth!.organizationId
  const isManager = isManagerRole(req.auth!.role)
  const repFilter = isManager
    ? {}
    : { assignedToId: req.auth!.userId }

  const openStageFilter = { in: [...OPEN_STAGES] }
  const closedPipelineExclude = { notIn: [...CLOSED_STAGES] }

  const [leadCount, dealCount, dealsByStage, totalArr, openDeals] =
    await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId, ...repFilter } }),
      prisma.deal.count({
        where: {
          organizationId: orgId,
          stage: openStageFilter,
          ...repFilter,
        },
      }),
      prisma.deal.groupBy({
        by: ['stage'],
        where: { organizationId: orgId, ...repFilter },
        _count: { stage: true },
      }),
      prisma.deal.aggregate({
        where: {
          organizationId: orgId,
          stage: closedPipelineExclude,
          ...repFilter,
        },
        _sum: { arr: true },
      }),
      prisma.deal.findMany({
        where: {
          organizationId: orgId,
          stage: openStageFilter,
          ...repFilter,
        },
        select: { arr: true, probability: true },
      }),
    ])

  const weightedPipeline = openDeals.reduce(
    (sum, d) => sum + ((d.arr ?? 0) * d.probability) / 100,
    0,
  )

  res.json({
    leadCount,
    dealCount,
    pipelineValue: totalArr._sum?.arr ?? 0,
    weightedPipeline,
    dealsByStage: dealsByStage.map((row) => ({
      stage: row.stage,
      count: row._count.stage,
    })),
  })
})

router.get('/onboarding', async (req, res) => {
  const orgId = req.auth!.organizationId
  const isManager = isManagerRole(req.auth!.role)
  const repFilter = isManager
    ? {}
    : { assignedToId: req.auth!.userId }

  const [accountCount, contactCount, leadCount, dealCount, activityCount] =
    await Promise.all([
      prisma.account.count({ where: { organizationId: orgId } }),
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.lead.count({ where: { organizationId: orgId, ...repFilter } }),
      prisma.deal.count({ where: { organizationId: orgId, ...repFilter } }),
      prisma.activity.count({
        where: { organizationId: orgId, createdById: req.auth!.userId },
      }),
    ])

  const steps = {
    hasAccount: accountCount > 0,
    hasContact: contactCount > 0,
    hasLead: leadCount > 0,
    hasDeal: dealCount > 0,
    hasActivity: activityCount > 0,
  }

  const completed = Object.values(steps).every(Boolean)

  res.json({ completed, steps })
})

router.get(
  '/manager',
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const orgId = req.auth!.organizationId
    const closedPipelineExclude = { notIn: [...CLOSED_STAGES] }

    const [stats, memberships, recentActivity, deals] = await Promise.all([
      prisma.$transaction([
        prisma.lead.count({ where: { organizationId: orgId } }),
        prisma.deal.count({ where: { organizationId: orgId } }),
        prisma.deal.aggregate({
          where: {
            organizationId: orgId,
            stage: closedPipelineExclude,
          },
          _sum: { arr: true },
        }),
        prisma.deal.count({
          where: { organizationId: orgId, stage: 'CLOSED_WON' },
        }),
        prisma.deal.count({
          where: { organizationId: orgId, stage: 'CLOSED_LOST' },
        }),
      ]),
      prisma.membership.findMany({
        where: { organizationId: orgId },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.activity.findMany({
        where: { organizationId: orgId },
        include: {
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.deal.findMany({
        where: {
          organizationId: orgId,
          stage: { in: [...OPEN_STAGES] },
        },
        select: { arr: true, probability: true },
      }),
    ])

    const [leadCount, dealCount, arrAgg, wonCount, lostCount] = stats
    const weightedPipeline = deals.reduce(
      (sum, d) => sum + ((d.arr ?? 0) * d.probability) / 100,
      0,
    )

    const userIds = memberships.map((m) => m.userId)
    const [activityByUser, leadsByUser, dealsByUser, unassignedLeads, unassignedDeals] =
      await Promise.all([
        prisma.activity.groupBy({
          by: ['createdById'],
          where: {
            organizationId: orgId,
            createdById: { in: userIds },
          },
          _count: { id: true },
        }),
        prisma.lead.groupBy({
          by: ['assignedToId'],
          where: { organizationId: orgId, assignedToId: { in: userIds } },
          _count: { id: true },
        }),
        prisma.deal.groupBy({
          by: ['assignedToId'],
          where: { organizationId: orgId, assignedToId: { in: userIds } },
          _count: { id: true },
        }),
        prisma.lead.count({
          where: { organizationId: orgId, assignedToId: null },
        }),
        prisma.deal.count({
          where: { organizationId: orgId, assignedToId: null },
        }),
      ])

    const activityMap = new Map(
      activityByUser.map((row) => [row.createdById, row._count.id]),
    )
    const leadMap = new Map(
      leadsByUser.map((row) => [row.assignedToId, row._count.id]),
    )
    const dealMap = new Map(
      dealsByUser.map((row) => [row.assignedToId, row._count.id]),
    )

    const team = memberships.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      activityCount: activityMap.get(m.userId) ?? 0,
      leadCount: leadMap.get(m.userId) ?? 0,
      dealCount: dealMap.get(m.userId) ?? 0,
    }))

    team.sort((a, b) => b.activityCount - a.activityCount)

    const closedTotal = wonCount + lostCount
    const winRate = closedTotal > 0 ? Math.round((wonCount / closedTotal) * 100) : 0

    res.json({
      leadCount,
      dealCount,
      pipelineArr: arrAgg._sum?.arr ?? 0,
      weightedPipeline,
      winRate,
      wonCount,
      lostCount,
      unassignedLeads,
      unassignedDeals,
      team,
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        createdAt: a.createdAt,
        createdBy: a.createdBy,
      })),
    })
  },
)

router.get('/manager-access', async (req, res) => {
  res.json({ isManager: isManagerRole(req.auth!.role) })
})

router.get('/forecast', async (req, res) => {
  const isManager = isManagerRole(req.auth!.role)
  const forecast = await buildPipelineForecast(
    req.auth!.organizationId,
    isManager ? undefined : { assignedToId: req.auth!.userId },
  )
  res.json(forecast)
})

export default router
