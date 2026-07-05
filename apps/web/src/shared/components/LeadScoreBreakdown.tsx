import type { ScoreFactor } from '../types'

type LeadScoreBreakdownProps = {
  score?: number | null
  factors?: ScoreFactor[]
}

function scoreStyles(score: number): string {
  if (score >= 70) return 'text-emerald-700'
  if (score >= 40) return 'text-amber-700'
  return 'text-red-700'
}

export function LeadScoreBreakdown({ score, factors }: LeadScoreBreakdownProps) {
  if (score == null) {
    return (
      <p className="text-sm text-slate-500">Score not calculated yet.</p>
    )
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)))

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${scoreStyles(clamped)}`}>
          {clamped}
        </span>
        <span className="text-sm text-slate-500">/ 100 smart score</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Rule-based score from status, source, contact data, and recent engagement.
      </p>
      {factors && factors.length > 0 && (
        <ul className="mt-4 space-y-2">
          {factors.map((factor) => (
            <li
              key={factor.rule}
              className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
            >
              <span className="text-slate-700">{factor.rule}</span>
              <span
                className={`font-medium ${
                  factor.points >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {factor.points >= 0 ? '+' : ''}
                {factor.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
