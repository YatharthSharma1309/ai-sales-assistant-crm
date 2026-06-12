import { useState } from 'react'
import type { FormEvent } from 'react'
import type { ActivityType } from '../types'
import { useAppDispatch } from '../../store/hooks'
import { createActivity } from '../../store/activitiesSlice'

type AddActivityFormProps = {
  leadId?: string
  contactId?: string
  dealId?: string
  onAdded?: () => void
}

export function AddActivityForm({
  leadId,
  contactId,
  dealId,
  onAdded,
}: AddActivityFormProps) {
  const dispatch = useAppDispatch()
  const [type, setType] = useState<ActivityType>('NOTE')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await dispatch(
      createActivity({
        type,
        title,
        body: body || undefined,
        dueAt: type === 'TASK' && dueDate ? dueDate : undefined,
        leadId,
        contactId,
        dealId,
      }),
    )
    if (createActivity.rejected.match(result)) {
      setError(result.error.message ?? 'Could not save activity')
      setSaving(false)
      return
    }
    setTitle('')
    setBody('')
    setDueDate('')
    setSaving(false)
    onAdded?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <h3 className="text-sm font-semibold text-slate-900">Log activity</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="NOTE">Note</option>
            <option value="CALL">Call</option>
            <option value="EMAIL">Email</option>
            <option value="MEETING">Meeting</option>
            <option value="TASK">Task</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Discovery call recap"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
          />
        </div>
      </div>
      {type === 'TASK' && (
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Due date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      )}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Details
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="What happened? Key takeaways, next steps..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? 'Saving...' : 'Add to timeline'}
      </button>
    </form>
  )
}
