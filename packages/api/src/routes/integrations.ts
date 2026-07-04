import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma.js'
import { JWT_SECRET, protectedMiddleware } from '../lib/auth.js'
import { isManagerRole, requireRole } from '../lib/rbac.js'
import {
  importHubSpotData,
  parseHubSpotContactsCsv,
  parseHubSpotDealsCsv,
  type HubSpotContactRow,
  type HubSpotDealRow,
} from '../lib/hubspotImport.js'
import {
  importSalesforceData,
  parseSalesforceContactsCsv,
  parseSalesforceLeadsCsv,
  parseSalesforceOpportunitiesCsv,
} from '../lib/salesforceImport.js'
import {
  buildGoogleAuthUrl,
  exchangeGoogleCode,
} from '../lib/googleCalendar.js'
import {
  syncGoogleCalendarForIntegration,
  withCalendarSyncMutex,
} from '../lib/calendarSync.js'
import {
  getCalendarSyncConfig,
  triggerCalendarSyncNow,
} from '../jobs/calendarSyncJob.js'
import {
  syncHubSpotIntegration,
  validateHubSpotToken,
} from '../lib/hubspotSync.js'
import {
  syncSalesforceIntegration,
  validateSalesforceCredentials,
} from '../lib/salesforceSync.js'
import {
  buildHubSpotAuthUrl,
  exchangeHubSpotCode,
  fetchHubSpotPortalId,
  getValidHubSpotAccessToken,
  isHubSpotOAuthConfigured,
} from '../lib/hubspotOAuth.js'
import { getHubSpotWebhookUrl } from '../lib/hubspotWebhooks.js'
import { getSalesforceWebhookUrl } from './webhooks.js'
import {
  buildGmailAuthUrl,
  exchangeGmailCode,
} from '../lib/gmail.js'
import {
  getGoogleOAuthConfigForOrg,
  getGoogleOAuthSettingsForOrg,
  isGoogleOAuthConfiguredForOrg,
} from '../lib/googleOAuth.js'
import { encryptSecret } from '../lib/secretStore.js'
import { syncGmailForIntegration } from '../lib/gmailSync.js'
import { getGmailSyncConfig } from '../jobs/gmailSyncJob.js'
import crypto from 'crypto'

const router = Router()

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const OAUTH_PURPOSE = 'google_oauth'
const HUBSPOT_OAUTH_PURPOSE = 'hubspot_oauth'
const GMAIL_OAUTH_PURPOSE = 'gmail_oauth'
const CRON_SECRET = process.env.CRON_SECRET

const hubspotSchema = z.object({
  contacts: z.array(z.custom<HubSpotContactRow>()).optional(),
  deals: z.array(z.custom<HubSpotDealRow>()).optional(),
})

const importCsvSchema = z.object({
  type: z.string().min(1),
  csv: z.string().min(1),
})

const googleOAuthConfigSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1),
})

function verifyCronSecret(req: { headers: Record<string, unknown> }): boolean {
  if (!CRON_SECRET) return false
  const header = req.headers['x-cron-secret'] ?? req.headers.authorization
  if (typeof header === 'string' && header === CRON_SECRET) return true
  if (typeof header === 'string' && header === `Bearer ${CRON_SECRET}`) return true
  return false
}

router.get('/status', protectedMiddleware, async (req, res) => {
  const integrations = await prisma.integration.findMany({
    where: {
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
    },
    select: { id: true, provider: true, createdAt: true, updatedAt: true },
  })

  const orgIntegrations = await prisma.integration.findMany({
    where: { organizationId: req.auth!.organizationId },
    select: { provider: true, userId: true, updatedAt: true },
  })

  const syncConfig = getCalendarSyncConfig()
  const isManager = isManagerRole(req.auth!.role)
  const orgId = req.auth!.organizationId
  const googleOAuth = isManager
    ? await getGoogleOAuthSettingsForOrg(orgId)
    : undefined
  const googleConfigured = await isGoogleOAuthConfiguredForOrg(orgId)

  const googleConnected = integrations.some((i) => i.provider === 'GOOGLE_CALENDAR')
  const hubspotConnected = orgIntegrations.some((i) => i.provider === 'HUBSPOT')
  const salesforceConnected = orgIntegrations.some(
    (i) => i.provider === 'SALESFORCE',
  )
  const gmailConnected = integrations.some((i) => i.provider === 'GMAIL')

  if (!isManager) {
    res.json({
      googleCalendar: { configured: googleConfigured, connected: googleConnected },
      hubspot: { connected: hubspotConnected },
      salesforce: { connected: salesforceConnected },
      gmail: { configured: googleConfigured, connected: gmailConnected },
    })
    return
  }

  res.json({
    googleCalendar: {
      configured: googleConfigured,
      connected: googleConnected,
      autoSyncEnabled: syncConfig.enabled,
      autoSyncIntervalMinutes: Math.round(syncConfig.intervalMs / 60_000),
    },
    googleOAuth,
    hubspot: {
      importAvailable: true,
      oauthConfigured: isHubSpotOAuthConfigured(),
      connected: hubspotConnected,
      lastSyncAt: orgIntegrations.find((i) => i.provider === 'HUBSPOT')?.updatedAt,
      webhookUrl: getHubSpotWebhookUrl(),
    },
    salesforce: {
      importAvailable: true,
      connected: salesforceConnected,
      lastSyncAt: orgIntegrations.find((i) => i.provider === 'SALESFORCE')?.updatedAt,
      webhookUrl: getSalesforceWebhookUrl(),
    },
    gmail: {
      configured: googleConfigured,
      connected: gmailConnected,
      autoSyncEnabled: getGmailSyncConfig().enabled,
    },
    integrations,
  })
})

router.post(
  '/hubspot/import-csv',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const parsed = importCsvSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    if (parsed.data.type !== 'contacts' && parsed.data.type !== 'deals') {
      res.status(400).json({ error: 'type must be contacts or deals' })
      return
    }

    try {
      const data =
        parsed.data.type === 'contacts'
          ? { contacts: parseHubSpotContactsCsv(parsed.data.csv) }
          : { deals: parseHubSpotDealsCsv(parsed.data.csv) }

      const result = await importHubSpotData(
        req.auth!.organizationId,
        req.auth!.userId,
        data,
      )

      res.json(result)
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid CSV',
      })
    }
  },
)

router.post(
  '/hubspot/import',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const parsed = hubspotSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    if (
      (!parsed.data.contacts || parsed.data.contacts.length === 0) &&
      (!parsed.data.deals || parsed.data.deals.length === 0)
    ) {
      res.status(400).json({ error: 'Provide contacts or deals to import' })
      return
    }

    const result = await importHubSpotData(
      req.auth!.organizationId,
      req.auth!.userId,
      parsed.data,
    )

    res.json(result)
  },
)

router.post(
  '/salesforce/import-csv',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const parsed = importCsvSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    const type = parsed.data.type
    if (!['contacts', 'leads', 'opportunities'].includes(type)) {
      res.status(400).json({
        error: 'type must be contacts, leads, or opportunities',
      })
      return
    }

    try {
      const data =
        type === 'contacts'
          ? { contacts: parseSalesforceContactsCsv(parsed.data.csv) }
          : type === 'leads'
            ? { leads: parseSalesforceLeadsCsv(parsed.data.csv) }
            : { deals: parseSalesforceOpportunitiesCsv(parsed.data.csv) }

      const result = await importSalesforceData(
        req.auth!.organizationId,
        req.auth!.userId,
        data,
      )

      res.json(result)
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Invalid CSV',
      })
    }
  },
)

router.post(
  '/google/config',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const parsed = googleOAuthConfigSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    await prisma.organization.update({
      where: { id: req.auth!.organizationId },
      data: {
        googleClientId: parsed.data.clientId.trim(),
        googleClientSecret: encryptSecret(parsed.data.clientSecret.trim()),
      },
    })

    const settings = await getGoogleOAuthSettingsForOrg(req.auth!.organizationId)
    res.json(settings)
  },
)

router.delete(
  '/google/config',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    await prisma.organization.update({
      where: { id: req.auth!.organizationId },
      data: {
        googleClientId: null,
        googleClientSecret: null,
      },
    })

    const settings = await getGoogleOAuthSettingsForOrg(req.auth!.organizationId)
    res.json(settings)
  },
)

router.get(
  '/google/auth-url',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER', 'REP'),
  async (req, res) => {
    const config = await getGoogleOAuthConfigForOrg(req.auth!.organizationId)
    if (!config) {
      res.status(503).json({
        error: 'Google Calendar not configured',
        message:
          'Add Google OAuth credentials in Integrations or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.',
      })
      return
    }

    const state = jwt.sign(
      {
        purpose: OAUTH_PURPOSE,
        userId: req.auth!.userId,
        organizationId: req.auth!.organizationId,
      },
      JWT_SECRET,
      { expiresIn: '10m' },
    )

    res.json({ url: buildGoogleAuthUrl(state, config) })
  },
)

router.get('/google/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined
  const state = typeof req.query.state === 'string' ? req.query.state : undefined

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/integrations?error=missing_params`)
    return
  }

  try {
    const payload = jwt.verify(state, JWT_SECRET) as {
      purpose?: string
      userId: string
      organizationId: string
    }

    if (payload.purpose !== OAUTH_PURPOSE) {
      throw new Error('Invalid OAuth state')
    }

    const config = await getGoogleOAuthConfigForOrg(payload.organizationId)
    if (!config) {
      throw new Error('Google OAuth not configured')
    }

    const tokens = await exchangeGoogleCode(code, config)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await prisma.integration.upsert({
      where: {
        organizationId_userId_provider: {
          organizationId: payload.organizationId,
          userId: payload.userId,
          provider: 'GOOGLE_CALENDAR',
        },
      },
      create: {
        organizationId: payload.organizationId,
        userId: payload.userId,
        provider: 'GOOGLE_CALENDAR',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt,
      },
    })

    res.redirect(`${FRONTEND_URL}/integrations?connected=google`)
  } catch {
    res.redirect(`${FRONTEND_URL}/integrations?error=oauth_failed`)
  }
})

router.post('/google/sync', protectedMiddleware, async (req, res) => {
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_userId_provider: {
        organizationId: req.auth!.organizationId,
        userId: req.auth!.userId,
        provider: 'GOOGLE_CALENDAR',
      },
    },
  })

  if (!integration) {
    res.status(404).json({ error: 'Google Calendar not connected' })
    return
  }

  const { days } = getCalendarSyncConfig()
  const result = await withCalendarSyncMutex(() =>
    syncGoogleCalendarForIntegration(
      integration.id,
      req.auth!.organizationId,
      req.auth!.userId,
      days,
    ),
  )

  res.json(result)
})

router.post('/cron/calendar-sync', async (req, res) => {
  if (!verifyCronSecret(req)) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const results = await triggerCalendarSyncNow()
  res.json({
    integrations: results.length,
    created: results.reduce((sum, r) => sum + r.created, 0),
    skipped: results.reduce((sum, r) => sum + r.skipped, 0),
    errors: results.filter((r) => r.error).length,
    results,
  })
})

const hubspotConnectSchema = z.object({
  accessToken: z.string().min(1),
})

const salesforceConnectSchema = z.object({
  accessToken: z.string().min(1),
  instanceUrl: z.string().url(),
})

router.post(
  '/hubspot/connect',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const parsed = hubspotConnectSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    const valid = await validateHubSpotToken(parsed.data.accessToken)
    if (!valid) {
      res.status(400).json({ error: 'Invalid HubSpot access token' })
      return
    }

    const portalId = await fetchHubSpotPortalId(parsed.data.accessToken)

    await prisma.integration.upsert({
      where: {
        organizationId_userId_provider: {
          organizationId: req.auth!.organizationId,
          userId: req.auth!.userId,
          provider: 'HUBSPOT',
        },
      },
      create: {
        organizationId: req.auth!.organizationId,
        userId: req.auth!.userId,
        provider: 'HUBSPOT',
        accessToken: parsed.data.accessToken,
        metadata: { hubspotPortalId: portalId, authMethod: 'private_token' },
      },
      update: {
        accessToken: parsed.data.accessToken,
        metadata: { hubspotPortalId: portalId, authMethod: 'private_token' },
      },
    })

    res.json({ connected: true, webhookUrl: getHubSpotWebhookUrl() })
  },
)

router.get(
  '/hubspot/auth-url',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  (req, res) => {
    if (!isHubSpotOAuthConfigured()) {
      res.status(503).json({
        error: 'HubSpot OAuth not configured',
        message: 'Set HUBSPOT_CLIENT_ID and HUBSPOT_CLIENT_SECRET',
      })
      return
    }

    const state = jwt.sign(
      {
        purpose: HUBSPOT_OAUTH_PURPOSE,
        userId: req.auth!.userId,
        organizationId: req.auth!.organizationId,
      },
      JWT_SECRET,
      { expiresIn: '10m' },
    )

    const url = buildHubSpotAuthUrl(state)
    res.json({ url })
  },
)

router.get('/hubspot/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined
  const state = typeof req.query.state === 'string' ? req.query.state : undefined

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/integrations?error=missing_params`)
    return
  }

  try {
    const payload = jwt.verify(state, JWT_SECRET) as {
      purpose?: string
      userId: string
      organizationId: string
    }

    if (payload.purpose !== HUBSPOT_OAUTH_PURPOSE) {
      throw new Error('Invalid OAuth state')
    }

    const tokens = await exchangeHubSpotCode(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)
    const portalId = await fetchHubSpotPortalId(tokens.access_token)

    await prisma.integration.upsert({
      where: {
        organizationId_userId_provider: {
          organizationId: payload.organizationId,
          userId: payload.userId,
          provider: 'HUBSPOT',
        },
      },
      create: {
        organizationId: payload.organizationId,
        userId: payload.userId,
        provider: 'HUBSPOT',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
        metadata: { hubspotPortalId: portalId, authMethod: 'oauth' },
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt,
        metadata: { hubspotPortalId: portalId, authMethod: 'oauth' },
      },
    })

    res.redirect(`${FRONTEND_URL}/integrations?connected=hubspot`)
  } catch {
    res.redirect(`${FRONTEND_URL}/integrations?error=hubspot_oauth_failed`)
  }
})

router.post(
  '/hubspot/sync',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: req.auth!.organizationId,
        provider: 'HUBSPOT',
      },
    })

    if (!integration) {
      res.status(404).json({ error: 'HubSpot not connected' })
      return
    }

    const accessToken = await getValidHubSpotAccessToken(integration.id)
    const result = await syncHubSpotIntegration(
      req.auth!.organizationId,
      integration.userId,
      accessToken,
    )

    await prisma.integration.update({
      where: { id: integration.id },
      data: { updatedAt: new Date() },
    })

    res.json(result)
  },
)

router.delete(
  '/hubspot',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    await prisma.integration.deleteMany({
      where: {
        organizationId: req.auth!.organizationId,
        provider: 'HUBSPOT',
      },
    })
    res.json({ disconnected: true })
  },
)

router.post(
  '/salesforce/connect',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const parsed = salesforceConnectSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() })
      return
    }

    const valid = await validateSalesforceCredentials(
      parsed.data.accessToken,
      parsed.data.instanceUrl,
    )
    if (!valid) {
      res.status(400).json({ error: 'Invalid Salesforce credentials' })
      return
    }

    const existing = await prisma.integration.findUnique({
      where: {
        organizationId_userId_provider: {
          organizationId: req.auth!.organizationId,
          userId: req.auth!.userId,
          provider: 'SALESFORCE',
        },
      },
    })
    const existingMeta = existing?.metadata as { webhookSecret?: string } | null
    const webhookSecret =
      existingMeta?.webhookSecret ?? crypto.randomBytes(16).toString('hex')

    await prisma.integration.upsert({
      where: {
        organizationId_userId_provider: {
          organizationId: req.auth!.organizationId,
          userId: req.auth!.userId,
          provider: 'SALESFORCE',
        },
      },
      create: {
        organizationId: req.auth!.organizationId,
        userId: req.auth!.userId,
        provider: 'SALESFORCE',
        accessToken: parsed.data.accessToken,
        metadata: {
          instanceUrl: parsed.data.instanceUrl,
          webhookSecret,
        },
      },
      update: {
        accessToken: parsed.data.accessToken,
        metadata: {
          instanceUrl: parsed.data.instanceUrl,
          webhookSecret,
        },
      },
    })

    res.json({
      connected: true,
      webhookUrl: getSalesforceWebhookUrl(),
      webhookSecret,
    })
  },
)

router.post(
  '/salesforce/sync',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    const integration = await prisma.integration.findFirst({
      where: {
        organizationId: req.auth!.organizationId,
        provider: 'SALESFORCE',
      },
    })

    if (!integration) {
      res.status(404).json({ error: 'Salesforce not connected' })
      return
    }

    const metadata = integration.metadata as { instanceUrl?: string } | null
    if (!metadata?.instanceUrl) {
      res.status(400).json({ error: 'Salesforce instance URL missing' })
      return
    }

    const result = await syncSalesforceIntegration(
      req.auth!.organizationId,
      integration.userId,
      integration.accessToken,
      metadata.instanceUrl,
    )

    await prisma.integration.update({
      where: { id: integration.id },
      data: { updatedAt: new Date() },
    })

    res.json(result)
  },
)

router.delete(
  '/salesforce',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER'),
  async (req, res) => {
    await prisma.integration.deleteMany({
      where: {
        organizationId: req.auth!.organizationId,
        provider: 'SALESFORCE',
      },
    })
    res.json({ disconnected: true })
  },
)

router.get(
  '/gmail/auth-url',
  protectedMiddleware,
  requireRole('ADMIN', 'MANAGER', 'REP'),
  async (req, res) => {
    const config = await getGoogleOAuthConfigForOrg(req.auth!.organizationId)
    if (!config) {
      res.status(503).json({
        error: 'Gmail not configured',
        message:
          'Add Google OAuth credentials in Integrations or set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET on the server.',
      })
      return
    }

    const state = jwt.sign(
      {
        purpose: GMAIL_OAUTH_PURPOSE,
        userId: req.auth!.userId,
        organizationId: req.auth!.organizationId,
      },
      JWT_SECRET,
      { expiresIn: '10m' },
    )

    res.json({ url: buildGmailAuthUrl(state, config) })
  },
)

router.get('/gmail/callback', async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : undefined
  const state = typeof req.query.state === 'string' ? req.query.state : undefined

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/integrations?error=missing_params`)
    return
  }

  try {
    const payload = jwt.verify(state, JWT_SECRET) as {
      purpose?: string
      userId: string
      organizationId: string
    }

    if (payload.purpose !== GMAIL_OAUTH_PURPOSE) {
      throw new Error('Invalid OAuth state')
    }

    const config = await getGoogleOAuthConfigForOrg(payload.organizationId)
    if (!config) {
      throw new Error('Gmail OAuth not configured')
    }

    const tokens = await exchangeGmailCode(code, config)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    await prisma.integration.upsert({
      where: {
        organizationId_userId_provider: {
          organizationId: payload.organizationId,
          userId: payload.userId,
          provider: 'GMAIL',
        },
      },
      create: {
        organizationId: payload.organizationId,
        userId: payload.userId,
        provider: 'GMAIL',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt,
      },
    })

    res.redirect(`${FRONTEND_URL}/integrations?connected=gmail`)
  } catch {
    res.redirect(`${FRONTEND_URL}/integrations?error=gmail_oauth_failed`)
  }
})

router.post('/gmail/sync', protectedMiddleware, async (req, res) => {
  const integration = await prisma.integration.findUnique({
    where: {
      organizationId_userId_provider: {
        organizationId: req.auth!.organizationId,
        userId: req.auth!.userId,
        provider: 'GMAIL',
      },
    },
  })

  if (!integration) {
    res.status(404).json({ error: 'Gmail not connected' })
    return
  }

  const result = await syncGmailForIntegration(
    integration.id,
    req.auth!.organizationId,
    req.auth!.userId,
  )

  res.json(result)
})

router.delete('/gmail', protectedMiddleware, async (req, res) => {
  await prisma.integration.deleteMany({
    where: {
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      provider: 'GMAIL',
    },
  })
  res.json({ disconnected: true })
})

router.delete('/google', protectedMiddleware, async (req, res) => {
  await prisma.integration.deleteMany({
    where: {
      organizationId: req.auth!.organizationId,
      userId: req.auth!.userId,
      provider: 'GOOGLE_CALENDAR',
    },
  })
  res.json({ disconnected: true })
})

export default router
