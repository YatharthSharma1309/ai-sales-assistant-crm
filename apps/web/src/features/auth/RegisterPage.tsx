import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLogo } from '../../shared/components/AppLogo'
import { PasswordInput } from '../../shared/components/PasswordInput'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { clearError, register } from '../../store/authSlice'

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error } = useAppSelector((state) => state.auth)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    organizationName: '',
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    dispatch(clearError())
    const result = await dispatch(register(form))
    if (register.fulfilled.match(result)) navigate('/')
  }

  function updateField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="auth-card">
      <div className="mb-8 text-center">
        <AppLogo size="lg" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create your workspace
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Get your team selling in minutes
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        method="post"
        autoComplete="on"
      >
        <div>
          <label htmlFor="register-name" className="form-label">
            Your name
          </label>
          <input
            id="register-name"
            name="name"
            type="text"
            required
            placeholder="Jane Smith"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="input-field"
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="register-organization" className="form-label">
            Company name
          </label>
          <input
            id="register-organization"
            name="organization"
            type="text"
            required
            placeholder="Acme Inc"
            value={form.organizationName}
            onChange={(e) => updateField('organizationName', e.target.value)}
            className="input-field"
            autoComplete="organization"
          />
        </div>

        <div>
          <label htmlFor="register-email" className="form-label">
            Work email
          </label>
          <input
            id="register-email"
            name="email"
            type="email"
            required
            placeholder="you@company.com"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="input-field"
            autoComplete="email"
            inputMode="email"
          />
        </div>

        <PasswordInput
          id="register-password"
          name="new-password"
          label="Password"
          required
          minLength={8}
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Creating...' : 'Create workspace'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
