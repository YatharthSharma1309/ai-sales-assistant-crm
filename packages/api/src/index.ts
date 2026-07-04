import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { globalLimiter } from './middleware/rateLimit.js'
import { errorHandler } from './middleware/errorHandler.js'
import { assertProductionEnvironment } from './lib/productionCheck.js'
import {
  handleHubSpotWebhook,
  handleSalesforceWebhook,
} from './routes/webhooks.js'
import authRoutes from './routes/auth.js'
import accountsRoutes from './routes/accounts.js'
import contactsRoutes from './routes/contacts.js'
import leadsRoutes from './routes/leads.js'
import dealsRoutes from './routes/deals.js'
import activitiesRoutes from './routes/activities.js'
import aiRoutes from './routes/ai.js'
import meetingsRoutes from './routes/meetings.js'
import communicationsRoutes from './routes/communications.js'
import integrationsRoutes from './routes/integrations.js'
import dashboardRoutes from './routes/dashboard.js'
import teamRoutes from './routes/team.js'
import organizationRoutes from './routes/organization.js'
import { startCalendarSyncJob } from './jobs/calendarSyncJob.js'
import { startGmailSyncJob } from './jobs/gmailSyncJob.js'

assertProductionEnvironment()

const app = express()
const port = Number(process.env.PORT) || 3001
const isProduction = process.env.NODE_ENV === 'production'

if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1)
}

const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const allowedOrigins = [
  frontendUrl,
  ...(process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
]

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)

app.use(
  cors({
    origin: isProduction
      ? (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
            return
          }
          callback(new Error('Not allowed by CORS'))
        }
      : allowedOrigins,
    credentials: true,
  }),
)

app.post(
  '/api/integrations/hubspot/webhook',
  express.raw({ type: 'application/json' }),
  handleHubSpotWebhook,
)
app.post(
  '/api/integrations/salesforce/webhook',
  express.raw({ type: 'application/json' }),
  handleSalesforceWebhook,
)

app.use(cookieParser())
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ai-sales-assistant-crm-api' })
})

app.use(globalLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/accounts', accountsRoutes)
app.use('/api/contacts', contactsRoutes)
app.use('/api/leads', leadsRoutes)
app.use('/api/deals', dealsRoutes)
app.use('/api/activities', activitiesRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/meetings', meetingsRoutes)
app.use('/api/communications', communicationsRoutes)
app.use('/api/integrations', integrationsRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/team', teamRoutes)
app.use('/api/organization', organizationRoutes)

app.use(errorHandler)

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`)
  startCalendarSyncJob()
  startGmailSyncJob()
})
