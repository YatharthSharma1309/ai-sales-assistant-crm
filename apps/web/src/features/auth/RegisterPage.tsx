import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Create your workspace
        </h1>
      </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            ['name', 'Your name'],
            ['organizationName', 'Company name'],
            ['email', 'Work email'],
            ['password', 'Password'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {label}
              </label>
              <input
                type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
                required
                minLength={key === 'password' ? 6 : undefined}
                value={form[key as keyof typeof form]}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          ))}

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
            {loading ? 'Creating...' : 'Create workspace'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
    </div>
  )
}
