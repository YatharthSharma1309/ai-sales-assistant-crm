import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PageHeader } from '../../shared/components/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import {
  isOpenStage,
  STAGE_DEFAULT_PROBABILITY,
} from '../../shared/constants/pipeline'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchAccounts } from '../../store/accountsSlice'
import { fetchContacts } from '../../store/contactsSlice'
import { useRole } from '../../shared/hooks/useRole'
import { fetchTeam } from '../../store/teamSlice'
import { ListErrorBanner } from '../../shared/components/ListErrorBanner'
import { createDeal, fetchKanbanDeals } from '../../store/pipelineSlice'
import { PipelineKanban } from './PipelineKanban'

export function PipelinePage() {
  const dispatch = useAppDispatch()
  const { isManager } = useRole()
  const {
    kanbanStages,
    kanbanPerStage,
    loading,
    error,
    total,
  } = useAppSelector((state) => state.pipeline)
  const { items: contacts } = useAppSelector((state) => state.contacts)
  const { items: accounts } = useAppSelector((state) => state.accounts)
  const { members } = useAppSelector((state) => state.team)
  const [assignedFilter, setAssignedFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    arr: '',
    mrr: '',
    contactId: '',
    accountId: '',
    closeDate: '',
  })

  useEffect(() => {
    dispatch(fetchContacts({ pageSize: 100 }))
    dispatch(fetchAccounts({ pageSize: 100 }))
    if (isManager) dispatch(fetchTeam())
  }, [dispatch, isManager])

  useEffect(() => {
    dispatch(
      fetchKanbanDeals({
        assignedTo: assignedFilter || undefined,
        perStage: kanbanPerStage,
      }),
    )
  }, [dispatch, assignedFilter, kanbanPerStage])

  const openDeals = kanbanStages.flatMap((s) => s.deals).filter((d) => isOpenStage(d.stage))
  const totalArr = openDeals.reduce((sum, d) => sum + (d.arr ?? 0), 0)
  const weightedPipeline = openDeals.reduce(
    (sum, d) => sum + ((d.arr ?? 0) * d.probability) / 100,
    0,
  )

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await dispatch(
      createDeal({
        title: form.title,
        arr: form.arr ? Number(form.arr) : undefined,
        mrr: form.mrr ? Number(form.mrr) : undefined,
        contactId: form.contactId || undefined,
        accountId: form.accountId || undefined,
        closeDate: form.closeDate || undefined,
        stage: 'DISCOVERY',
        probability: STAGE_DEFAULT_PROBABILITY.DISCOVERY,
      }),
    )
    setForm({
      title: '',
      arr: '',
      mrr: '',
      contactId: '',
      accountId: '',
      closeDate: '',
    })
    setShowForm(false)
    dispatch(
      fetchKanbanDeals({
        assignedTo: assignedFilter || undefined,
        perStage: kanbanPerStage,
      }),
    )
  }

  const hasDeals = total > 0 || kanbanStages.some((s) => s.deals.length > 0)

  return (
    <div>
      <PageHeader
        title="Pipeline"
        description="Drag deals between stages — changes sync to the timeline"
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : 'New deal'}
          </button>
        }
      />

      <ListErrorBanner error={error} />

      {isManager && (
        <div className="mb-4">
          <label className="mr-2 text-sm text-slate-600">Assignee</label>
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {hasDeals && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-400">
              Open deals
            </p>
            <p className="mt-1 text-2xl font-semibold">{total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-400">
              Pipeline ARR (loaded)
            </p>
            <p className="mt-1 text-2xl font-semibold">
              ${Math.round(totalArr).toLocaleString()}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase text-slate-400">
              Weighted forecast (loaded)
            </p>
            <p className="mt-1 text-2xl font-semibold text-brand-600">
              ${Math.round(weightedPipeline).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Deal name
              </label>
              <input
                required
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Acme — Annual subscription"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                ARR ($)
              </label>
              <input
                type="number"
                value={form.arr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, arr: e.target.value }))
                }
                placeholder="24000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                MRR ($)
              </label>
              <input
                type="number"
                value={form.mrr}
                onChange={(e) =>
                  setForm((f) => ({ ...f, mrr: e.target.value }))
                }
                placeholder="2000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
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
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create deal
          </button>
        </form>
      )}

      {loading && kanbanStages.length === 0 ? (
        <p className="text-sm text-slate-500">Loading pipeline...</p>
      ) : !hasDeals ? (
        <EmptyState
          title="Pipeline is empty"
          description="Create your first deal to start tracking revenue opportunities."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            >
              Create first deal
            </button>
          }
        />
      ) : (
        <PipelineKanban
          stages={kanbanStages}
          assignedFilter={assignedFilter}
          perStage={kanbanPerStage}
        />
      )}
    </div>
  )
}
