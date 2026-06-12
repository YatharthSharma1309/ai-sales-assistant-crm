import crypto from 'crypto'
import type { Request } from 'express'
import { getHubSpotClientSecret } from './hubspotOAuth.js'
import { getValidHubSpotAccessToken } from './hubspotOAuth.js'
import {
  findOrgByHubSpotPortal,
  upsertContactFromExternal,
  upsertDealFromExternal,
  HUBSPOT_SOURCE,
} from './crmExternalSync.js'

const MAX_TIMESTAMP_MS = 5 * 60 * 1000

export type HubSpotWebhookEvent = {
  subscriptionType: string
  portalId: number
  objectId: number
  propertyName?: string
  propertyValue?: string
  occurredAt?: number
}

export function verifyHubSpotWebhookV3(
  req: Request,
  rawBody: string,
  requestUri: string,
): boolean {
  const secret = getHubSpotClientSecret()
  if (!secret) return false

  const signature = req.headers['x-hubspot-signature-v3']
  const timestamp = req.headers['x-hubspot-request-timestamp']

  if (typeof signature !== 'string' || typeof timestamp !== 'string') {
    return false
  }

  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Date.now() - ts > MAX_TIMESTAMP_MS) {
    return false
  }

  const rawString = `${req.method}${requestUri}${rawBody}${timestamp}`
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawString)
    .digest('base64')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(signature),
    )
  } catch {
    return false
  }
}

async function hubSpotFetchObject(
  accessToken: string,
  objectType: 'contacts' | 'deals',
  objectId: number,
) {
  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/${objectType}/${objectId}?properties=firstname,lastname,email,jobtitle,phone,company,dealname,dealstage,amount,closedate`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!response.ok) return null
  return response.json() as Promise<{
    id: string
    properties: Record<string, string | null | undefined>
  }>
}

export async function processHubSpotWebhookEvents(
  events: HubSpotWebhookEvent[],
): Promise<{ processed: number; errors: string[] }> {
  let processed = 0
  const errors: string[] = []

  for (const event of events) {
    try {
      const integration = await findOrgByHubSpotPortal(event.portalId)
      if (!integration) {
        errors.push(`No org for portal ${event.portalId}`)
        continue
      }

      const accessToken = await getValidHubSpotAccessToken(integration.id)
      const orgId = integration.organizationId
      const userId = integration.userId
      const externalId = String(event.objectId)

      if (
        event.subscriptionType === 'contact.creation' ||
        event.subscriptionType === 'contact.propertyChange'
      ) {
        const obj = await hubSpotFetchObject(
          accessToken,
          'contacts',
          event.objectId,
        )
        if (!obj) continue

        const p = obj.properties
        await upsertContactFromExternal(orgId, userId, HUBSPOT_SOURCE, externalId, {
          firstName: p.firstname || 'Unknown',
          lastName: p.lastname || '',
          email: p.email || undefined,
          jobTitle: p.jobtitle || undefined,
          phone: p.phone || undefined,
          company: p.company || undefined,
        })
        processed++
      }

      if (
        event.subscriptionType === 'deal.creation' ||
        event.subscriptionType === 'deal.propertyChange'
      ) {
        const obj = await hubSpotFetchObject(
          accessToken,
          'deals',
          event.objectId,
        )
        if (!obj) continue

        const p = obj.properties
        if (!p.dealname) continue

        await upsertDealFromExternal(orgId, userId, HUBSPOT_SOURCE, externalId, {
          title: p.dealname,
          stage: p.dealstage || undefined,
          amount: p.amount ? Number(p.amount) : undefined,
          closeDate: p.closedate || undefined,
        })
        processed++
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Unknown webhook error')
    }
  }

  return { processed, errors }
}

export function getHubSpotWebhookUrl(): string {
  const base =
    process.env.API_PUBLIC_URL ??
    process.env.FRONTEND_URL?.replace('5173', '3001') ??
    'http://localhost:3001'
  return `${base.replace(/\/$/, '')}/api/integrations/hubspot/webhook`
}
