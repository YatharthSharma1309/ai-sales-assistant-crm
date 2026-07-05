import { Calendar, Mail } from 'lucide-react'
import { CopyableCode } from '../../shared/components/CopyableCode'
import { api } from '../../shared/api/client'
import type { FormEvent } from 'react'
import { Plug, RefreshCw, Unplug } from 'lucide-react'
import type { IntegrationStatus } from './types'

type GoogleIntegrationCardProps = {
  status: IntegrationStatus | null
  canManageIntegrations: boolean
  googleClientId: string
  googleClientSecret: string
  googleConfigSaving: boolean
  syncing: boolean
  gmailSyncing: boolean
  onGoogleClientIdChange: (value: string) => void
  onGoogleClientSecretChange: (value: string) => void
  onGoogleConfigSave: (e: FormEvent) => void
  onGoogleConfigRemove: () => void
  onConnectCalendar: () => void
  onSyncCalendar: () => void
  onDisconnectCalendar: () => void
  onConnectGmail: () => void
  onSyncGmail: () => void
  onDisconnectGmail: () => void
}

export function GoogleIntegrationCard({
  status,
  canManageIntegrations,
  googleClientId,
  googleClientSecret,
  googleConfigSaving,
  syncing,
  gmailSyncing,
  onGoogleClientIdChange,
  onGoogleClientSecretChange,
  onGoogleConfigSave,
  onGoogleConfigRemove,
  onConnectCalendar,
  onSyncCalendar,
  onDisconnectCalendar,
  onConnectGmail,
  onSyncGmail,
  onDisconnectGmail,
}: GoogleIntegrationCardProps) {
  const googleOAuth = status?.googleOAuth
  const googleConfigured = status?.googleCalendar.configured ?? false

  return (
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
            Connect your Google account to sync calendar meetings and inbox emails
            into the CRM timeline.
          </p>

          {canManageIntegrations && googleOAuth && (
            <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
              {googleOAuth.source === 'env' ? (
                <p className="text-sm text-slate-600">
                  Google OAuth is configured on the server.
                </p>
              ) : !googleOAuth.configured ? (
                <form onSubmit={onGoogleConfigSave} className="max-w-lg space-y-3">
                  <input
                    required
                    type="text"
                    value={googleClientId}
                    onChange={(e) => onGoogleClientIdChange(e.target.value)}
                    placeholder="Google client ID"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <input
                    required
                    type="password"
                    value={googleClientSecret}
                    onChange={(e) => onGoogleClientSecretChange(e.target.value)}
                    placeholder="Google client secret"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={googleConfigSaving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                  >
                    {googleConfigSaving ? 'Saving...' : 'Save Google OAuth'}
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={onGoogleConfigRemove}
                  className="text-sm text-slate-600 underline"
                >
                  Remove workspace credentials
                </button>
              )}
              <CopyableCode
                value={googleOAuth.calendarRedirectUri}
                label="Calendar redirect URI"
              />
              <CopyableCode
                value={googleOAuth.gmailRedirectUri}
                label="Gmail redirect URI"
              />
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Google Calendar</h3>
            {googleConfigured && status?.googleCalendar.connected ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSyncCalendar}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync now'}
                </button>
                <button
                  type="button"
                  onClick={onDisconnectCalendar}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm"
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectCalendar}
                disabled={!googleConfigured}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Plug className="h-4 w-4" />
                Connect Google Calendar
              </button>
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Gmail Inbox</h3>
            {googleConfigured && status?.gmail?.connected ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onSyncGmail}
                  disabled={gmailSyncing}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${gmailSyncing ? 'animate-spin' : ''}`}
                  />
                  {gmailSyncing ? 'Syncing...' : 'Sync inbox'}
                </button>
                <button
                  type="button"
                  onClick={onDisconnectGmail}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm"
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onConnectGmail}
                disabled={!googleConfigured}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                <Plug className="h-4 w-4" />
                Connect Gmail
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function EmailLogCard({
  emailLogAddress,
  emailLogToken,
  isAdmin,
  onRegenerate,
  regenerating,
}: {
  emailLogAddress: string | null
  emailLogToken: string | null
  isAdmin: boolean
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-violet-50 p-3 text-violet-600">
          <Mail className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-900">Email BCC logging</h2>
          <p className="mt-1 text-sm text-slate-600">
            BCC this address on outbound emails to log them in your CRM.
          </p>
          {emailLogAddress ? (
            <div className="mt-4 space-y-4">
              <CopyableCode value={emailLogAddress} label="BCC address" />
              {isAdmin && emailLogToken && (
                <CopyableCode value={emailLogToken} label="Verification token" />
              )}
              {isAdmin && onRegenerate && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  disabled={regenerating}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Regenerating...' : 'Regenerate BCC address'}
                </button>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Email logging address is not available.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export async function startOAuth(urlPath: string, setError: (msg: string) => void) {
  try {
    const { url } = await api<{ url: string }>(urlPath)
    window.location.href = url
  } catch (err) {
    setError(err instanceof Error ? err.message : 'OAuth failed')
  }
}
