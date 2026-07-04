import { syncAllGoogleCalendars } from '../lib/calendarSync.js'
import { isAnyGoogleOAuthConfigured } from '../lib/googleOAuth.js'

let intervalId: ReturnType<typeof setInterval> | null = null
let running = false

export function getCalendarSyncConfig() {
  const enabled = process.env.CALENDAR_SYNC_ENABLED === 'true'
  const intervalMs = Number(process.env.CALENDAR_SYNC_INTERVAL_MS ?? 3_600_000)
  const days = Number(process.env.CALENDAR_SYNC_DAYS ?? 14)

  return {
    enabled,
    intervalMs: Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 3_600_000,
    days: Number.isFinite(days) && days > 0 ? days : 14,
  }
}

async function runSync() {
  if (running || !(await isAnyGoogleOAuthConfigured())) return

  running = true
  try {
    const { days } = getCalendarSyncConfig()
    const results = await syncAllGoogleCalendars(days)
    const created = results.reduce((sum, r) => sum + r.created, 0)
    const errors = results.filter((r) => r.error).length

    if (results.length > 0) {
      console.log(
        `[calendar-sync] ${results.length} integration(s), ${created} meeting(s) created, ${errors} error(s)`,
      )
    }
  } catch (err) {
    console.error(
      '[calendar-sync] job failed:',
      err instanceof Error ? err.message : err,
    )
  } finally {
    running = false
  }
}

export function startCalendarSyncJob() {
  const { enabled, intervalMs } = getCalendarSyncConfig()

  if (!enabled) {
    console.log('[calendar-sync] disabled (set CALENDAR_SYNC_ENABLED=true to enable)')
    return
  }

  void (async () => {
    if (!(await isAnyGoogleOAuthConfigured())) {
      console.log('[calendar-sync] skipped — Google OAuth not configured')
      return
    }

    console.log(
      `[calendar-sync] auto-sync every ${Math.round(intervalMs / 60_000)} minute(s)`,
    )

    void runSync()
    intervalId = setInterval(() => {
      void runSync()
    }, intervalMs)
  })()
}

export function stopCalendarSyncJob() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

export async function triggerCalendarSyncNow() {
  const { days } = getCalendarSyncConfig()
  return syncAllGoogleCalendars(days)
}
