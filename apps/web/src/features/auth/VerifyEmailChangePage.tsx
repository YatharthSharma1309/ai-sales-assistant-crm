import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppDispatch } from '../../store/hooks'
import { verifyEmailChange } from '../../store/authSlice'

export function VerifyEmailChangePage() {
  const dispatch = useAppDispatch()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      return
    }

    dispatch(verifyEmailChange(token))
      .then((result) => {
        if (verifyEmailChange.fulfilled.match(result)) {
          setEmail(result.payload.email)
          setStatus('success')
        } else {
          setStatus('error')
        }
      })
      .catch(() => setStatus('error'))
  }, [dispatch, token])

  if (status === 'loading') {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-sm text-slate-500">Verifying your new email...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <h1 className="text-xl font-semibold text-slate-900">Verification failed</h1>
        <p className="mt-2 text-sm text-slate-600">
          This link is invalid or has expired. Request a new email change from
          Settings.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
      <h1 className="text-xl font-semibold text-slate-900">Email updated</h1>
      <p className="mt-2 text-sm text-slate-600">
        Your email has been changed to <strong>{email}</strong>. Sign in again
        with your new address.
      </p>
      <Link
        to="/login"
        className="mt-6 inline-block rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
      >
        Sign in
      </Link>
    </div>
  )
}
