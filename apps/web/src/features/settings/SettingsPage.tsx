import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PageHeader } from '../../shared/components/PageHeader'
import { ROLE_LABELS } from '../../shared/constants/roles'
import { useRole } from '../../shared/hooks/useRole'
import { api } from '../../shared/api/client'
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

export function SettingsPage() {
  const dispatch = useAppDispatch()
  const { user, organization, organizations } = useAppSelector(
    (state) => state.auth,
  )
  const { role, isAdmin } = useRole()
  const [org, setOrg] = useState<OrgDetails | null>(null)
  const [orgName, setOrgName] = useState('')
  const [profileName, setProfileName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [profileMessage, setProfileMessage] = useState<string | null>(null)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [switchingOrg, setSwitchingOrg] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [savingEmail, setSavingEmail] = useState(false)
  const [signingOutAll, setSigningOutAll] = useState(false)

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

  async function handleSwitchOrg(organizationId: string) {
    if (!organizationId || organizationId === organization?.id) return
    setSwitchingOrg(true)
    setMessage(null)
    try {
      await dispatch(switchOrganization(organizationId)).unwrap()
      window.location.href = '/'
    } catch {
      setMessage('Failed to switch workspace.')
      setSwitchingOrg(false)
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMessage(null)
    try {
      await dispatch(updateProfile({ name: profileName })).unwrap()
      setProfileMessage('Profile updated.')
    } catch {
      setProfileMessage('Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangeEmail(e: FormEvent) {
    e.preventDefault()
    setSavingEmail(true)
    setEmailMessage(null)
    try {
      const result = await dispatch(
        changeEmail({ newEmail, password: emailPassword }),
      ).unwrap()
      setNewEmail('')
      setEmailPassword('')
      setEmailMessage(
        result.verifyUrl
          ? `${result.message} Dev link: ${result.verifyUrl}`
          : result.message,
      )
      dispatch(fetchMe())
    } catch {
      setEmailMessage('Failed to request email change. Check your password.')
    } finally {
      setSavingEmail(false)
    }
  }

  async function handleCancelEmailChange() {
    try {
      await dispatch(cancelEmailChange()).unwrap()
      setEmailMessage('Pending email change cancelled.')
      dispatch(fetchMe())
    } catch {
      setEmailMessage('Failed to cancel email change.')
    }
  }

  async function handleLogoutAll() {
    setSigningOutAll(true)
    try {
      await dispatch(logoutAll()).unwrap()
      window.location.href = '/login'
    } catch {
      setMessage('Failed to sign out everywhere.')
      setSigningOutAll(false)
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setSavingPassword(true)
    setPasswordMessage(null)
    try {
      await dispatch(
        changePassword({ currentPassword, newPassword }),
      ).unwrap()
      setCurrentPassword('')
      setNewPassword('')
      setPasswordMessage('Password changed successfully.')
    } catch {
      setPasswordMessage('Failed to change password. Check your current password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSaveOrg(e: FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    setMessage(null)
    try {
      await api('/api/organization', {
        method: 'PATCH',
        body: JSON.stringify({ name: orgName }),
      })
      setMessage('Workspace name updated.')
      dispatch(fetchMe())
    } catch {
      setMessage('Failed to update workspace.')
    } finally {
      setSaving(false)
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
            {profileMessage && (
              <p className="mt-2 text-sm text-slate-600">{profileMessage}</p>
            )}
            <button
              type="submit"
              disabled={savingProfile}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save profile'}
            </button>
          </form>

          <form onSubmit={handleChangeEmail} className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Change email</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New email
                </label>
                <input
                  required
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Current password
                </label>
                <input
                  required
                  type="password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {emailMessage && (
              <p className="mt-2 text-sm text-slate-600 break-all">{emailMessage}</p>
            )}
            <button
              type="submit"
              disabled={savingEmail}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {savingEmail ? 'Sending...' : 'Send verification email'}
            </button>
          </form>

          <form onSubmit={handleChangePassword} className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">Change password</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Current password
                </label>
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  New password
                </label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {passwordMessage && (
              <p className="mt-2 text-sm text-slate-600">{passwordMessage}</p>
            )}
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
              Sign out on all devices except this browser.
            </p>
            <button
              type="button"
              disabled={signingOutAll}
              onClick={handleLogoutAll}
              className="mt-3 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              {signingOutAll ? 'Signing out...' : 'Sign out everywhere'}
            </button>
          </div>
        </section>

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
              {message && (
                <p className="mt-2 text-sm text-slate-600">{message}</p>
              )}
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
