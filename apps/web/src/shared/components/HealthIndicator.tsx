type HealthIndicatorProps = {
  score: number
  label: string
  className?: string
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600'
  if (score >= 50) return 'text-amber-600'
  return 'text-red-600'
}

function barColor(score: number): string {
  if (score >= 75) return 'bg-emerald-500'
  if (score >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

export function HealthIndicator({ score, label, className = '' }: HealthIndicatorProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-medium uppercase text-slate-400">Smart pipeline health</p>
        <p className={`text-sm font-semibold ${scoreColor(clamped)}`}>{label}</p>
      </div>
      <p className={`mt-1 text-2xl font-semibold ${scoreColor(clamped)}`}>{clamped}</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor(clamped)}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
