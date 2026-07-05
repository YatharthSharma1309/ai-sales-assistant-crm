const SALESFORCE_AUTH_URL =
  process.env.SALESFORCE_LOGIN_URL ??
  'https://login.salesforce.com/services/oauth2/authorize'
const SALESFORCE_TOKEN_URL =
  process.env.SALESFORCE_TOKEN_URL ??
  'https://login.salesforce.com/services/oauth2/token'

type SalesforceTokens = {
  access_token: string
  refresh_token?: string
  instance_url: string
  id?: string
  issued_at?: string
}

function getSalesforceConfig() {
  const clientId = process.env.SALESFORCE_CLIENT_ID
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET
  const redirectUri =
    process.env.SALESFORCE_REDIRECT_URI ??
    'http://localhost:3001/api/integrations/salesforce/callback'

  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, redirectUri }
}

export function isSalesforceOAuthConfigured(): boolean {
  return getSalesforceConfig() !== null
}

export function buildSalesforceAuthUrl(state: string): string | null {
  const config = getSalesforceConfig()
  if (!config) return null

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    state,
    scope: 'api refresh_token offline_access',
  })

  return `${SALESFORCE_AUTH_URL}?${params}`
}

export async function exchangeSalesforceCode(
  code: string,
): Promise<SalesforceTokens> {
  const config = getSalesforceConfig()
  if (!config) throw new Error('Salesforce OAuth not configured')

  const response = await fetch(SALESFORCE_TOKEN_URL, {
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
    const body = await response.text()
    throw new Error(`Salesforce token exchange failed: ${response.status} ${body}`)
  }

  return response.json() as Promise<SalesforceTokens>
}

export async function refreshSalesforceToken(
  refreshToken: string,
): Promise<SalesforceTokens> {
  const config = getSalesforceConfig()
  if (!config) throw new Error('Salesforce OAuth not configured')

  const response = await fetch(SALESFORCE_TOKEN_URL, {
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
    throw new Error(`Salesforce token refresh failed: ${response.status}`)
  }

  return response.json() as Promise<SalesforceTokens>
}

export async function getValidSalesforceAccessToken(integrationId: string) {
  const { prisma } = await import('./prisma.js')
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  })
  if (!integration) throw new Error('Salesforce integration not found')

  const metadata = integration.metadata as {
    instanceUrl?: string
    authMethod?: string
  } | null

  if (
    integration.expiresAt &&
    integration.expiresAt.getTime() > Date.now() + 60_000
  ) {
    return {
      accessToken: integration.accessToken,
      instanceUrl: metadata?.instanceUrl ?? '',
    }
  }

  if (!integration.refreshToken) {
    return {
      accessToken: integration.accessToken,
      instanceUrl: metadata?.instanceUrl ?? '',
    }
  }

  const tokens = await refreshSalesforceToken(integration.refreshToken)
  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? integration.refreshToken,
      metadata: {
        ...metadata,
        instanceUrl: tokens.instance_url,
        authMethod: 'oauth',
      },
    },
  })

  return {
    accessToken: tokens.access_token,
    instanceUrl: tokens.instance_url,
  }
}
