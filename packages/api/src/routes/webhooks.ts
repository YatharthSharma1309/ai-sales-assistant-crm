import type { Request, Response } from 'express'
import { z } from 'zod'
import {
  verifyHubSpotWebhookV3,
  processHubSpotWebhookEvents,
  type HubSpotWebhookEvent,
} from '../lib/hubspotWebhooks.js'
import {
  findOrgBySalesforceWebhookSecret,
  upsertContactFromExternal,
  upsertDealFromExternal,
  upsertLeadFromSalesforce,
  SALESFORCE_SOURCE,
} from '../lib/crmExternalSync.js'
import { mapSalesforceStage } from '../lib/salesforceImport.js'
import { verifySalesforceWebhookSignature } from '../lib/salesforceWebhooks.js'

function publicRequestUri(req: Request): string {
  const base = process.env.API_PUBLIC_URL
  if (base) {
    return `${base.replace(/\/$/, '')}${req.originalUrl}`
  }
  const proto = req.get('x-forwarded-proto') ?? req.protocol
  const host = req.get('x-forwarded-host') ?? req.get('host') ?? 'localhost:3001'
  return `${proto}://${host}${req.originalUrl}`
}

export async function handleHubSpotWebhook(req: Request, res: Response) {
  const rawBody =
    req.body instanceof Buffer
      ? req.body.toString('utf-8')
      : typeof req.body === 'string'
        ? req.body
        : ''

  const requestUri = publicRequestUri(req)

  if (
    process.env.NODE_ENV === 'production' &&
    !verifyHubSpotWebhookV3(req, rawBody, requestUri)
  ) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  let events: HubSpotWebhookEvent[]
  try {
    events = JSON.parse(rawBody) as HubSpotWebhookEvent[]
    if (!Array.isArray(events)) events = [events as unknown as HubSpotWebhookEvent]
  } catch {
    res.status(400).json({ error: 'Invalid JSON' })
    return
  }

  const result = await processHubSpotWebhookEvents(events)
  res.json({ received: events.length, ...result })
}

const salesforceWebhookSchema = z.object({
  type: z.enum(['Contact', 'Lead', 'Opportunity']),
  id: z.string().min(1),
  properties: z.record(z.unknown()).optional(),
})

export async function handleSalesforceWebhook(req: Request, res: Response) {
  const secret = req.headers['x-salesforce-webhook-secret']
  if (typeof secret !== 'string') {
    res.status(401).json({ error: 'Missing webhook secret' })
    return
  }

  const integration = await findOrgBySalesforceWebhookSecret(secret)
  if (!integration) {
    res.status(401).json({ error: 'Invalid webhook secret' })
    return
  }

  const rawBody =
    req.body instanceof Buffer
      ? req.body.toString('utf-8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body)

  if (
    process.env.NODE_ENV === 'production' &&
    req.headers['x-salesforce-signature'] &&
    !verifySalesforceWebhookSignature(req, rawBody, secret)
  ) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    res.status(400).json({ error: 'Invalid JSON' })
    return
  }

  const parsed = salesforceWebhookSchema.safeParse(body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const orgId = integration.organizationId
  const userId = integration.userId
  const props = parsed.data.properties ?? {}

  if (parsed.data.type === 'Contact') {
    await upsertContactFromExternal(
      orgId,
      userId,
      SALESFORCE_SOURCE,
      parsed.data.id,
      {
        firstName: String(props.FirstName ?? 'Unknown'),
        lastName: String(props.LastName ?? ''),
        email: props.Email ? String(props.Email) : undefined,
        jobTitle: props.Title ? String(props.Title) : undefined,
        phone: props.Phone ? String(props.Phone) : undefined,
        company: props.AccountName ? String(props.AccountName) : undefined,
      },
    )
  }

  if (parsed.data.type === 'Lead') {
    await upsertLeadFromSalesforce(orgId, userId, parsed.data.id, {
      title: String(props.Company ?? props.Name ?? 'Lead'),
      source: props.LeadSource ? String(props.LeadSource) : undefined,
      notes: props.Status ? String(props.Status) : undefined,
      contact: {
        firstName: String(props.FirstName ?? 'Unknown'),
        lastName: String(props.LastName ?? ''),
        email: props.Email ? String(props.Email) : undefined,
        company: props.Company ? String(props.Company) : undefined,
      },
    })
  }

  if (parsed.data.type === 'Opportunity') {
    await upsertDealFromExternal(
      orgId,
      userId,
      SALESFORCE_SOURCE,
      parsed.data.id,
      {
        title: String(props.Name ?? 'Opportunity'),
        stage: props.StageName ? String(props.StageName) : undefined,
        amount: props.Amount != null ? Number(props.Amount) : undefined,
        closeDate: props.CloseDate ? String(props.CloseDate) : undefined,
      },
      mapSalesforceStage,
    )
  }

  res.json({ received: true, type: parsed.data.type })
}

export function getSalesforceWebhookUrl(): string {
  const base =
    process.env.API_PUBLIC_URL ??
    process.env.FRONTEND_URL?.replace('5173', '3001') ??
    'http://localhost:3001'
  return `${base.replace(/\/$/, '')}/api/integrations/salesforce/webhook`
}
