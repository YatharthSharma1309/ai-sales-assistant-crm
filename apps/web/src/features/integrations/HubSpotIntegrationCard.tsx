import type { FormEvent } from 'react'
import { Download, Plug, RefreshCw } from 'lucide-react'
import { CopyableCode } from '../../shared/components/CopyableCode'
import { api } from '../../shared/api/client'
import type { IntegrationStatus } from './types'
import { startOAuth } from './GoogleIntegrationCard'

type HubSpotIntegrationCardProps = {
  status: IntegrationStatus | null
  hubspotToken: string
  hubspotConnecting: boolean
  hubspotSyncing: boolean
  setHubspotToken: (value: string) => void
  setError: (value: string | null) => void
  setMessage: (value: string | null) => void
  setHubspotConnecting: (value: boolean) => void
  setHubspotSyncing: (value: boolean) => void
  setWarnings: (value: string[]) => void
  loadStatus: () => void
}

export function HubSpotIntegrationCard({
  status,
  hubspotToken,
  hubspotConnecting,
  hubspotSyncing,
  setHubspotToken,
  setError,
  setMessage,
  setHubspotConnecting,
  setHubspotSyncing,
  setWarnings,
  loadStatus,
}: HubSpotIntegrationCardProps) {
  async function handleConnect(e: FormEvent) {
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
      const result = await api<{
        contactsCreated?: number
        leadsCreated?: number
        dealsCreated?: number
        warnings?: string[]
      }>('/api/integrations/hubspot/sync', { method: 'POST' })
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
          <Download className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">HubSpot</h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect via OAuth or private app token. Sync contacts and deals with
            live webhooks.
          </p>

          {status?.hubspot.oauthConfigured && (
            <button
              type="button"
              onClick={() =>
                startOAuth('/api/integrations/hubspot/auth-url', (msg) =>
                  setError(msg),
                )
              }
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
            >
              <Plug className="h-4 w-4" />
              Connect HubSpot (OAuth)
            </button>
          )}

          {status?.hubspot.webhookUrl && (
            <div className="mt-4">
              <CopyableCode
                value={status.hubspot.webhookUrl}
                label="HubSpot webhook URL"
              />
            </div>
          )}

          <form onSubmit={handleConnect} className="mt-4 max-w-lg">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Private app token
            </label>
            <input
              required
              type="password"
              value={hubspotToken}
              onChange={(e) => setHubspotToken(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={hubspotConnecting}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
              >
                {hubspotConnecting ? 'Connecting...' : 'Connect HubSpot'}
              </button>
              <button
                type="button"
                onClick={syncHubspot}
                disabled={hubspotSyncing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm"
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
  )
}
