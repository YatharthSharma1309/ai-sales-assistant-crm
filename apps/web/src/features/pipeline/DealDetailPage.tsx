import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { ActivityTimeline } from '../../shared/components/ActivityTimeline'
import { AddActivityForm } from '../../shared/components/AddActivityForm'
import {
  DEAL_STAGES,
  getStageLabel,
  STAGE_DEFAULT_PROBABILITY,
} from '../../shared/constants/pipeline'
import type { DealStage } from '../../shared/types'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  clearActivities,
  deleteActivity,
  fetchActivities,
  updateActivity,
} from '../../store/activitiesSlice'
import { fetchAccounts } from '../../store/accountsSlice'
import { fetchContacts } from '../../store/contactsSlice'
import { DetailLoadState } from '../../shared/components/DetailLoadState'
import { DeleteRecordButton } from '../../shared/components/DeleteRecordButton'
import {
  clearCurrentDeal,
  deleteDeal,
  fetchDeal,
  updateDeal,
} from '../../store/pipelineSlice'
import { AiEmailGenerator } from '../communications/AiEmailGenerator'
import { MeetingSummaryPanel } from '../meetings/MeetingSummaryPanel'
import { AssigneeSelect } from '../../shared/components/AssigneeSelect'
import { fetchTeam } from '../../store/teamSlice'
import { useRole } from '../../shared/hooks/useRole'
import { useToast } from '../../shared/components/ToastProvider'

export function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { success, error: toastError } = useToast()
  const { isManager } = useRole()
  const { user } = useAppSelector((state) => state.auth)
  const { current: deal, currentError } = useAppSelector(
    (state) => state.pipeline,
  )
  const { items: contacts } = useAppSelector((state) => state.contacts)
  const { items: accounts } = useAppSelector((state) => state.accounts)
  const { items: activities, loading: activitiesLoading } = useAppSelector(
    (state) => state.activities,
  )
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    mrr: '',
    arr: '',
    probability: 20,
    closeDate: '',
    contactId: '',
    accountId: '',
    assignedToId: '',
  })

  useEffect(() => {
    dispatch(fetchContacts({ pageSize: 100 }))
    dispatch(fetchAccounts({ pageSize: 100 }))
    if (isManager) dispatch(fetchTeam())
  }, [dispatch, isManager])

  useEffect(() => {
    if (!id) return
    dispatch(fetchDeal(id))
    dispatch(fetchActivities({ dealId: id }))
    return () => {
      dispatch(clearCurrentDeal())
      dispatch(clearActivities())
    }
  }, [dispatch, id])

  useEffect(() => {
    if (!deal) return
    setForm({
      title: deal.title,
      mrr: deal.mrr?.toString() ?? '',
      arr: deal.arr?.toString() ?? '',
      probability: deal.probability,
      closeDate: deal.closeDate?.slice(0, 10) ?? '',
      contactId: deal.contactId ?? '',
      accountId: deal.accountId ?? '',
      assignedToId: deal.assignedToId ?? '',
    })
  }, [deal])

  function refreshTimeline() {
    if (id) dispatch(fetchActivities({ dealId: id }))
  }

  async function handleStageChange(stage: DealStage) {
    if (!deal) return
    const result = await dispatch(
      updateDeal({
        id: deal.id,
        stage,
        probability: STAGE_DEFAULT_PROBABILITY[stage],
      }),
    )
    if (updateDeal.fulfilled.match(result)) {
      success('Stage updated')
      refreshTimeline()
    } else {
      toastError('Failed to update stage')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!deal) return
    setSaving(true)
    const result = await dispatch(
      updateDeal({
        id: deal.id,
        title: form.title,
        mrr: form.mrr ? Number(form.mrr) : null,
        arr: form.arr ? Number(form.arr) : null,
        probability: form.probability,
        closeDate: form.closeDate || null,
        contactId: form.contactId || null,
        accountId: form.accountId || null,
        assignedToId: form.assignedToId || null,
      }),
    )
    setSaving(false)
    if (updateDeal.fulfilled.match(result)) {
      success('Deal saved')
    } else {
      toastError('Failed to save deal')
    }
  }

  if (currentError || !deal) {
    return (
      <DetailLoadState
        record={deal}
        error={currentError}
        backTo="/pipeline"
        backLabel="← Back to pipeline"
      >
        <span />
      </DetailLoadState>
    )
  }

  const weightedArr =
    deal.arr != null
      ? Math.round((deal.arr * deal.probability) / 100)
      : null

  return (
    <div>
      <PageHeader
        title={deal.title}
        description={`${getStageLabel(deal.stage)} · ${deal.probability}% probability`}
        action={
          <div className="flex items-center gap-3">
            {(isManager || deal.assignedToId === user?.id) && (
              <DeleteRecordButton
                recordLabel={deal.title}
                redirectTo="/pipeline"
                onDelete={() => dispatch(deleteDeal(deal.id))}
              />
            )}
            <Link
              to="/pipeline"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              ← Back to pipeline
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-400">ARR</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {deal.arr != null ? `$${deal.arr.toLocaleString()}` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-400">
            Weighted value
          </p>
          <p className="mt-1 text-2xl font-semibold text-brand-600">
            {weightedArr != null ? `$${weightedArr.toLocaleString()}` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase text-slate-400">
            Close date
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {deal.closeDate
              ? new Date(deal.closeDate).toLocaleDateString()
              : '—'}
          </p>
        </div>
      </div>

      <div className="mb-6 space-y-6">
        <AiEmailGenerator
          dealId={deal.id}
          compact
          onSavedToTimeline={refreshTimeline}
        />
        <MeetingSummaryPanel dealId={deal.id} onSaved={refreshTimeline} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AddActivityForm dealId={deal.id} onAdded={refreshTimeline} />
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Timeline
            </h2>
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
          {(deal.riskLevel || deal.riskNote) && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-amber-900">
                Deal risk signal
              </h3>
              {deal.riskLevel && (
                <p className="mt-1 text-xs font-medium uppercase text-amber-700">
                  {deal.riskLevel} risk
                </p>
              )}
              {deal.riskNote && (
                <p className="mt-2 text-sm text-amber-900">{deal.riskNote}</p>
              )}
              <p className="mt-2 text-xs text-amber-700">
                Updated from the latest meeting summary.
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Stage</h3>
            <select
              value={deal.stage}
              onChange={(e) =>
                handleStageChange(e.target.value as DealStage)
              }
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Stage changes are logged to the timeline automatically.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-slate-900">
              Deal details
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Title
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    MRR ($)
                  </label>
                  <input
                    type="number"
                    value={form.mrr}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, mrr: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    ARR ($)
                  </label>
                  <input
                    type="number"
                    value={form.arr}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, arr: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Probability ({form.probability}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={form.probability}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      probability: Number(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Expected close
                </label>
                <input
                  type="date"
                  value={form.closeDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, closeDate: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Account
                </label>
                <select
                  value={form.accountId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, accountId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <AssigneeSelect
                value={form.assignedToId}
                onChange={(id) =>
                  setForm((f) => ({ ...f, assignedToId: id }))
                }
              />
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Contact
                </label>
                <select
                  value={form.contactId}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactId: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>

          {(deal.contact || deal.account) && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Linked to</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {deal.account && (
                  <li>
                    <Link
                      to={`/accounts/${deal.account.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {deal.account.name}
                    </Link>
                  </li>
                )}
                {deal.contact && (
                  <li>
                    <Link
                      to={`/contacts/${deal.contact.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {deal.contact.firstName} {deal.contact.lastName}
                    </Link>
                  </li>
                )}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
