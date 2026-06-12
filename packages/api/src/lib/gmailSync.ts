import { prisma } from './prisma.js'
import { fetchRecentGmailMessages, getValidGmailAccessToken } from './gmail.js'
import { recalculateLeadScore } from './leadScoring.js'

export type GmailSyncResult = {
  scanned: number
  created: number
  skipped: number
  error?: string
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/)
  return (match?.[1] ?? from).toLowerCase().trim()
}

export async function syncGmailForIntegration(
  integrationId: string,
  organizationId: string,
  userId: string,
): Promise<GmailSyncResult> {
  try {
    const accessToken = await getValidGmailAccessToken(integrationId)
    const messages = await fetchRecentGmailMessages(accessToken, 30)

    let created = 0
    let skipped = 0

    for (const message of messages) {
      const externalMessageId = `gmail:${message.id}`

      const existing = await prisma.activity.findFirst({
        where: { organizationId, externalMessageId },
      })
      if (existing) {
        skipped++
        continue
      }

      const fromEmail = extractEmailAddress(message.from)
      const contact = await prisma.contact.findFirst({
        where: { organizationId, email: fromEmail },
      })

      const lead = contact
        ? await prisma.lead.findFirst({
            where: { organizationId, contactId: contact.id },
            orderBy: { updatedAt: 'desc' },
            select: { id: true },
          })
        : null

      await prisma.activity.create({
        data: {
          organizationId,
          contactId: contact?.id,
          leadId: lead?.id,
          createdById: userId,
          type: 'EMAIL',
          title: `Gmail: ${message.subject}`,
          body: `From: ${message.from}\nTo: ${message.to}\nDate: ${message.date}\n\n${message.body || message.snippet}`,
          externalMessageId,
        },
      })

      if (lead?.id) {
        await recalculateLeadScore(lead.id, organizationId)
      }

      created++
    }

    return { scanned: messages.length, created, skipped }
  } catch (err) {
    return {
      scanned: 0,
      created: 0,
      skipped: 0,
      error: err instanceof Error ? err.message : 'Gmail sync failed',
    }
  }
}

export async function syncAllGmailInboxes(): Promise<GmailSyncResult[]> {
  const integrations = await prisma.integration.findMany({
    where: { provider: 'GMAIL' },
    select: { id: true, organizationId: true, userId: true },
  })

  const results: GmailSyncResult[] = []
  for (const integration of integrations) {
    results.push(
      await syncGmailForIntegration(
        integration.id,
        integration.organizationId,
        integration.userId,
      ),
    )
  }
  return results
}
