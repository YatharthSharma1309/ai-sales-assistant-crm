import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-400 ring-1 ring-slate-200/80">
        {icon ?? <Inbox size={24} strokeWidth={1.75} />}
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
