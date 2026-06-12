import { prisma } from './prisma.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
].join(' ')

type GoogleTokens = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

export type GmailMessage = {
  id: string
  threadId: string
  subject: string
  from: string
  to: string
  date: string
  snippet: string
  body: string
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GMAIL_REDIRECT_URI ??
    process.env.GOOGLE_REDIRECT_URI?.replace(
      '/google/callback',
      '/gmail/callback',
    ) ??
    'http://localhost:3001/api/integrations/gmail/callback'

  if (!clientId || !clientSecret) return null
  return { clientId, clientSecret, redirectUri }
}

export function isGmailConfigured(): boolean {
  return getGoogleConfig() !== null
}

export function buildGmailAuthUrl(state: string): string | null {
  const config = getGoogleConfig()
  if (!config) return null

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })

  return `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeGmailCode(code: string): Promise<GoogleTokens> {
  const config = getGoogleConfig()
  if (!config) throw new Error('Gmail OAuth not configured')

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    throw new Error(`Gmail token exchange failed: ${response.status}`)
  }

  return response.json() as Promise<GoogleTokens>
}

async function refreshGmailToken(refreshToken: string): Promise<GoogleTokens> {
  const config = getGoogleConfig()
  if (!config) throw new Error('Gmail OAuth not configured')

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error(`Gmail token refresh failed: ${response.status}`)
  }

  return response.json() as Promise<GoogleTokens>
}

export async function getValidGmailAccessToken(
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
    throw new Error('Gmail token expired — reconnect inbox')
  }

  const tokens = await refreshGmailToken(integration.refreshToken)
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: tokens.access_token,
      expiresAt,
    },
  })

  return tokens.access_token
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf-8')
}

function extractHeader(
  headers: { name: string; value: string }[],
  name: string,
): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function extractBody(payload: {
  mimeType?: string
  body?: { data?: string }
  parts?: { mimeType?: string; body?: { data?: string } }[]
}): string {
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  for (const part of payload.parts ?? []) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data)
    }
  }
  for (const part of payload.parts ?? []) {
    if (part.mimeType === 'text/html' && part.body?.data) {
      return decodeBase64Url(part.body.data)
    }
  }
  return ''
}

export async function fetchRecentGmailMessages(
  accessToken: string,
  maxResults = 25,
): Promise<GmailMessage[]> {
  const listResponse = await fetch(
    `${GMAIL_API}/users/me/messages?maxResults=${maxResults}&q=in:inbox newer_than:7d`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!listResponse.ok) {
    throw new Error(`Gmail list error: ${listResponse.status}`)
  }

  const list = (await listResponse.json()) as {
    messages?: { id: string; threadId: string }[]
  }

  const messages: GmailMessage[] = []

  for (const item of list.messages ?? []) {
    const detailResponse = await fetch(
      `${GMAIL_API}/users/me/messages/${item.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    if (!detailResponse.ok) continue

    const detail = (await detailResponse.json()) as {
      id: string
      threadId: string
      snippet?: string
      payload?: {
        headers?: { name: string; value: string }[]
        mimeType?: string
        body?: { data?: string }
        parts?: { mimeType?: string; body?: { data?: string } }[]
      }
    }

    const headers = detail.payload?.headers ?? []
    messages.push({
      id: item.id,
      threadId: detail.threadId,
      subject: extractHeader(headers, 'Subject') || '(no subject)',
      from: extractHeader(headers, 'From'),
      to: extractHeader(headers, 'To'),
      date: extractHeader(headers, 'Date'),
      snippet: detail.snippet ?? '',
      body: extractBody(detail.payload ?? {}),
    })
  }

  return messages
}
