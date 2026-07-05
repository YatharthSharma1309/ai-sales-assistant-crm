import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLogo } from '../../shared/components/AppLogo'
import { PasswordInput } from '../../shared/components/PasswordInput'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { acceptInvite, clearError, login } from '../../store/authSlice'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect')
  const { loading, error } = useAppSelector((state) => state.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [organizations, setOrganizations] = useState<
    { id: string; name: string; slug: string; role: string }[] | null
  >(null)
  const [selectedOrgId, setSelectedOrgId] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    dispatch(clearError())
    const result = await dispatch(
      login({
        email,
        password,
        organizationId: selectedOrgId || undefined,
      }),
    )
    if (login.fulfilled.match(result)) {
      if ('requiresOrgSelection' in result.payload) {
        setOrganizations(result.payload.organizations)
        setSelectedOrgId(result.payload.organizations[0]?.id ?? '')
        return
      }
      if (redirect?.startsWith('/invite/accept')) {
        const inviteToken = new URL(redirect, window.location.origin).searchParams.get(
          'token',
        )
        if (inviteToken) {
          const acceptResult = await dispatch(acceptInvite({ token: inviteToken }))
          if (acceptInvite.fulfilled.match(acceptResult)) {
            navigate('/')
            return
          }
        }
      }
      navigate(redirect && redirect.startsWith('/') ? redirect : '/')
    }
  }

  return (
    <div className="auth-card">
      <div className="mb-8 text-center">
        <AppLogo size="lg" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to your B2B SaaS sales workspace
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        method="post"
        autoComplete="on"
      >
        <div>
          <label htmlFor="login-email" className="form-label">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setOrganizations(null)
              setSelectedOrgId('')
            }}
            className="input-field"
            placeholder="you@company.com"
            autoComplete="username"
            inputMode="email"
          />
        </div>

        <PasswordInput
          id="login-password"
          name="password"
          label="Password"
          required
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setOrganizations(null)
            setSelectedOrgId('')
          }}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Forgot password?
          </Link>
        </div>

        {organizations && organizations.length > 1 && (
          <div>
            <label htmlFor="login-workspace" className="form-label">
              Workspace
            </label>
            <select
              id="login-workspace"
              name="organizationId"
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="select-field"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.role})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in...' : organizations ? 'Continue' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        No account?{' '}
        <Link
          to="/register"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Create one
        </Link>
      </p>
    </div>
  )
}
