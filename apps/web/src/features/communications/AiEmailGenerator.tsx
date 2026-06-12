import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Sparkles } from 'lucide-react'
import { api } from '../../shared/api/client'
import type {
  EmailContext,
  EmailDraftResult,
  EmailGoal,
  EmailTone,
} from '../../shared/types/ai'

type AiEmailGeneratorProps = {
  leadId?: string
  dealId?: string
  compact?: boolean
  onSavedToTimeline?: () => void
}

export function AiEmailGenerator({
  leadId,
  dealId,
  compact,
  onSavedToTimeline,
}: AiEmailGeneratorProps) {
  const [context, setContext] = useState<EmailContext | null>(null)
  const [contextLoading, setContextLoading] = useState(false)
  const [tone, setTone] = useState<EmailTone>('professional')
  const [goal, setGoal] = useState<EmailGoal>('check_in')
  const [draft, setDraft] = useState<EmailDraftResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveToTimeline, setSaveToTimeline] = useState(true)
  const [sendTo, setSendTo] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<string | null>(null)

  const linkedToCrm = Boolean(leadId || dealId)

  useEffect(() => {
    if (!leadId && !dealId) {
      setContext(null)
      return
    }

    const params = new URLSearchParams()
    if (leadId) params.set('leadId', leadId)
    if (dealId) params.set('dealId', dealId)

    setContextLoading(true)
    api<EmailContext>(`/api/ai/context?${params}`)
      .then((ctx) => {
        setContext(ctx)
        if (ctx.contactEmail) setSendTo(ctx.contactEmail)
      })
      .catch(() => setContext(null))
      .finally(() => setContextLoading(false))
  }, [leadId, dealId])

  async function handleGenerate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const payload: Record<string, unknown> = { tone, goal, saveToTimeline }
      if (leadId) payload.leadId = leadId
      else if (dealId) payload.dealId = dealId

      const result = await api<EmailDraftResult>('/api/ai/generate-email', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      setDraft(result)
      if (result.context) setContext(result.context)
      if (result.activityId && onSavedToTimeline) onSavedToTimeline()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!draft) return
    await navigator.clipboard.writeText(
      `Subject: ${draft.subject}\n\n${draft.body}`,
    )
  }

  async function handleSend() {
    if (!draft || !sendTo) return
    setSending(true)
    setSendResult(null)
    try {
      const payload: Record<string, unknown> = {
        to: sendTo,
        subject: draft.subject,
        body: draft.body,
        logToTimeline: !(saveToTimeline && Boolean(draft.activityId)),
      }
      if (leadId) payload.leadId = leadId
      if (dealId) payload.dealId = dealId

      const result = await api<{
        sent: boolean
        provider: string
        message?: string
      }>('/api/communications/send', {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      if (result.sent) {
        setSendResult('Email sent successfully.')
        onSavedToTimeline?.()
      } else {
        setSendResult(result.message ?? 'Email not sent — check Resend config.')
      }
    } catch (err) {
      setSendResult(err instanceof Error ? err.message : 'Send failed')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className={
        compact ? 'grid gap-4 lg:grid-cols-2' : 'grid gap-6 lg:grid-cols-2'
      }
    >
      <form
        onSubmit={handleGenerate}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            AI follow-up
          </h2>
        </div>

        {linkedToCrm && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              CRM context
            </p>
            {contextLoading ? (
              <p className="mt-2 text-sm text-slate-500">Loading context...</p>
            ) : context ? (
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex gap-2">
                  <dt className="text-slate-500">To</dt>
                  <dd className="font-medium text-slate-900">
                    {context.contactName}
                    {context.jobTitle ? ` · ${context.jobTitle}` : ''}
                  </dd>
                </div>
                {context.contactEmail && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Email</dt>
                    <dd className="text-slate-900">{context.contactEmail}</dd>
                  </div>
                )}
                {context.companyName && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Company</dt>
                    <dd className="text-slate-900">{context.companyName}</dd>
                  </div>
                )}
                {context.dealStage && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Stage</dt>
                    <dd className="text-slate-900">{context.dealStage}</dd>
                  </div>
                )}
                {context.leadStatus && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">Lead status</dt>
                    <dd className="text-slate-900">{context.leadStatus}</dd>
                  </div>
                )}
                {context.arr != null && (
                  <div className="flex gap-2">
                    <dt className="text-slate-500">ARR</dt>
                    <dd className="text-slate-900">
                      ${context.arr.toLocaleString()}
                    </dd>
                  </div>
                )}
                {context.lastActivity && (
                  <div>
                    <dt className="text-slate-500">Last activity</dt>
                    <dd className="mt-0.5 text-slate-700">{context.lastActivity}</dd>
                  </div>
                )}
                {context.notes && (
                  <div>
                    <dt className="text-slate-500">Notes</dt>
                    <dd className="mt-0.5 text-slate-700 line-clamp-2">
                      {context.notes}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Could not load context.</p>
            )}
          </div>
        )}

        <div className={`grid gap-4 ${linkedToCrm ? 'mt-4' : 'mt-4'} sm:grid-cols-2`}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Tone
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as EmailTone)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Goal
            </label>
            <select
              value={goal}
              onChange={(e) => setGoal(e.target.value as EmailGoal)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="check_in">Check in</option>
              <option value="schedule_demo">Schedule demo</option>
              <option value="proposal_follow_up">Proposal follow-up</option>
            </select>
          </div>
        </div>

        {linkedToCrm && (
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={saveToTimeline}
              onChange={(e) => setSaveToTimeline(e.target.checked)}
              className="rounded border-slate-300"
            />
            Save draft to timeline
          </label>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || (linkedToCrm && contextLoading)}
          className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Generating...' : 'Generate email'}
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Draft</h2>
          {draft && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={copyToClipboard}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending || !sendTo}
                className="text-sm font-medium text-brand-600 hover:underline disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send email'}
              </button>
            </div>
          )}
        </div>

        {draft ? (
          <div className="mt-4 space-y-4">
            {draft.message && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {draft.message}
              </p>
            )}
            {draft.activityId && (
              <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
                Saved to timeline as email activity.
              </p>
            )}
            {sendResult && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
                {sendResult}
              </p>
            )}
            {draft && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  Send to
                </label>
                <input
                  type="email"
                  value={sendTo}
                  onChange={(e) => setSendTo(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">
                Subject
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {draft.subject}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-400">Body</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-slate-700">
                {draft.body}
              </pre>
            </div>
            {draft.source && (
              <p className="text-xs text-slate-400">Source: {draft.source}</p>
            )}
          </div>
        ) : (
          <p className="mt-8 text-sm text-slate-500">
            {linkedToCrm
              ? 'Context is pulled from your CRM. Pick tone and goal, then generate.'
              : 'Generate a follow-up draft from the selected record.'}
          </p>
        )}
      </div>
    </div>
  )
}
