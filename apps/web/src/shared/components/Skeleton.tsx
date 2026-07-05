type SkeletonProps = {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 ${className}`}
      aria-hidden="true"
    />
  )
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[8rem]" />
        </td>
      ))}
    </tr>
  )
}

export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 4 }).map((_, col) => (
        <div
          key={col}
          className="w-72 shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <Skeleton className="mb-3 h-5 w-24" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, card) => (
              <Skeleton key={card} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />
}

export function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function SessionListSkeleton() {
  return (
    <div className="mt-4 space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function IntegrationsPageSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="mt-2 h-5 w-80" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-44 w-full rounded-xl" />
      ))}
    </div>
  )
}

export function MeetingListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full rounded-xl" />
      ))}
    </div>
  )
}
