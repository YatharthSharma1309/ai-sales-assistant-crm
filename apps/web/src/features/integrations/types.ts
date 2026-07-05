export type GoogleOAuthSettings = {
  configured: boolean
  source: 'org' | 'env' | null
  clientId: string | null
  hasClientSecret: boolean
  calendarRedirectUri: string
  gmailRedirectUri: string
}

export type IntegrationStatus = {
  googleCalendar: {
    configured: boolean
    connected: boolean
    autoSyncEnabled?: boolean
    autoSyncIntervalMinutes?: number
  }
  googleOAuth?: GoogleOAuthSettings
  hubspot: {
    importAvailable: boolean
    oauthConfigured?: boolean
    connected?: boolean
    webhookUrl?: string
  }
  salesforce: {
    importAvailable: boolean
    oauthConfigured?: boolean
    connected?: boolean
    webhookUrl?: string
  }
  gmail?: {
    configured: boolean
    connected: boolean
    autoSyncEnabled: boolean
  }
}

export type ImportResult = {
  accountsCreated: number
  contactsCreated: number
  leadsCreated: number
  dealsCreated: number
  leadsSkipped?: number
  dealsSkipped?: number
  warnings?: string[]
}

export type EmailLogConfig = {
  address: string
  token?: string
}

export type ImportSource = 'hubspot' | 'salesforce'
export type ImportKind = 'contacts' | 'deals' | 'leads' | 'opportunities'
