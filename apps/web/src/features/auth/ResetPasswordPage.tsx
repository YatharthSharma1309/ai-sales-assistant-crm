import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AppLogo } from '../../shared/components/AppLogo'
import { PasswordInput } from '../../shared/components/PasswordInput'
import { api } from '../../shared/api/client'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      })
      navigate('/login', { replace: true, state: { reset: true } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-card text-center">
        <h1 className="text-xl font-semibold text-slate-900">Invalid link</h1>
        <p className="mt-2 text-sm text-slate-600">
          This password reset link is missing or expired.
        </p>
        <Link to="/forgot-password" className="btn-primary mt-6 inline-flex">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <div className="mb-8 text-center">
        <AppLogo size="lg" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Choose a new password
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
        <PasswordInput
          id="new-password"
          name="new-password"
          label="New password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <PasswordInput
          id="confirm-password"
          name="confirm-password"
          label="Confirm password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
