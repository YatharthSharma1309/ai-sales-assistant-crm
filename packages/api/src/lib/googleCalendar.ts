import { prisma } from './prisma.js'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

type GoogleTokens = {
  access_token: string
  refresh_token?: string
  expires_in: number
}

export type CalendarEvent = {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  attendees: string[]
  htmlLink?: string
}

function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    'http://localhost:3001/api/integrations/google/callback'

  if (!clientId || !clientSecret) {
    return null
  }

  return { clientId, clientSecret, redirectUri }
}

export function isGoogleCalendarConfigured(): boolean {
  return getGoogleConfig() !== null
}

export function buildGoogleAuthUrl(state: string): string | null {
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

export async function exchangeGoogleCode(
  code: string,
): Promise<GoogleTokens> {
  const config = getGoogleConfig()
  if (!config) throw new Error('Google Calendar not configured')

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
    throw new Error(`Google token exchange failed: ${response.status}`)
  }

  return response.json() as Promise<GoogleTokens>
}

export async function refreshGoogleToken(
  refreshToken: string,
): Promise<GoogleTokens> {
  const config = getGoogleConfig()
  if (!config) throw new Error('Google Calendar not configured')

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
    throw new Error(`Google token refresh failed: ${response.status}`)
  }

  return response.json() as Promise<GoogleTokens>
}

export async function getValidAccessToken(
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
    throw new Error('Google token expired — reconnect calendar')
  }

  const tokens = await refreshGoogleToken(integration.refreshToken)
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

export async function fetchUpcomingEvents(
  accessToken: string,
  days = 14,
): Promise<CalendarEvent[]> {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(
    Date.now() + days * 24 * 60 * 60 * 1000,
  ).toISOString()

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  })

  const response = await fetch(
    `${CALENDAR_API}/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )

  if (!response.ok) {
    throw new Error(`Calendar API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    items?: {
      id: string
      summary?: string
      description?: string
      htmlLink?: string
      start?: { dateTime?: string; date?: string }
      end?: { dateTime?: string; date?: string }
      attendees?: { email?: string }[]
    }[]
  }

  return (data.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? 'Untitled event',
    description: item.description,
    start: item.start?.dateTime ?? item.start?.date ?? '',
    end: item.end?.dateTime ?? item.end?.date ?? '',
    htmlLink: item.htmlLink,
    attendees: (item.attendees ?? [])
      .map((a) => a.email)
      .filter((e): e is string => Boolean(e)),
  }))
}
