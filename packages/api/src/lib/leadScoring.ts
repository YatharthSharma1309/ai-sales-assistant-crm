import type { LeadStatus } from '@prisma/client'
import { prisma } from './prisma.js'

const STATUS_POINTS: Record<LeadStatus, number> = {
  NEW: 0,
  CONTACTED: 15,
  QUALIFIED: 30,
  UNQUALIFIED: -20,
}

export type ScoreFactor = { rule: string; points: number }

export function computeLeadScore(input: {
  status: LeadStatus
  source?: string | null
  hasContactEmail: boolean
  jobTitle?: string | null
  recentActivityCount: number
}): { score: number; factors: ScoreFactor[] } {
  const factors: ScoreFactor[] = []
  let score = 0

  const statusPts = STATUS_POINTS[input.status]
  score += statusPts
  factors.push({ rule: `Status: ${input.status}`, points: statusPts })

  if (input.hasContactEmail) {
    score += 10
    factors.push({ rule: 'Contact has email', points: 10 })
  }

  if (input.source && /referral|inbound|partner/i.test(input.source)) {
    score += 20
    factors.push({ rule: 'High-intent source', points: 20 })
  }

  if (input.jobTitle && /director|vp|ceo|head|chief/i.test(input.jobTitle)) {
    score += 10
    factors.push({ rule: 'Senior job title', points: 10 })
  }

  const activityPts = Math.min(input.recentActivityCount * 5, 25)
  if (activityPts > 0) {
    score += activityPts
    factors.push({ rule: 'Recent engagement', points: activityPts })
  }

  return { score: Math.max(0, Math.min(100, score)), factors }
}

export async function recalculateLeadScore(leadId: string, organizationId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      contact: { select: { email: true, jobTitle: true } },
    },
  })
  if (!lead) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentActivityCount = await prisma.activity.count({
    where: {
      organizationId,
      leadId: lead.id,
      type: { in: ['EMAIL', 'CALL', 'MEETING'] },
      createdAt: { gte: thirtyDaysAgo },
    },
  })

  const { score, factors } = computeLeadScore({
    status: lead.status,
    source: lead.source,
    hasContactEmail: Boolean(lead.contact?.email),
    jobTitle: lead.contact?.jobTitle,
    recentActivityCount,
  })

  await prisma.lead.update({
    where: { id: lead.id },
    data: { score, scoreUpdatedAt: new Date() },
  })

  return { id: lead.id, score, factors }
}

export async function recalculateOrgLeadScores(organizationId: string) {
  const leads = await prisma.lead.findMany({
    where: { organizationId },
    select: { id: true },
  })
  let updated = 0
  for (const lead of leads) {
    await recalculateLeadScore(lead.id, organizationId)
    updated++
  }
  return { updated }
}
