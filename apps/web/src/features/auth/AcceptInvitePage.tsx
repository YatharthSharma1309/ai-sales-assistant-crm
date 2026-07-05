import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../shared/api/client'
import { ROLE_LABELS } from '../../shared/constants/roles'
import type { OrgRole } from '../../shared/constants/roles'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { acceptInvite, clearError } from '../../store/authSlice'
import { PasswordInput } from '../../shared/components/PasswordInput'

type InvitePreview = {
  organization: { id: string; name: string; slug: string }
  role: OrgRole
  email: string
  name: string | null
  inviterName: string
  isExistingUser: boolean
  expiresAt: string
}

export function AcceptInvitePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const { loading, error } = useAppSelector((state) => state.auth)

  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (!token) {
      setLoadError('Missing invite token')
      return
    }

    api<InvitePreview>(`/api/auth/invite/${encodeURIComponent(token)}`)
      .then((data) => {
        setPreview(data)
        setName(data.name ?? '')
      })
      .catch(() => setLoadError('This invite link is invalid or has expired.'))
  }, [token])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!token) return
    dispatch(clearError())

    const result = await dispatch(
      acceptInvite({
        token,
        ...(preview?.isExistingUser
          ? {}
          : { name, password }),
      }),
    )

    if (acceptInvite.fulfilled.match(result)) {
      navigate('/')
    }
  }

  if (loadError) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-slate-900">Invalid invite</h1>
        <p className="mt-2 text-sm text-slate-600">{loadError}</p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Sign in
        </Link>
      </div>
    )
  }

  if (!preview) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-sm text-slate-500">Loading invitation...</p>
      </div>
    )
  }

  if (preview.isExistingUser) {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Join workspace</h1>
        <p className="mt-2 text-sm text-slate-600">
          {preview.inviterName} invited you to join{' '}
          <strong>{preview.organization.name}</strong> as{' '}
          {ROLE_LABELS[preview.role]}.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Sign in with <strong>{preview.email}</strong> to accept this invitation.
        </p>
        <Link
          to={`/login?redirect=${encodeURIComponent(`/invite/accept?token=${token}`)}`}
          className="mt-6 block w-full rounded-lg bg-brand-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-700"
        >
          Sign in to accept
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">
        {preview.inviterName} invited you to join{' '}
        <strong>{preview.organization.name}</strong> as{' '}
        {ROLE_LABELS[preview.role]}.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4"
        method="post"
        autoComplete="on"
      >
        <div>
          <label htmlFor="invite-email" className="form-label">
            Email
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            readOnly
            value={preview.email}
            autoComplete="username"
            className="input-field bg-slate-50 text-slate-600"
          />
        </div>
        <div>
          <label htmlFor="invite-name" className="form-label">
            Full name
          </label>
          <input
            id="invite-name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="input-field"
          />
        </div>
        <PasswordInput
          id="invite-password"
          name="new-password"
          label="Password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Joining...' : 'Accept invitation'}
        </button>
      </form>
    </div>
  )
}
