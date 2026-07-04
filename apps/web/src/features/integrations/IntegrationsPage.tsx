import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Calendar, Cloud, Download, Mail, Plug, RefreshCw, Unplug } from 'lucide-react'
import { PageHeader } from '../../shared/components/PageHeader'
import { CopyableCode } from '../../shared/components/CopyableCode'
import { useRole } from '../../shared/hooks/useRole'
import { api } from '../../shared/api/client'

type GoogleOAuthSettings = {
  configured: boolean
  source: 'org' | 'env' | null
  clientId: string | null
  hasClientSecret: boolean
  calendarRedirectUri: string
  gmailRedirectUri: string
}

type IntegrationStatus = {
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
    connected?: boolean
    webhookUrl?: string
  }
  gmail?: {
    configured: boolean
    connected: boolean
    autoSyncEnabled: boolean
  }
}

type ImportResult = {
  accountsCreated: number
  contactsCreated: number
  leadsCreated: number
  dealsCreated: number
  leadsSkipped?: number
  dealsSkipped?: number
  warnings?: string[]
}

type EmailLogConfig = {
  address: string
  token?: string
}

type ImportSource = 'hubspot' | 'salesforce'
type ImportKind =
  | 'contacts'
  | 'deals'
  | 'leads'
  | 'opportunities'

export function IntegrationsPage() {
  const { isAdmin, isManager } = useRole()
  const [searchParams, setSearchParams] = useSearchParams()
  const [status, setStatus] = useState<IntegrationStatus | null>(null)
  const [emailLogAddress, setEmailLogAddress] = useState<string | null>(null)
  const [emailLogToken, setEmailLogToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [hubspotSyncing, setHubspotSyncing] = useState(false)
  const [salesforceSyncing, setSalesforceSyncing] = useState(false)
  const [hubspotConnecting, setHubspotConnecting] = useState(false)
  const [salesforceConnecting, setSalesforceConnecting] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [hubspotToken, setHubspotToken] = useState('')
  const [salesforceToken, setSalesforceToken] = useState('')
  const [salesforceInstanceUrl, setSalesforceInstanceUrl] = useState('')
  const [salesforceWebhookSecret, setSalesforceWebhookSecret] = useState<string | null>(null)
  const [gmailSyncing, setGmailSyncing] = useState(false)
  const [googleClientId, setGoogleClientId] = useState('')
  const [googleClientSecret, setGoogleClientSecret] = useState('')
  const [googleConfigSaving, setGoogleConfigSaving] = useState(false)

  const canManageIntegrations = isAdmin || isManager
  const googleConfigured = status?.googleCalendar.configured ?? false
  const googleOAuth = status?.googleOAuth

  const loadStatus = useCallback(async () => {
    try {
      const data = await api<IntegrationStatus>('/api/integrations/status')
      setStatus(data)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadEmailLog = useCallback(async () => {
    try {
      const data = await api<EmailLogConfig>('/api/organization/email-log')
      setEmailLogAddress(data.address)
      setEmailLogToken(data.token ?? null)
    } catch {
      setEmailLogAddress(null)
      setEmailLogToken(null)
    }
  }, [])

  useEffect(() => {
    loadStatus()
    loadEmailLog()
  }, [loadStatus, loadEmailLog])

  useEffect(() => {
    const connected = searchParams.get('connected')
    const oauthError = searchParams.get('error')

    if (connected === 'google') {
      setMessage('Google Calendar connected successfully.')
      setSearchParams({}, { replace: true })
      loadStatus()
    } else if (connected === 'hubspot') {
      setMessage('HubSpot connected via OAuth.')
      setSearchParams({}, { replace: true })
      loadStatus()
    } else if (connected === 'gmail') {
      setMessage('Gmail inbox connected successfully.')
      setSearchParams({}, { replace: true })
      loadStatus()
    } else if (oauthError) {
      setError('OAuth connection failed. Please try again.')
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, loadStatus])

  useEffect(() => {
    if (googleOAuth?.clientId) {
      setGoogleClientId(googleOAuth.clientId)
    }
  }, [googleOAuth?.clientId])

  async function handleGoogleConfigSave(e: FormEvent) {
    e.preventDefault()
    setGoogleConfigSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api<GoogleOAuthSettings>('/api/integrations/google/config', {
        method: 'POST',
        body: JSON.stringify({
          clientId: googleClientId,
          clientSecret: googleClientSecret,
        }),
      })
      setGoogleClientSecret('')
      setMessage('Google OAuth credentials saved for this workspace.')
      loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save Google OAuth credentials')
    } finally {
      setGoogleConfigSaving(false)
    }
  }

  async function handleGoogleConfigRemove() {
    setGoogleConfigSaving(true)
    setMessage(null)
    setError(null)
    try {
      await api('/api/integrations/google/config', { method: 'DELETE' })
      setGoogleClientSecret('')
      setMessage('Workspace Google OAuth credentials removed.')
      loadStatus()
    } catch {
      setError('Failed to remove Google OAuth credentials')
    } finally {
      setGoogleConfigSaving(false)
    }
  }

  async function connectGoogle() {
    setError(null)
    try {
      const { url } = await api<{ url: string }>('/api/integrations/google/auth-url')
      window.location.href = url
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not start Google OAuth',
      )
    }
  }

  async function syncCalendar() {
    setSyncing(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api<{ synced: number; created: number; skipped: number }>(
        '/api/integrations/google/sync',
        { method: 'POST' },
      )
      setMessage(
        `Synced ${result.synced} events — ${result.created} new meetings added (${result.skipped} already imported).`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function disconnectGoogle() {
    setError(null)
    try {
      await api('/api/integrations/google', { method: 'DELETE' })
      setMessage('Google Calendar disconnected.')
      loadStatus()
    } catch {
      setError('Failed to disconnect')
    }
  }

  async function connectHubSpotOAuth() {
    setError(null)
    try {
      const { url } = await api<{ url: string }>('/api/integrations/hubspot/auth-url')
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start HubSpot OAuth')
    }
  }

  async function connectGmail() {
    setError(null)
    try {
      const { url } = await api<{ url: string }>('/api/integrations/gmail/auth-url')
      window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Gmail OAuth')
    }
  }

  async function syncGmail() {
    setGmailSyncing(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api<{ scanned: number; created: number; skipped: number }>(
        '/api/integrations/gmail/sync',
        { method: 'POST' },
      )
      setMessage(
        `Gmail sync: ${result.created} emails logged (${result.skipped} skipped, ${result.scanned} scanned).`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gmail sync failed')
    } finally {
      setGmailSyncing(false)
    }
  }

  async function disconnectGmail() {
    try {
      await api('/api/integrations/gmail', { method: 'DELETE' })
      setMessage('Gmail disconnected.')
      loadStatus()
    } catch {
      setError('Failed to disconnect Gmail')
    }
  }

  async function handleHubspotConnect(e: FormEvent) {
    e.preventDefault()
    setHubspotConnecting(true)
    setMessage(null)
    setError(null)
    try {
      await api('/api/integrations/hubspot/connect', {
        method: 'POST',
        body: JSON.stringify({ accessToken: hubspotToken }),
      })
      setHubspotToken('')
      setMessage('HubSpot connected successfully.')
      loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect HubSpot')
    } finally {
      setHubspotConnecting(false)
    }
  }

  async function syncHubspot() {
    setHubspotSyncing(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api<ImportResult>('/api/integrations/hubspot/sync', {
        method: 'POST',
      })
      const parts = [
        result.contactsCreated && `${result.contactsCreated} contacts`,
        result.leadsCreated && `${result.leadsCreated} leads`,
        result.dealsCreated && `${result.dealsCreated} deals`,
      ].filter(Boolean)
      setMessage(`HubSpot sync complete: ${parts.join(', ') || 'no new records'}.`)
      if (result.warnings?.length) setWarnings(result.warnings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'HubSpot sync failed')
    } finally {
      setHubspotSyncing(false)
    }
  }

  async function handleSalesforceConnect(e: FormEvent) {
    e.preventDefault()
    setSalesforceConnecting(true)
    setMessage(null)
    setError(null)
    try {
      const data = await api<{
        connected: boolean
        webhookUrl?: string
        webhookSecret?: string
      }>('/api/integrations/salesforce/connect', {
        method: 'POST',
        body: JSON.stringify({
          accessToken: salesforceToken,
          instanceUrl: salesforceInstanceUrl,
        }),
      })
      setSalesforceToken('')
      if (data.webhookSecret) setSalesforceWebhookSecret(data.webhookSecret)
      setMessage('Salesforce connected successfully.')
      loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Salesforce')
    } finally {
      setSalesforceConnecting(false)
    }
  }

  async function syncSalesforce() {
    setSalesforceSyncing(true)
    setMessage(null)
    setError(null)
    try {
      const result = await api<ImportResult>('/api/integrations/salesforce/sync', {
        method: 'POST',
      })
      const parts = [
        result.contactsCreated && `${result.contactsCreated} contacts`,
        result.leadsCreated && `${result.leadsCreated} leads`,
        result.dealsCreated && `${result.dealsCreated} deals`,
      ].filter(Boolean)
      setMessage(`Salesforce sync complete: ${parts.join(', ') || 'no new records'}.`)
      if (result.warnings?.length) setWarnings(result.warnings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Salesforce sync failed')
    } finally {
      setSalesforceSyncing(false)
    }
  }

  async function importCsv(
    source: ImportSource,
    kind: ImportKind,
    file: File,
  ) {
    const key = `${source}-${kind}`
    setImporting(key)
    setMessage(null)
    setWarnings([])
    setError(null)

    const endpoint =
      source === 'hubspot'
        ? '/api/integrations/hubspot/import-csv'
        : '/api/integrations/salesforce/import-csv'

    try {
      const csv = await file.text()
      const result = await api<ImportResult>(endpoint, {
        method: 'POST',
        body: JSON.stringify({ type: kind, csv }),
      })
      const parts = [
        result.contactsCreated && `${result.contactsCreated} contacts`,
        result.leadsCreated && `${result.leadsCreated} leads`,
        result.leadsSkipped && `${result.leadsSkipped} leads skipped`,
        result.accountsCreated && `${result.accountsCreated} accounts`,
        result.dealsCreated && `${result.dealsCreated} deals`,
        result.dealsSkipped && `${result.dealsSkipped} deals skipped`,
      ].filter(Boolean)
      const label = source === 'hubspot' ? 'HubSpot' : 'Salesforce'
      setMessage(`${label} import complete: ${parts.join(', ')}.`)
      if (result.warnings?.length) {
        setWarnings(result.warnings)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(null)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-slate-500">Loading integrations...</div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Integrations"
        description="Connect external tools to sync data into your CRM."
      />

      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Import warnings</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
            <Calendar className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Google Calendar &amp; Gmail
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Connect your Google account to sync calendar meetings and inbox
              emails into the CRM timeline. Calendar and Gmail share one OAuth
              app.
            </p>

            {canManageIntegrations && googleOAuth && (
              <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                {googleOAuth.source === 'env' ? (
                  <p className="text-sm text-slate-600">
                    Google OAuth is configured on the server. Team members can
                    connect their accounts below.
                  </p>
                ) : !googleOAuth.configured ? (
                  <>
                    <p className="text-sm text-slate-600">
                      Add your Google Cloud OAuth client ID and secret. Create
                      them in Google Cloud Console with Calendar API and Gmail
                      API enabled.
                    </p>
                    <form
                      onSubmit={handleGoogleConfigSave}
                      className="max-w-lg space-y-3"
                    >
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Client ID
                        </label>
                        <input
                          required
                          type="text"
                          value={googleClientId}
                          onChange={(e) => setGoogleClientId(e.target.value)}
                          placeholder="123456789-abc.apps.googleusercontent.com"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Client secret
                        </label>
                        <input
                          required
                          type="password"
                          value={googleClientSecret}
                          onChange={(e) => setGoogleClientSecret(e.target.value)}
                          placeholder="GOCSPX-..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={googleConfigSaving}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {googleConfigSaving ? 'Saving...' : 'Save Google OAuth'}
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-emerald-700">
                      OAuth configured for this workspace
                      {googleOAuth.clientId ? ` (${googleOAuth.clientId})` : ''}.
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleConfigRemove}
                      disabled={googleConfigSaving}
                      className="text-sm font-medium text-slate-600 underline hover:text-slate-900 disabled:opacity-50"
                    >
                      Remove workspace credentials
                    </button>
                  </div>
                )}

                <CopyableCode
                  value={googleOAuth.calendarRedirectUri}
                  label="Calendar redirect URI (add in Google Cloud)"
                />
                <CopyableCode
                  value={googleOAuth.gmailRedirectUri}
                  label="Gmail redirect URI (add in Google Cloud)"
                />
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Google Calendar
              </h3>
              {status?.googleCalendar.autoSyncEnabled && (
                <p className="mt-1 text-xs text-emerald-700">
                  Auto-sync enabled — server syncs every{' '}
                  {status.googleCalendar.autoSyncIntervalMinutes} minute(s).
                </p>
              )}

              {!googleConfigured ? (
                <p className="mt-2 text-sm text-slate-500">
                  {canManageIntegrations
                    ? 'Save Google OAuth credentials above to enable Calendar sync.'
                    : 'Ask a manager to configure Google OAuth for this workspace.'}
                </p>
              ) : status?.googleCalendar.connected ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={syncCalendar}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                    />
                    {syncing ? 'Syncing...' : 'Sync now'}
                  </button>
                  <button
                    type="button"
                    onClick={disconnectGoogle}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Unplug className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connectGoogle}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plug className="h-4 w-4" />
                  Connect Google Calendar
                </button>
              )}
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <h3 className="text-sm font-semibold text-slate-900">Gmail Inbox</h3>
              {status?.gmail?.autoSyncEnabled && (
                <p className="mt-1 text-xs text-emerald-700">
                  Auto-sync enabled on server.
                </p>
              )}

              {!googleConfigured ? (
                <p className="mt-2 text-sm text-slate-500">
                  {canManageIntegrations
                    ? 'Save Google OAuth credentials above to enable Gmail sync.'
                    : 'Ask a manager to configure Google OAuth for this workspace.'}
                </p>
              ) : status?.gmail?.connected ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={syncGmail}
                    disabled={gmailSyncing}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${gmailSyncing ? 'animate-spin' : ''}`}
                    />
                    {gmailSyncing ? 'Syncing...' : 'Sync inbox'}
                  </button>
                  <button
                    type="button"
                    onClick={disconnectGmail}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Unplug className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connectGmail}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  <Plug className="h-4 w-4" />
                  Connect Gmail
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
            <Mail className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Email BCC logging
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              BCC this address on outbound emails to automatically log them as
              activities in your CRM.
            </p>
            {emailLogAddress ? (
              <div className="mt-4 space-y-4">
                <CopyableCode value={emailLogAddress} label="BCC address" />
                {isAdmin && emailLogToken ? (
                  <CopyableCode
                    value={emailLogToken}
                    label="Verification token (include in email subject or body)"
                  />
                ) : !isAdmin ? (
                  <p className="text-sm text-slate-500">
                    Contact your workspace admin for the verification token
                    required to log emails.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Email logging address is not available.
              </p>
            )}
          </div>
        </div>
      </section>

      {isManager && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
                <Download className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900">HubSpot</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Connect via OAuth (recommended) or a private app token. Sync
                  contacts and deals, with bidirectional webhooks for live updates.
                </p>

                {status?.hubspot.oauthConfigured && (
                  <button
                    type="button"
                    onClick={connectHubSpotOAuth}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                  >
                    <Plug className="h-4 w-4" />
                    Connect HubSpot (OAuth)
                  </button>
                )}

                {status?.hubspot.webhookUrl && (
                  <div className="mt-4">
                    <CopyableCode
                      value={status.hubspot.webhookUrl}
                      label="HubSpot webhook URL (configure in HubSpot app settings)"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Subscribe to contact.creation, contact.propertyChange,
                      deal.creation, and deal.propertyChange events.
                    </p>
                  </div>
                )}

                <form onSubmit={handleHubspotConnect} className="mt-4 max-w-lg">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Private app token
                  </label>
                  <input
                    required
                    type="password"
                    value={hubspotToken}
                    onChange={(e) => setHubspotToken(e.target.value)}
                    placeholder="pat-na1-..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={hubspotConnecting}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                      {hubspotConnecting ? 'Connecting...' : 'Connect HubSpot'}
                    </button>
                    <button
                      type="button"
                      onClick={syncHubspot}
                      disabled={hubspotSyncing}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${hubspotSyncing ? 'animate-spin' : ''}`}
                      />
                      {hubspotSyncing ? 'Syncing...' : 'Sync from HubSpot'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <ImportSection
            title="HubSpot CSV Import"
            icon={<Download className="h-6 w-6" />}
            iconClass="bg-orange-50 text-orange-600"
            description="Export contacts or deals from HubSpot as CSV and import them into accounts, contacts, leads, and pipeline."
            buttons={[
              {
                label: 'Import Contacts CSV',
                key: 'hubspot-contacts',
                onFile: (f) => importCsv('hubspot', 'contacts', f),
              },
              {
                label: 'Import Deals CSV',
                key: 'hubspot-deals',
                onFile: (f) => importCsv('hubspot', 'deals', f),
              },
            ]}
            hint="Contacts: First Name, Last Name, Email, Company Name. Deals: Deal Name, Stage, Amount, Close Date."
            importing={importing}
          />

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-sky-50 p-3 text-sky-600">
                <Cloud className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-900">Salesforce</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Connect with an access token and instance URL, then sync records
                  from Salesforce.
                </p>

                <form onSubmit={handleSalesforceConnect} className="mt-4 max-w-lg space-y-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Access token
                    </label>
                    <input
                      required
                      type="password"
                      value={salesforceToken}
                      onChange={(e) => setSalesforceToken(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Instance URL
                    </label>
                    <input
                      required
                      type="url"
                      value={salesforceInstanceUrl}
                      onChange={(e) => setSalesforceInstanceUrl(e.target.value)}
                      placeholder="https://yourorg.my.salesforce.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                {status?.salesforce.webhookUrl && (
                  <div className="mt-4">
                    <CopyableCode
                      value={status.salesforce.webhookUrl}
                      label="Salesforce webhook URL"
                    />
                    {salesforceWebhookSecret && (
                      <div className="mt-2">
                        <CopyableCode
                          value={salesforceWebhookSecret}
                          label="Webhook secret (header: x-salesforce-webhook-secret)"
                        />
                      </div>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      Use a Salesforce Flow or Apex callout to POST record changes
                      with type Contact, Lead, or Opportunity.
                    </p>
                  </div>
                )}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={salesforceConnecting}
                      className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                    >
                      {salesforceConnecting ? 'Connecting...' : 'Connect Salesforce'}
                    </button>
                    <button
                      type="button"
                      onClick={syncSalesforce}
                      disabled={salesforceSyncing}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${salesforceSyncing ? 'animate-spin' : ''}`}
                      />
                      {salesforceSyncing ? 'Syncing...' : 'Sync from Salesforce'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <ImportSection
            title="Salesforce CSV Import"
            icon={<Cloud className="h-6 w-6" />}
            iconClass="bg-sky-50 text-sky-600"
            description="Export contacts, leads, or opportunities from Salesforce reports as CSV."
            buttons={[
              {
                label: 'Import Contacts CSV',
                key: 'salesforce-contacts',
                onFile: (f) => importCsv('salesforce', 'contacts', f),
              },
              {
                label: 'Import Leads CSV',
                key: 'salesforce-leads',
                onFile: (f) => importCsv('salesforce', 'leads', f),
              },
              {
                label: 'Import Opportunities CSV',
                key: 'salesforce-opportunities',
                onFile: (f) => importCsv('salesforce', 'opportunities', f),
              },
            ]}
            hint="Contacts: FirstName, LastName, Email, Account Name. Leads: Company, Email, Lead Source. Opportunities: Opportunity Name, Stage, Amount, Close Date."
            importing={importing}
          />
        </>
      )}
    </div>
  )
}

function ImportSection({
  title,
  icon,
  iconClass,
  description,
  buttons,
  hint,
  importing,
}: {
  title: string
  icon: ReactNode
  iconClass: string
  description: string
  buttons: { label: string; key: string; onFile: (file: File) => void }[]
  hint: string
  importing: string | null
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${iconClass}`}>{icon}</div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{description}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            {buttons.map(({ label, key, onFile }) => (
              <label
                key={key}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={importing !== null}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onFile(file)
                    e.target.value = ''
                  }}
                />
                {importing === key ? 'Importing...' : label}
              </label>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-500">{hint}</p>
        </div>
      </div>
    </section>
  )
}
