import { prisma } from './prisma.js'
import { fetchUpcomingEvents, getValidAccessToken } from './googleCalendar.js'

export type CalendarSyncResult = {
  organizationId: string
  userId: string
  synced: number
  created: number
  skipped: number
  error?: string
}

let syncMutex: Promise<void> = Promise.resolve()

export function withCalendarSyncMutex<T>(fn: () => Promise<T>): Promise<T> {
  const run = syncMutex.then(fn)
  syncMutex = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export async function syncGoogleCalendarForIntegration(
  integrationId: string,
  organizationId: string,
  userId: string,
  days = 14,
): Promise<Omit<CalendarSyncResult, 'organizationId' | 'userId'>> {
  const accessToken = await getValidAccessToken(integrationId)
  const events = await fetchUpcomingEvents(accessToken, days)

  let created = 0
  let skipped = 0

  for (const event of events) {
    const existing = await prisma.activity.findFirst({
      where: {
        organizationId,
        googleEventId: event.id,
      },
    })

    if (existing) {
      skipped++
      continue
    }

    let contactId: string | undefined
    for (const email of event.attendees) {
      const contact = await prisma.contact.findFirst({
        where: { organizationId, email },
      })
      if (contact) {
        contactId = contact.id
        break
      }
    }

    try {
      await prisma.activity.create({
        data: {
          organizationId,
          contactId,
          createdById: userId,
          googleEventId: event.id,
          type: 'MEETING',
          title: `Calendar: ${event.summary}`,
          body: JSON.stringify({
            googleEventId: event.id,
            start: event.start,
            end: event.end,
            attendees: event.attendees,
            link: event.htmlLink,
            description: event.description,
          }),
          dueAt: event.start ? new Date(event.start) : undefined,
        },
      })
      created++
    } catch {
      skipped++
    }
  }

  return { synced: events.length, created, skipped }
}

export async function syncAllGoogleCalendars(
  days = 14,
): Promise<CalendarSyncResult[]> {
  return withCalendarSyncMutex(async () => {
    const integrations = await prisma.integration.findMany({
      where: { provider: 'GOOGLE_CALENDAR' },
    })

    const results: CalendarSyncResult[] = []

    for (const integration of integrations) {
      try {
        const result = await syncGoogleCalendarForIntegration(
          integration.id,
          integration.organizationId,
          integration.userId,
          days,
        )
        results.push({
          organizationId: integration.organizationId,
          userId: integration.userId,
          ...result,
        })
      } catch (err) {
        results.push({
          organizationId: integration.organizationId,
          userId: integration.userId,
          synced: 0,
          created: 0,
          skipped: 0,
          error: err instanceof Error ? err.message : 'Sync failed',
        })
      }
    }

    return results
  })
}
