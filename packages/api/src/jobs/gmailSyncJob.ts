import { syncAllGmailInboxes } from '../lib/gmailSync.js'
import { isAnyGoogleOAuthConfigured } from '../lib/googleOAuth.js'

let intervalId: ReturnType<typeof setInterval> | null = null
let running = false

export function getGmailSyncConfig() {
  const enabled = process.env.GMAIL_SYNC_ENABLED === 'true'
  const intervalMs = Number(process.env.GMAIL_SYNC_INTERVAL_MS ?? 1_800_000)

  return {
    enabled,
    intervalMs: Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 1_800_000,
  }
}

async function runSync() {
  if (running || !(await isAnyGoogleOAuthConfigured())) return

  running = true
  try {
    const results = await syncAllGmailInboxes()
    const created = results.reduce((sum, r) => sum + r.created, 0)
    const errors = results.filter((r) => r.error).length

    if (results.length > 0) {
      console.log(
        `[gmail-sync] ${results.length} inbox(es), ${created} email(s) logged, ${errors} error(s)`,
      )
    }
  } catch (err) {
    console.error(
      '[gmail-sync] job failed:',
      err instanceof Error ? err.message : err,
    )
  } finally {
    running = false
  }
}

export function startGmailSyncJob() {
  const { enabled, intervalMs } = getGmailSyncConfig()

  if (!enabled) {
    console.log('[gmail-sync] disabled (set GMAIL_SYNC_ENABLED=true to enable)')
    return
  }

  void (async () => {
    if (!(await isAnyGoogleOAuthConfigured())) {
      console.log('[gmail-sync] skipped — Google OAuth not configured')
      return
    }

    console.log(
      `[gmail-sync] auto-sync every ${Math.round(intervalMs / 60_000)} minute(s)`,
    )

    void runSync()
    intervalId = setInterval(() => {
      void runSync()
    }, intervalMs)
  })()
}

export async function triggerGmailSyncNow() {
  return syncAllGmailInboxes()
}
