import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppLogo } from '../../shared/components/AppLogo'
import { api } from '../../shared/api/client'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    setDevResetUrl(null)
    try {
      const data = await api<{
        ok: boolean
        message: string
        resetUrl?: string
        devNote?: string
      }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      setMessage(data.message)
      if (data.resetUrl) setDevResetUrl(data.resetUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <div className="mb-8 text-center">
        <AppLogo size="lg" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Reset password
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          We&apos;ll email you a link to choose a new password
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <div>
          <label htmlFor="forgot-email" className="form-label">
            Email
          </label>
          <input
            id="forgot-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            autoComplete="username"
            placeholder="you@company.com"
          />
        </div>

        {error && <p className="alert-error">{error}</p>}
        {message && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
            {message}
          </p>
        )}
        {devResetUrl && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900">
            Dev mode (email not sent):{' '}
            <Link
              to={(() => {
                try {
                  return new URL(devResetUrl).pathname + new URL(devResetUrl).search
                } catch {
                  return devResetUrl.startsWith('/') ? devResetUrl : `/reset-password?token=${devResetUrl}`
                }
              })()}
              className="font-medium underline"
            >
              Open reset link
            </Link>
          </p>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Sending...' : 'Send reset link'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
