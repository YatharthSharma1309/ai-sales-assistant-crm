import type { MeetingSummaryResult } from '../../shared/types/meeting'

type MeetingSummaryDisplayProps = {
  result: MeetingSummaryResult
}

export function MeetingSummaryDisplay({ result }: MeetingSummaryDisplayProps) {
  return (
    <div className="space-y-5">
      {result.message && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {result.message}
        </p>
      )}
      {result.meetingActivityId && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          Saved to timeline
          {result.taskActivityIds && result.taskActivityIds.length > 0
            ? ` with ${result.taskActivityIds.length} task(s)`
            : ''}
          .
        </p>
      )}

      <section>
        <h3 className="text-xs font-semibold uppercase text-slate-400">Summary</h3>
        <p className="mt-1 text-sm text-slate-700">{result.summary}</p>
      </section>

      {result.painPoints.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Pain points
          </h3>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
            {result.painPoints.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      {result.objections.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Objections
          </h3>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
            {result.objections.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>
      )}

      {result.nextSteps.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Next steps
          </h3>
          <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
            {result.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {result.actionItems.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase text-slate-400">
            Action items
          </h3>
          <ul className="mt-2 space-y-2">
            {result.actionItems.map((item) => (
              <li
                key={item.title}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="text-slate-800">{item.title}</span>
                {item.dueInDays != null && (
                  <span className="text-xs text-slate-500">
                    Due in {item.dueInDays}d
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.suggestedFollowUpAngle && (
        <section className="rounded-lg border border-brand-100 bg-brand-50 p-4">
          <h3 className="text-xs font-semibold uppercase text-brand-600">
            Follow-up angle
          </h3>
          <p className="mt-1 text-sm text-brand-900">
            {result.suggestedFollowUpAngle}
          </p>
        </section>
      )}

      {result.source && (
        <p className="text-xs text-slate-400">Source: {result.source}</p>
      )}
    </div>
  )
}
