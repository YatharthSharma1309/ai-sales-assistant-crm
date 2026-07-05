import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { MeetingListSkeleton } from '../../shared/components/Skeleton'
import { api } from '../../shared/api/client'
import type { MeetingRecord } from '../../shared/types/meeting'
import { MeetingSummaryPanel } from './MeetingSummaryPanel'

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([])
  const [loading, setLoading] = useState(true)

  function loadMeetings() {
    setLoading(true)
    api<MeetingRecord[]>('/api/meetings')
      .then(setMeetings)
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadMeetings()
  }, [])

  return (
    <div>
      <PageHeader
        title="Meeting Summaries"
        description="Paste call notes — AI extracts summary, objections, and action items"
      />

      <div className="mb-8">
        <MeetingSummaryPanel showLinkPicker onSaved={loadMeetings} />
      </div>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Recent meetings
        </h2>

        {loading ? (
          <MeetingListSkeleton />
        ) : meetings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">
            No saved meetings yet. Generate a summary with &quot;Save meeting to
            timeline&quot; enabled.
          </p>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-slate-900">{meeting.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(meeting.createdAt).toLocaleString()}
                      {meeting.createdBy
                        ? ` · ${meeting.createdBy.name}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {meeting.lead && (
                      <Link
                        to={`/leads/${meeting.lead.id}`}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200"
                      >
                        {meeting.lead.title}
                      </Link>
                    )}
                    {meeting.deal && (
                      <Link
                        to={`/pipeline/${meeting.deal.id}`}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200"
                      >
                        {meeting.deal.title}
                      </Link>
                    )}
                    {meeting.contact && (
                      <Link
                        to={`/contacts/${meeting.contact.id}`}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 hover:bg-slate-200"
                      >
                        {meeting.contact.firstName} {meeting.contact.lastName}
                      </Link>
                    )}
                  </div>
                </div>
                {meeting.summary && (
                  <p className="mt-3 text-sm text-slate-600 line-clamp-2">
                    {meeting.summary.summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
