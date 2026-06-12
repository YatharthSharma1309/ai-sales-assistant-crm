import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { ActivityTimeline } from '../../shared/components/ActivityTimeline'
import { AddActivityForm } from '../../shared/components/AddActivityForm'
import { LEAD_STATUS_LABELS } from '../../shared/constants/pipeline'
import type { LeadStatus } from '../../shared/types'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  clearActivities,
  deleteActivity,
  fetchActivities,
  updateActivity,
} from '../../store/activitiesSlice'
import { fetchContacts } from '../../store/contactsSlice'
import { DetailLoadState } from '../../shared/components/DetailLoadState'
import { DeleteRecordButton } from '../../shared/components/DeleteRecordButton'
import {
  clearCurrentLead,
  deleteLead,
  fetchLead,
  updateLead,
} from '../../store/leadsSlice'
import { AiEmailGenerator } from '../communications/AiEmailGenerator'
import { MeetingSummaryPanel } from '../meetings/MeetingSummaryPanel'
import { AssigneeSelect } from '../../shared/components/AssigneeSelect'
import { fetchTeam } from '../../store/teamSlice'
import { useRole } from '../../shared/hooks/useRole'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { isManager } = useRole()
  const { user } = useAppSelector((state) => state.auth)
  const { current: lead, currentError } = useAppSelector((state) => state.leads)
  const { items: contacts } = useAppSelector((state) => state.contacts)
  const { items: activities, loading: activitiesLoading } = useAppSelector(
    (state) => state.activities,
  )
  const [notes, setNotes] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)

  useEffect(() => {
    dispatch(fetchContacts({ pageSize: 100 }))
    if (isManager) dispatch(fetchTeam())
  }, [dispatch, isManager])

  useEffect(() => {
    if (!id) return
    dispatch(fetchLead(id))
    dispatch(fetchActivities({ leadId: id }))
    return () => {
      dispatch(clearCurrentLead())
      dispatch(clearActivities())
    }
  }, [dispatch, id])

  useEffect(() => {
    if (lead) {
      setNotes(lead.notes ?? '')
      setTitle(lead.title)
      setSource(lead.source ?? '')
    }
  }, [lead])

  function refreshTimeline() {
    if (id) dispatch(fetchActivities({ leadId: id }))
  }

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return
    await dispatch(updateLead({ id: lead.id, status }))
  }

  async function handleContactChange(contactId: string) {
    if (!lead) return
    await dispatch(
      updateLead({
        id: lead.id,
        contactId: contactId || null,
      }),
    )
  }

  async function handleAssigneeChange(assignedToId: string) {
    if (!lead) return
    await dispatch(
      updateLead({
        id: lead.id,
        assignedToId: assignedToId || null,
      }),
    )
  }

  async function handleSaveNotes(e: FormEvent) {
    e.preventDefault()
    if (!lead) return
    setSavingNotes(true)
    await dispatch(updateLead({ id: lead.id, notes }))
    setSavingNotes(false)
  }

  async function handleSaveDetails(e: FormEvent) {
    e.preventDefault()
    if (!lead) return
    setSavingDetails(true)
    await dispatch(
      updateLead({
        id: lead.id,
        title,
        source: source || undefined,
      }),
    )
    setSavingDetails(false)
  }

  if (currentError || !lead) {
    return (
      <DetailLoadState
        record={lead}
        error={currentError}
        backTo="/leads"
        backLabel="← Back to leads"
      >
        <span />
      </DetailLoadState>
    )
  }

  return (
    <div>
      <PageHeader
        title={lead.title}
        description={lead.source ? `Source: ${lead.source}` : 'Lead details'}
        action={
          <div className="flex items-center gap-3">
            {(isManager || lead.assignedToId === user?.id) && (
              <DeleteRecordButton
                recordLabel={lead.title}
                redirectTo="/leads"
                onDelete={() => dispatch(deleteLead(lead.id))}
              />
            )}
            <Link
              to="/leads"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              ← Back to leads
            </Link>
          </div>
        }
      />

      <div className="mb-6 space-y-6">
        <AiEmailGenerator
          leadId={lead.id}
          compact
          onSavedToTimeline={refreshTimeline}
        />
        <MeetingSummaryPanel leadId={lead.id} onSaved={refreshTimeline} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AddActivityForm leadId={lead.id} onAdded={refreshTimeline} />
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Timeline</h2>
            <ActivityTimeline
              activities={activities}
              loading={activitiesLoading}
              currentUserId={user?.id}
              isManager={isManager}
              onDeleteActivity={(activityId) =>
                dispatch(deleteActivity(activityId))
              }
              onUpdateActivity={(activityId, patch) =>
                dispatch(updateActivity({ id: activityId, ...patch }))
              }
            />
          </section>
        </div>

        <aside className="space-y-4">
          <form
            onSubmit={handleSaveDetails}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-900">Lead details</h3>
            <div className="mt-3 space-y-3">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Title"
              />
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Source"
              />
            </div>
            <button
              type="submit"
              disabled={savingDetails}
              className="mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingDetails ? 'Saving...' : 'Save details'}
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Status</h3>
            <select
              value={lead.status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <AssigneeSelect
              value={lead.assignedToId ?? ''}
              onChange={handleAssigneeChange}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Linked contact</h3>
            <select
              value={lead.contactId ?? ''}
              onChange={(e) => handleContactChange(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                  {c.account ? ` (${c.account.name})` : ''}
                </option>
              ))}
            </select>
            {lead.contact && (
              <Link
                to={`/contacts/${lead.contact.id}`}
                className="mt-2 inline-block text-sm text-brand-600 hover:underline"
              >
                View contact profile →
              </Link>
            )}
          </div>

          <form
            onSubmit={handleSaveNotes}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              placeholder="ICP fit, pain points, internal notes..."
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={savingNotes}
              className="mt-3 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
            >
              {savingNotes ? 'Saving...' : 'Save notes'}
            </button>
          </form>
        </aside>
      </div>
    </div>
  )
}
