import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">
          CRM built for B2B SaaS sales teams
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setOrganizations(null)
                setSelectedOrgId('')
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setOrganizations(null)
                setSelectedOrgId('')
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {organizations && organizations.length > 1 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Workspace
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.role})
                  </option>
                ))}
              </select>
            </div>
          )}

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
            {loading ? 'Signing in...' : organizations ? 'Continue' : 'Sign in'}
          </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
