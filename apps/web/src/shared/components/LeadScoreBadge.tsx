type LeadScoreBadgeProps = {
  score?: number | null
}

function scoreStyles(score: number): string {
  if (score >= 70) return 'bg-emerald-100 text-emerald-800'
  if (score >= 40) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

export function LeadScoreBadge({ score }: LeadScoreBadgeProps) {
  if (score == null) {
    return <span className="text-slate-400">—</span>
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <span
      className={`inline-flex min-w-[2.5rem] justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${scoreStyles(clamped)}`}
    >
      {clamped}
    </span>
  )
}
