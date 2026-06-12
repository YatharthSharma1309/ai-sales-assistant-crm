import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Video } from 'lucide-react'
import { api } from '../../shared/api/client'
import type { MeetingSummaryResult } from '../../shared/types/meeting'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchContacts } from '../../store/contactsSlice'
import { fetchLeads } from '../../store/leadsSlice'
import { fetchDeals } from '../../store/pipelineSlice'
import { MeetingSummaryDisplay } from './MeetingSummaryDisplay'

type LinkType = '' | 'lead' | 'deal' | 'contact'

type MeetingSummaryPanelProps = {
  leadId?: string
  dealId?: string
  contactId?: string
  onSaved?: () => void
  showLinkPicker?: boolean
}

export function MeetingSummaryPanel({
  leadId: fixedLeadId,
  dealId: fixedDealId,
  contactId: fixedContactId,
  onSaved,
  showLinkPicker = false,
}: MeetingSummaryPanelProps) {
  const dispatch = useAppDispatch()
  const { items: leads } = useAppSelector((state) => state.leads)
  const { deals } = useAppSelector((state) => state.pipeline)
  const { items: contacts } = useAppSelector((state) => state.contacts)

  const [title, setTitle] = useState('')
  const [transcript, setTranscript] = useState('')
  const [linkType, setLinkType] = useState<LinkType>(
    fixedLeadId ? 'lead' : fixedDealId ? 'deal' : fixedContactId ? 'contact' : '',
  )
  const [linkedId, setLinkedId] = useState(
    fixedLeadId ?? fixedDealId ?? fixedContactId ?? '',
  )
  const [saveToTimeline, setSaveToTimeline] = useState(true)
  const [createTasks, setCreateTasks] = useState(true)
  const [result, setResult] = useState<MeetingSummaryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (showLinkPicker) {
      dispatch(fetchLeads({ pageSize: 100 }))
      dispatch(fetchDeals({ pageSize: 100 }))
      dispatch(fetchContacts({ pageSize: 100 }))
    }
  }, [dispatch, showLinkPicker])

  const leadId = fixedLeadId ?? (linkType === 'lead' ? linkedId : undefined)
  const dealId = fixedDealId ?? (linkType === 'deal' ? linkedId : undefined)
  const contactId =
    fixedContactId ?? (linkType === 'contact' ? linkedId : undefined)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = {
        title,
        transcript,
        saveToTimeline,
        createTasks,
      }
      if (leadId) payload.leadId = leadId
      if (dealId) payload.dealId = dealId
      if (contactId) payload.contactId = contactId

      const data = await api<MeetingSummaryResult>(
        '/api/ai/summarize-meeting',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      )
      setResult(data)
      if (data.meetingActivityId) onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to summarize')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Video size={18} className="text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Meeting summary
          </h2>
        </div>

        {showLinkPicker && !fixedLeadId && !fixedDealId && !fixedContactId && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Link to
              </label>
              <select
                value={linkType}
                onChange={(e) => {
                  setLinkType(e.target.value as LinkType)
                  setLinkedId('')
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                <option value="lead">Lead</option>
                <option value="deal">Deal</option>
                <option value="contact">Contact</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Record
              </label>
              <select
                value={linkedId}
                onChange={(e) => setLinkedId(e.target.value)}
                disabled={!linkType}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
              >
                <option value="">Optional...</option>
                {linkType === 'lead' &&
                  leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                {linkType === 'deal' &&
                  deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                {linkType === 'contact' &&
                  contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Meeting title
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Discovery call — Acme Corp"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Notes or transcript
          </label>
          <textarea
            required
            minLength={20}
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={10}
            placeholder="Paste call notes or transcript here...

Discussed current CRM pain points.
They need better pipeline visibility.
Action: send proposal by Friday.
Objection: budget until Q3."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="mt-4 space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={saveToTimeline}
              onChange={(e) => setSaveToTimeline(e.target.checked)}
              className="rounded border-slate-300"
            />
            Save meeting to timeline
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={createTasks}
              onChange={(e) => setCreateTasks(e.target.checked)}
              disabled={!saveToTimeline}
              className="rounded border-slate-300"
            />
            Create tasks from action items
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Analyzing...' : 'Generate summary'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Results</h2>
        {result ? (
          <div className="mt-4">
            <MeetingSummaryDisplay result={result} />
          </div>
        ) : (
          <p className="mt-8 text-sm text-slate-500">
            Paste your meeting notes and AI will extract a summary, objections,
            and action items. Link to a lead or deal to auto-create timeline
            tasks.
          </p>
        )}
      </div>
    </div>
  )
}
