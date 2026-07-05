import { runStaleDealAlertsForAllOrgs } from '../lib/staleDealAlerts.js'

let intervalId: ReturnType<typeof setInterval> | null = null
let running = false

export function getStaleDealAlertsJobConfig() {
  const enabled = process.env.STALE_DEAL_ALERTS_ENABLED === 'true'
  const intervalMs = Number(process.env.STALE_DEAL_ALERTS_INTERVAL_MS ?? 86_400_000)

  return {
    enabled,
    intervalMs: Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : 86_400_000,
  }
}

async function runJob() {
  if (running) return
  running = true
  try {
    const results = await runStaleDealAlertsForAllOrgs()
    const sent = results.filter((r) => !('skipped' in r && r.skipped)).length
    if (results.length > 0) {
      console.log(
        `[stale-deal-alerts] checked ${results.length} org(s), ${sent} alert batch(es) sent`,
      )
    }
  } catch (err) {
    console.error(
      '[stale-deal-alerts] job failed:',
      err instanceof Error ? err.message : err,
    )
  } finally {
    running = false
  }
}

export function startStaleDealAlertsJob() {
  const { enabled, intervalMs } = getStaleDealAlertsJobConfig()

  if (!enabled) {
    console.log(
      '[stale-deal-alerts] disabled (set STALE_DEAL_ALERTS_ENABLED=true to enable)',
    )
    return
  }

  console.log(
    `[stale-deal-alerts] auto-run every ${Math.round(intervalMs / 3_600_000)} hour(s)`,
  )

  void runJob()
  intervalId = setInterval(() => {
    void runJob()
  }, intervalMs)
}

export function stopStaleDealAlertsJob() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
