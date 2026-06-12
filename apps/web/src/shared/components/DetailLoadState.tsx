import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type DetailLoadStateProps = {
  record: unknown
  error: string | null
  backTo: string
  backLabel: string
  children: ReactNode
}

export function DetailLoadState({
  record,
  error,
  backTo,
  backLabel,
  children,
}: DetailLoadStateProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm font-medium text-red-800">
          {error === 'Request failed' || error === 'Failed to fetch'
            ? 'Record not found or you do not have access.'
            : error}
        </p>
        <Link
          to={backTo}
          className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
        >
          {backLabel}
        </Link>
      </div>
    )
  }

  if (!record) {
    return <p className="text-sm text-slate-500">Loading...</p>
  }

  return <>{children}</>
}
