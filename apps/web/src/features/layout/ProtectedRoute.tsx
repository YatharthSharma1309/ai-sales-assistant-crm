import { useLayoutEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchMe } from '../../store/authSlice'
import { getToken } from '../../shared/api/client'

function SessionSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center text-slate-500">
      Loading workspace...
    </div>
  )
}

export function ProtectedRoute() {
  const dispatch = useAppDispatch()
  const { user, loading, sessionChecked, error } = useAppSelector(
    (state) => state.auth,
  )
  const token = getToken()

  useLayoutEffect(() => {
    if (token && !sessionChecked) {
      void dispatch(fetchMe())
    }
  }, [dispatch, token, sessionChecked])

  if (!token) return <Navigate to="/login" replace />

  if (!user) {
    if (!sessionChecked || loading) {
      return <SessionSpinner />
    }

    if (token) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-sm text-slate-600">
            {error ?? 'Could not load your workspace. Check your connection and try again.'}
          </p>
          <button
            type="button"
            onClick={() => void dispatch(fetchMe())}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Retry
          </button>
        </div>
      )
    }

    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
