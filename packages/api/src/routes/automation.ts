import { Router } from 'express'
import type { Request } from 'express'
import { protectedMiddleware } from '../lib/auth.js'
import { requireRole } from '../lib/rbac.js'
import {
  runStaleDealAlertsForAllOrgs,
  runStaleDealAlertsForOrg,
} from '../lib/staleDealAlerts.js'

const router = Router()

const CRON_SECRET = process.env.CRON_SECRET

function verifyCron(req: Request): boolean {
  if (!CRON_SECRET) return false
  const header = req.headers['x-cron-secret'] ?? req.headers.authorization
  if (typeof header === 'string' && header === CRON_SECRET) return true
  if (typeof header === 'string' && header === `Bearer ${CRON_SECRET}`) return true
  return false
}

router.post('/cron/stale-deal-alerts', async (req, res) => {
  if (!verifyCron(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const results = await runStaleDealAlertsForAllOrgs()
  res.json({ ok: true, results })
})

router.use(protectedMiddleware)

router.post(
  '/stale-deal-alerts/run',
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const result = await runStaleDealAlertsForOrg(req.auth!.organizationId)
    res.json(result)
  },
)

export default router
