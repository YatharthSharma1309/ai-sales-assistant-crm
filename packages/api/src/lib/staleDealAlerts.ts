import { OPEN_STAGES } from './stages.js'
import { prisma } from './prisma.js'
import { sendEmail } from './emailSend.js'
import { logger } from './logger.js'

export async function runStaleDealAlertsForOrg(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      staleDealAlertsEnabled: true,
      staleDealAlertDays: true,
      lastStaleDealAlertAt: true,
    },
  })

  if (!org?.staleDealAlertsEnabled) {
    return { skipped: true, reason: 'disabled' as const }
  }

  const days = Math.max(1, org.staleDealAlertDays ?? 7)
  const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  if (
    org.lastStaleDealAlertAt &&
    Date.now() - org.lastStaleDealAlertAt.getTime() < 20 * 60 * 60 * 1000
  ) {
    return { skipped: true, reason: 'throttled' as const }
  }

  const staleDeals = await prisma.deal.findMany({
    where: {
      organizationId,
      stage: { in: [...OPEN_STAGES] },
      updatedAt: { lt: threshold },
    },
    select: {
      id: true,
      title: true,
      stage: true,
      updatedAt: true,
      assignedTo: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: 'asc' },
    take: 25,
  })

  if (staleDeals.length === 0) {
    return { skipped: true, reason: 'none_stale' as const, staleCount: 0 }
  }

  const managers = await prisma.membership.findMany({
    where: {
      organizationId,
      role: { in: ['ADMIN', 'MANAGER'] },
    },
    include: { user: { select: { email: true, name: true } } },
  })

  const recipients = [
    ...new Set(managers.map((m) => m.user.email).filter(Boolean)),
  ]

  if (recipients.length === 0) {
    return { skipped: true, reason: 'no_managers' as const, staleCount: staleDeals.length }
  }

  const lines = staleDeals.map((d) => {
    const owner = d.assignedTo?.name ?? 'Unassigned'
    const updated = d.updatedAt.toLocaleDateString()
    return `• ${d.title} (${d.stage}) — ${owner}, last updated ${updated}`
  })

  const body = [
    `${staleDeals.length} open deal(s) in ${org.name} have had no activity for ${days}+ days:`,
    '',
    ...lines,
    '',
    'Review your pipeline in the CRM to follow up.',
  ].join('\n')

  for (const to of recipients) {
    try {
      await sendEmail({
        to,
        subject: `[${org.name}] ${staleDeals.length} stale deal(s) need attention`,
        body,
      })
    } catch (err) {
      logger.warn('stale_deal_alert_email_failed', {
        organizationId,
        to,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { lastStaleDealAlertAt: new Date() },
  })

  logger.info('stale_deal_alerts_sent', {
    organizationId,
    staleCount: staleDeals.length,
    recipientCount: recipients.length,
  })

  return {
    skipped: false,
    staleCount: staleDeals.length,
    recipientCount: recipients.length,
  }
}

export async function runStaleDealAlertsForAllOrgs() {
  const orgs = await prisma.organization.findMany({
    where: { staleDealAlertsEnabled: true },
    select: { id: true },
  })

  const results = []
  for (const org of orgs) {
    results.push({
      organizationId: org.id,
      ...(await runStaleDealAlertsForOrg(org.id)),
    })
  }
  return results
}
