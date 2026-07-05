import { Router } from 'express'
import type { Request, Response } from 'express'
import { runStaleDealAlertsForAllOrgs } from '../lib/staleDealAlerts.js'
import { triggerCalendarSyncNow } from '../jobs/calendarSyncJob.js'
import { triggerGmailSyncNow } from '../jobs/gmailSyncJob.js'

const router = Router()
const CRON_SECRET = process.env.CRON_SECRET

function verifyCron(req: Request): boolean {
  if (!CRON_SECRET) return false
  const header = req.headers['x-cron-secret'] ?? req.headers.authorization
  if (typeof header === 'string' && header === CRON_SECRET) return true
  if (typeof header === 'string' && header === `Bearer ${CRON_SECRET}`) return true
  return false
}

async function runDailyCron(req: Request, res: Response) {
  if (!verifyCron(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const [staleDealAlerts, calendar, gmail] = await Promise.all([
    runStaleDealAlertsForAllOrgs(),
    triggerCalendarSyncNow(),
    triggerGmailSyncNow(),
  ])

  res.json({
    ok: true,
    staleDealAlerts: { orgs: staleDealAlerts.length },
    calendar: {
      integrations: calendar.length,
      created: calendar.reduce((sum, r) => sum + r.created, 0),
    },
    gmail: {
      integrations: gmail.length,
      created: gmail.reduce((sum, r) => sum + r.created, 0),
    },
  })
}

router.get('/daily', runDailyCron)
router.post('/daily', runDailyCron)

export default router
