import { prisma } from './prisma.js'

const HUBSPOT_AUTH_URL = 'https://app.hubspot.com/oauth/authorize'
const HUBSPOT_TOKEN_URL = 'https://api.hubapi.com/oauth/v3/token'

const SCOPES = [
  'oauth',
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
  'crm.objects.deals.read',
  'crm.objects.deals.write',
].join(' ')

type HubSpotTokens = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

function getHubSpotConfig() {
  const clientId = process.env.HUBSPOT_CLIENT_ID
  const clientSecret = process.env.HUBSPOT_CLIENT_SECRET
  const redirectUri =
    process.env.HUBSPOT_REDIRECT_URI ??
    'http://localhost:3001/api/integrations/hubspot/callback'

  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, redirectUri }
}

export function isHubSpotOAuthConfigured(): boolean {
  return getHubSpotConfig() !== null
}

export function buildHubSpotAuthUrl(state: string): string | null {
  const config = getHubSpotConfig()
  if (!config) return null

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: SCOPES,
    state,
  })

  return `${HUBSPOT_AUTH_URL}?${params}`
}

export async function exchangeHubSpotCode(code: string): Promise<HubSpotTokens> {
  const config = getHubSpotConfig()
  if (!config) throw new Error('HubSpot OAuth not configured')

  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }),
  })

  if (!response.ok) {
    throw new Error(`HubSpot token exchange failed: ${response.status}`)
  }

  return response.json() as Promise<HubSpotTokens>
}

export async function refreshHubSpotToken(
  refreshToken: string,
): Promise<HubSpotTokens> {
  const config = getHubSpotConfig()
  if (!config) throw new Error('HubSpot OAuth not configured')

  const response = await fetch(HUBSPOT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error(`HubSpot token refresh failed: ${response.status}`)
  }

  return response.json() as Promise<HubSpotTokens>
}

export async function getValidHubSpotAccessToken(
  integrationId: string,
): Promise<string> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  })
  if (!integration) throw new Error('Integration not found')

  const stillValid =
    integration.expiresAt &&
    integration.expiresAt.getTime() > Date.now() + 60_000

  if (stillValid) return integration.accessToken

  if (!integration.refreshToken) {
    return integration.accessToken
  }

  const tokens = await refreshHubSpotToken(integration.refreshToken)
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? integration.refreshToken,
      expiresAt,
    },
  })

  return tokens.access_token
}

export async function fetchHubSpotPortalId(
  accessToken: string,
): Promise<number> {
  const response = await fetch(
    'https://api.hubapi.com/account-info/v3/details',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!response.ok) {
    throw new Error(`HubSpot account info failed: ${response.status}`)
  }
  const data = (await response.json()) as { portalId: number }
  return data.portalId
}

export function getHubSpotClientSecret(): string | null {
  return process.env.HUBSPOT_CLIENT_SECRET ?? null
}
