type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  loading?: boolean
  accent?: 'blue' | 'emerald' | 'amber' | 'violet'
}

const accentBar: Record<NonNullable<StatCardProps['accent']>, string> = {
  blue: 'from-brand-500 to-brand-300',
  emerald: 'from-emerald-500 to-emerald-300',
  amber: 'from-amber-500 to-amber-300',
  violet: 'from-violet-500 to-violet-300',
}

export function StatCard({
  label,
  value,
  hint,
  loading,
  accent = 'blue',
}: StatCardProps) {
  return (
    <div className="card card-hover group relative overflow-hidden p-5">
      <div
        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentBar[accent]} opacity-80`}
      />
      <p className="text-sm font-medium text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-3 h-9 w-24 animate-pulse rounded-lg bg-slate-200" />
      ) : (
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 transition-colors group-hover:text-brand-700">
          {value}
        </p>
      )}
      {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
