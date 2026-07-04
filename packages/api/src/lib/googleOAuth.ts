import {
  decryptSecret,
  encryptSecret,
} from './secretStore.js'
import { prisma } from './prisma.js'

export type GoogleOAuthConfig = {
  clientId: string
  clientSecret: string
  calendarRedirectUri: string
  gmailRedirectUri: string
}

export function getGoogleRedirectUris() {
  const calendarRedirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    'http://localhost:3001/api/integrations/google/callback'
  const gmailRedirectUri =
    process.env.GMAIL_REDIRECT_URI ??
    process.env.GOOGLE_REDIRECT_URI?.replace(
      '/google/callback',
      '/gmail/callback',
    ) ??
    'http://localhost:3001/api/integrations/gmail/callback'

  return { calendarRedirectUri, gmailRedirectUri }
}

function configFromCredentials(
  clientId: string,
  clientSecret: string,
): GoogleOAuthConfig {
  return {
    clientId,
    clientSecret,
    ...getGoogleRedirectUris(),
  }
}

function getEnvGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return null
  return configFromCredentials(clientId, clientSecret)
}

export function isGoogleOAuthConfiguredInEnv(): boolean {
  return getEnvGoogleOAuthConfig() !== null
}

export async function getGoogleOAuthConfigForOrg(
  organizationId: string,
): Promise<GoogleOAuthConfig | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { googleClientId: true, googleClientSecret: true },
  })

  const clientId = org?.googleClientId?.trim()
  const storedSecret = org?.googleClientSecret?.trim()
  const clientSecret = storedSecret ? decryptSecret(storedSecret) : null
  if (clientId && clientSecret) {
    return configFromCredentials(clientId, clientSecret)
  }

  return getEnvGoogleOAuthConfig()
}

export async function isGoogleOAuthConfiguredForOrg(
  organizationId: string,
): Promise<boolean> {
  return (await getGoogleOAuthConfigForOrg(organizationId)) !== null
}

export async function isAnyGoogleOAuthConfigured(): Promise<boolean> {
  if (isGoogleOAuthConfiguredInEnv()) return true

  const count = await prisma.organization.count({
    where: {
      AND: [
        { googleClientId: { not: null } },
        { googleClientSecret: { not: null } },
        { NOT: { googleClientId: '' } },
        { NOT: { googleClientSecret: '' } },
      ],
    },
  })

  return count > 0
}

export type GoogleOAuthSettings = {
  configured: boolean
  source: 'org' | 'env' | null
  clientId: string | null
  hasClientSecret: boolean
  calendarRedirectUri: string
  gmailRedirectUri: string
}

export async function getGoogleOAuthSettingsForOrg(
  organizationId: string,
): Promise<GoogleOAuthSettings> {
  const uris = getGoogleRedirectUris()
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { googleClientId: true, googleClientSecret: true },
  })

  const orgClientId = org?.googleClientId?.trim() || null
  const orgSecret = org?.googleClientSecret?.trim() || null

  if (orgClientId && orgSecret) {
    return {
      configured: true,
      source: 'org',
      clientId: orgClientId,
      hasClientSecret: true,
      ...uris,
    }
  }

  const envConfig = getEnvGoogleOAuthConfig()
  if (envConfig) {
    return {
      configured: true,
      source: 'env',
      clientId: envConfig.clientId,
      hasClientSecret: true,
      ...uris,
    }
  }

  return {
    configured: false,
    source: null,
    clientId: orgClientId,
    hasClientSecret: Boolean(orgSecret),
    ...uris,
  }
}
