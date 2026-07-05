import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PageHeader } from '../../shared/components/PageHeader'
import { PasswordInput } from '../../shared/components/PasswordInput'
import { SessionListSkeleton } from '../../shared/components/Skeleton'
import { useToast } from '../../shared/components/ToastProvider'
import { ROLE_LABELS } from '../../shared/constants/roles'
import { useRole } from '../../shared/hooks/useRole'
import { api, clearTokens } from '../../shared/api/client'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  cancelEmailChange,
  changeEmail,
  changePassword,
  fetchMe,
  logoutAll,
  switchOrganization,
  updateProfile,
} from '../../store/authSlice'

type OrgDetails = {
  id: string
  name: string
  slug: string
  createdAt: string
  _count: { memberships: number; leads: number; deals: number }
}

type SessionInfo = {
  id: string
  deviceLabel: string
  ipAddress: string | null
  lastUsedAt: string
  createdAt: string
  isCurrent: boolean
}

export function SettingsPage() {
  const dispatch = useAppDispatch()
  const { success, error: toastError } = useToast()
  const { user, organization, organizations } = useAppSelector(
    (state) => state.auth,
  )
  const { role, isAdmin, isManager } = useRole()
  const [org, setOrg] = useState<OrgDetails | null>(null)
  const [orgName, setOrgName] = useState('')
  const [profileName, setProfileName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [switchingOrg, setSwitchingOrg] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)
  const [sessions, setSessions] = useState<SessionInfo[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  )
  const [staleAlertsEnabled, setStaleAlertsEnabled] = useState(true)
  const [staleAlertDays, setStaleAlertDays] = useState(7)
  const [savingAutomation, setSavingAutomation] = useState(false)
  const [runningStaleAlerts, setRunningStaleAlerts] = useState(false)

  async function loadSessions() {
    setLoadingSessions(true)
    try {
      const data = await api<{ sessions: SessionInfo[] }>('/api/auth/sessions')
      setSessions(data.sessions)
    } catch {
      toastError('Could not load active sessions.')
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    void loadSessions()
  }, [])

  useEffect(() => {
    setProfileName(user?.name ?? '')
  }, [user?.name])

  useEffect(() => {
    api<OrgDetails>('/api/organization')
      .then((data) => {
        setOrg(data)
        setOrgName(data.name)
      })
      .catch(() => setOrg(null))
  }, [])

  useEffect(() => {
    if (!isManager) return
    api<{
      staleDealAlertsEnabled: boolean
      staleDealAlertDays: number
    }>('/api/organization/automation')
      .then((data) => {
        setStaleAlertsEnabled(data.staleDealAlertsEnabled)
        setStaleAlertDays(data.staleDealAlertDays)
      })
      .catch(() => {})
  }, [isManager])

  async function handleSwitchOrg(organizationId: string) {
    if (!organizationId || organizationId === organization?.id) return
    setSwitchingOrg(true)
    try {
      await dispatch(switchOrganization(organizationId)).unwrap()
      window.location.href = '/'
    } catch {
      toastError('Failed to switch workspace.')
      setSwitchingOrg(false)
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await dispatch(updateProfile({ name: profileName })).unwrap()
      success('Profile updated.')
    } catch {
      toastError('Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangeEmail(e: FormEvent) {
    e.preventDefault()
    setSavingEmail(true)
    try {
      const result = await dispatch(
        changeEmail({ newEmail, password: emailPassword }),
      ).unwrap()
      setNewEmail('')
      setEmailPassword('')
      success(
        result.verifyUrl
          ? `${result.message} Dev link: ${result.verifyUrl}`
          : result.message,
      )
      dispatch(fetchMe())
    } catch {
      toastError('Failed to request email change. Check your password.')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleCancelEmailChange() {
    try {
      await dispatch(cancelEmailChange()).unwrap()
      success('Pending email change cancelled.')
      dispatch(fetchMe())
    } catch {
      toastError('Failed to cancel email change.')
    }
  }

  async function handleLogoutAll() {
    setSigningOutAll(true)
    try {
      await dispatch(logoutAll()).unwrap()
      window.location.href = '/login'
    } catch {
      toastError('Failed to sign out everywhere.')
      setSigningOutAll(false)
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevokingSessionId(sessionId)
    try {
      const result = await api<{ ok: boolean; revokedCurrent?: boolean }>(
        `/api/auth/sessions/${sessionId}`,
        { method: 'DELETE' },
      )
      if (result.revokedCurrent) {
        clearTokens()
        window.location.href = '/login'
        return
      }
      await loadSessions()
    } catch {
      toastError('Failed to revoke session.')
    } finally {
      setRevokingSessionId(null)
    }
  }

  function formatRelativeTime(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setSavingPassword(true)
    try {
      await dispatch(
        changePassword({ currentPassword, newPassword }),
      ).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      success('Password changed successfully.')
    } catch {
      toastError('Failed to change password. Check your current password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSaveOrg(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    try {
      await api('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({ name: orgName }),
      })
      success('Workspace name updated.')
      dispatch(fetchMe())
    } catch {
      toastError('Failed to update workspace.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAutomation(e: FormEvent) {
    e.preventDefault()
    setSavingAutomation(true)
    try {
      await api('/api/organization/automation', {
        method: 'PATCH',
        body: JSON.stringify({
          staleDealAlertsEnabled: staleAlertsEnabled,
          staleDealAlertDays: staleAlertDays,
        }),
      })
      success('Automation settings saved.')
    } catch {
      toastError('Failed to save automation settings.')
    } finally {
      setSavingAutomation(false)
    }
  }

  async function handleRunStaleAlerts() {
    setRunningStaleAlerts(true)
    try {
      const result = await api<{
        skipped?: boolean
        reason?: string
        staleCount?: number
        recipientCount?: number
      }>('/api/automation/stale-deal-alerts/run', { method: 'POST' })
      if (result.skipped) {
        const messages: Record<string, string> = {
          disabled: 'Stale-deal alerts are disabled.',
          throttled: 'Alerts were already sent recently (once per day).',
          none_stale: 'No stale deals to alert on right now.',
          no_managers: 'No managers found to email.',
        }
        success(messages[result.reason ?? ''] ?? 'No alerts sent.')
      } else {
        success(
          `Sent alerts to ${result.recipientCount ?? 0} manager(s) about ${result.staleCount ?? 0} stale deal(s).`,
        )
      }
    } catch {
      toastError('Failed to run stale-deal alerts.')
    } finally {
      setRunningStaleAlerts(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Workspace and account preferences"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Your profile</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-900">{user?.email}</dd>
              {user?.pendingEmail && (
                <p className="mt-1 text-xs text-amber-700">
                  Pending change to {user.pendingEmail}
                  <button
                    type="button"
                    onClick={handleCancelEmailChange}
                    className="ml-2 font-medium underline"
                  >
                    Cancel
                  </button>
                </p>
              )}
            </div>
            <div>
              <dt className="text-slate-500">Role</dt>
              <dd className="text-slate-900">
                {role ? ROLE_LABELS[role as keyof typeof ROLE_LABELS] : '—'}
              </dd>
            </div>
          </dl>

          <form onSubmit={handleSaveProfile} className="mt-6">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={savingProfile}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save profile'}
            </button>
          </form>

          <form
            onSubmit={handleChangeEmail}
            className="mt-8 border-t border-slate-100 pt-6"
            autoComplete="on"
          >
            <h3 className="text-sm font-semibold text-slate-900">Change email</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="settings-new-email" className="form-label">
                  New email
                </label>
                <input
                  id="settings-new-email"
                  name="email"
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-field"
                  autoComplete="email"
                />
              </div>
              <PasswordInput
                id="settings-email-password"
                name="password"
                label="Current password"
                required
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={savingEmail}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingEmail ? 'Sending...' : 'Send verification email'}
            </button>
          </form>

          <form
            onSubmit={handleChangePassword}
            className="mt-8 border-t border-slate-100 pt-6"
            autoComplete="on"
          >
            <h3 className="text-sm font-semibold text-slate-900">Change password</h3>
            <div className="mt-4 space-y-3">
              <PasswordInput
                id="settings-current-password"
                name="current-password"
                label="Current password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
              <PasswordInput
                id="settings-new-password"
                name="new-password"
                label="New password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingPassword ? 'Updating...' : 'Change password'}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Sessions</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage devices where you&apos;re signed in.
            </p>

            {loadingSessions && <SessionListSkeleton />}
            {!loadingSessions && sessions.length === 0 && (
              <p className="mt-3 text-sm text-slate-500">No other active sessions.</p>
            )}
            {!loadingSessions && sessions.length > 0 && (
              <ul className="mt-4 space-y-3">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {session.deviceLabel}
                          {session.isCurrent && (
                            <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              This device
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {session.ipAddress ?? 'Unknown IP'} · Last active{' '}
                          {formatRelativeTime(session.lastUsedAt)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Signed in{' '}
                          {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {!session.isCurrent && (
                        <button
                          type="button"
                          disabled={revokingSessionId === session.id}
                          onClick={() => void handleRevokeSession(session.id)}
                          className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          {revokingSessionId === session.id
                            ? 'Revoking...'
                            : 'Revoke'}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              disabled={signingOutAll}
              onClick={handleLogoutAll}
              className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {signingOutAll ? 'Signing out...' : 'Sign out everywhere'}
            </button>
          </div>
        </section>

        {isManager && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Workflow automation</h2>
            <p className="mt-1 text-sm text-slate-500">
              Email managers when open deals haven&apos;t been updated in a while.
            </p>
            <form onSubmit={handleSaveAutomation} className="mt-4 max-w-md space-y-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={staleAlertsEnabled}
                  onChange={(e) => setStaleAlertsEnabled(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Enable stale-deal email alerts
              </label>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Alert after (days without activity)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={staleAlertDays}
                  onChange={(e) => setStaleAlertDays(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={savingAutomation}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {savingAutomation ? 'Saving...' : 'Save automation'}
                </button>
                <button
                  type="button"
                  disabled={runningStaleAlerts}
                  onClick={() => void handleRunStaleAlerts()}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {runningStaleAlerts ? 'Running...' : 'Run alerts now'}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Workspace</h2>
          {organizations.length > 1 && (
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Switch workspace
              </label>
              <select
                value={organization?.id ?? ''}
                disabled={switchingOrg}
                onChange={(e) => handleSwitchOrg(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {organizations.map((orgOption) => (
                  <option key={orgOption.id} value={orgOption.id}>
                    {orgOption.name} ({orgOption.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {org && (
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Slug</dt>
                <dd className="text-slate-900">{org.slug}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Team size</dt>
                <dd className="text-slate-900">{org._count.memberships}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Records</dt>
                <dd className="text-slate-900">
                  {org._count.leads} leads · {org._count.deals} deals
                </dd>
              </div>
            </dl>
          )}

          {isAdmin ? (
            <form onSubmit={handleSaveOrg} className="mt-6">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Company name
              </label>
              <input
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save workspace'}
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Workspace: {organization?.name}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
