import type { FormEvent } from 'react'
import { Cloud, Plug, RefreshCw } from 'lucide-react'
import { CopyableCode } from '../../shared/components/CopyableCode'
import { api } from '../../shared/api/client'
import type { IntegrationStatus } from './types'
import { startOAuth } from './GoogleIntegrationCard'

type SalesforceIntegrationCardProps = {
  status: IntegrationStatus | null
  salesforceToken: string
  salesforceInstanceUrl: string
  salesforceWebhookSecret: string | null
  salesforceConnecting: boolean
  salesforceSyncing: boolean
  setSalesforceToken: (value: string) => void
  setSalesforceInstanceUrl: (value: string) => void
  setSalesforceWebhookSecret: (value: string | null) => void
  setError: (value: string | null) => void
  setMessage: (value: string | null) => void
  setSalesforceConnecting: (value: boolean) => void
  setSalesforceSyncing: (value: boolean) => void
  setWarnings: (value: string[]) => void
  loadStatus: () => void
}

export function SalesforceIntegrationCard({
  status,
  salesforceToken,
  salesforceInstanceUrl,
  salesforceWebhookSecret,
  salesforceConnecting,
  salesforceSyncing,
  setSalesforceToken,
  setSalesforceInstanceUrl,
  setSalesforceWebhookSecret,
  setError,
  setMessage,
  setSalesforceConnecting,
  setSalesforceSyncing,
  setWarnings,
  loadStatus,
}: SalesforceIntegrationCardProps) {
  async function handleConnect(e: FormEvent) {
    e.preventDefault()
    setSalesforceConnecting(true)
    setMessage(null)
    setError(null)
    try {
      const data = await api<{
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
      const result = await api<{
        contactsCreated?: number
        leadsCreated?: number
        dealsCreated?: number
        warnings?: string[]
      }>('/api/integrations/salesforce/sync', { method: 'POST' })
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

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-sky-50 p-3 text-sky-600">
          <Cloud className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Salesforce</h2>
          <p className="mt-1 text-sm text-slate-600">
            Connect via OAuth (recommended) or manual access token.
          </p>

          {status?.salesforce.oauthConfigured && (
            <button
              type="button"
              onClick={() =>
                startOAuth('/api/integrations/salesforce/auth-url', (msg) =>
                  setError(msg),
                )
              }
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
            >
              <Plug className="h-4 w-4" />
              Connect Salesforce (OAuth)
            </button>
          )}

          <form onSubmit={handleConnect} className="mt-4 max-w-lg space-y-3">
            <input
              required
              type="password"
              value={salesforceToken}
              onChange={(e) => setSalesforceToken(e.target.value)}
              placeholder="Access token"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              required
              type="url"
              value={salesforceInstanceUrl}
              onChange={(e) => setSalesforceInstanceUrl(e.target.value)}
              placeholder="https://yourorg.my.salesforce.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            {status?.salesforce.webhookUrl && (
              <div>
                <CopyableCode
                  value={status.salesforce.webhookUrl}
                  label="Salesforce webhook URL"
                />
                {salesforceWebhookSecret && (
                  <div className="mt-2">
                    <CopyableCode
                      value={salesforceWebhookSecret}
                      label="Webhook secret"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={salesforceConnecting}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
              >
                {salesforceConnecting ? 'Connecting...' : 'Connect Salesforce'}
              </button>
              <button
                type="button"
                onClick={syncSalesforce}
                disabled={salesforceSyncing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm"
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
  )
}
