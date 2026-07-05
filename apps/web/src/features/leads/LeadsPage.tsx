import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Upload, RefreshCw } from 'lucide-react'
import { PageHeader } from '../../shared/components/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { LeadScoreBadge } from '../../shared/components/LeadScoreBadge'
import { ListPagination } from '../../shared/components/ListPagination'
import { useListQuery } from '../../shared/hooks/useListQuery'
import { LEAD_STATUS_LABELS } from '../../shared/constants/pipeline'
import { parseLeadsCsv } from '../../shared/utils/csv'
import type { LeadStatus } from '../../shared/types'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchContacts } from '../../store/contactsSlice'
import { useRole } from '../../shared/hooks/useRole'
import { fetchTeam } from '../../store/teamSlice'
import { ListErrorBanner } from '../../shared/components/ListErrorBanner'
import { ListPageSkeleton } from '../../shared/components/Skeleton'
import { useToast } from '../../shared/components/ToastProvider'
import { api } from '../../shared/api/client'
import { createLead, fetchLeads, importLeads } from '../../store/leadsSlice'

export function LeadsPage() {
  const dispatch = useAppDispatch()
  const { success, error: toastError } = useToast()
  const { isManager } = useRole()
  const { items, loading, error, page, pageSize, total, totalPages } =
    useAppSelector((state) => state.leads)
  const { page: queryPage, pageSize: queryPageSize, onPageChange, onPageSizeChange, resetPage } =
    useListQuery(pageSize)
  const { members } = useAppSelector((state) => state.team)
  const { items: contacts } = useAppSelector((state) => state.contacts)
  const fileRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('Inbound')
  const [contactId, setContactId] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [recalculating, setRecalculating] = useState(false)

  useEffect(() => {
    dispatch(fetchContacts({ pageSize: 100 }))
    if (isManager) dispatch(fetchTeam())
  }, [dispatch, isManager])

  useEffect(() => {
    resetPage()
  }, [search, statusFilter, assignedFilter, resetPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchLeads({
          q: search || undefined,
          status: statusFilter || undefined,
          assignedTo: assignedFilter || undefined,
          page: queryPage,
          pageSize: queryPageSize,
        }),
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [dispatch, search, statusFilter, assignedFilter, queryPage, queryPageSize])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await dispatch(
      createLead({
        title,
        source,
        contactId: contactId || undefined,
      }),
    )
    success('Lead created')
    setTitle('')
    setContactId('')
    setShowForm(false)
  }

  async function handleCsvUpload(file: File) {
    setImportError(null)
    setImporting(true)
    try {
      const text = await file.text()
      const rows = parseLeadsCsv(text)
      if (rows.length === 0) {
        throw new Error('No valid rows found in CSV')
      }
      const leads = rows.map((row) => ({
        title: row.title,
        source: row.source,
        notes: row.notes,
        status: ['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'].includes(
          row.status ?? '',
        )
          ? (row.status as LeadStatus)
          : undefined,
      }))
      await dispatch(importLeads(leads))
      success(`Imported ${leads.length} lead(s)`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setImportError(message)
      toastError(message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRecalculateScores() {
    setRecalculating(true)
    try {
      const result = await api<{ updated: number }>('/api/leads/recalculate-scores', {
        method: 'POST',
      })
      success(`Recalculated scores for ${result.updated} lead(s).`)
      dispatch(fetchLeads({ page: queryPage, pageSize: queryPageSize }))
    } catch {
      toastError('Failed to recalculate lead scores.')
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Lead Management"
        description="Track prospects and accounts for your B2B SaaS pipeline"
        action={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleCsvUpload(file)
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="btn-secondary"
            >
              <Upload size={16} />
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
            {isManager && (
              <button
                type="button"
                onClick={() => void handleRecalculateScores()}
                disabled={recalculating}
                className="btn-secondary"
              >
                <RefreshCw size={16} className={recalculating ? 'animate-spin' : ''} />
                {recalculating ? 'Scoring...' : 'Recalculate scores'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="btn-primary"
            >
              {showForm ? 'Cancel' : 'Add lead'}
            </button>
          </div>
        }
      />

      <ListErrorBanner error={error} />

      <div className="card mb-4 flex flex-wrap gap-3 p-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leads..."
          className="input-field max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')}
          className="select-field w-auto min-w-[10rem]"
        >
          <option value="">All statuses</option>
          {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {isManager && (
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="select-field w-auto min-w-[10rem]"
          >
            <option value="">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {m.user.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {importError && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {importError}
        </p>
      )}

      <p className="mb-4 text-xs text-slate-500">
        CSV format: <code>title,source,status,notes</code> (header row required)
      </p>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="card mb-6 p-5"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="form-label">Lead title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Acme Corp — VP Engineering"
                className="input-field"
              />
            </div>
            <div>
              <label className="form-label">Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="select-field"
              >
                <option>Inbound</option>
                <option>Outbound</option>
                <option>Referral</option>
                <option>Event</option>
              </select>
            </div>
            <div>
              <label className="form-label">Contact (optional)</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className="select-field"
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
          <button type="submit" className="btn-primary mt-4">
            Save lead
          </button>
        </form>
      )}

      {loading ? (
        <ListPageSkeleton rows={8} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Add your first prospect or import a CSV to get started."
          action={
            <button type="button" onClick={() => setShowForm(true)} className="btn-primary">
              Add your first lead
            </button>
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((lead) => (
              <Link
                key={lead.id}
                to={`/leads/${lead.id}`}
                className="card card-hover block p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-brand-600">{lead.title}</p>
                  <LeadScoreBadge score={lead.score} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {LEAD_STATUS_LABELS[lead.status]}
                  {lead.source ? ` · ${lead.source}` : ''}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {lead.assignedTo?.name ?? 'Unassigned'} ·{' '}
                  {new Date(lead.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>

          <div className="card hidden overflow-hidden md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3 font-medium">Lead</th>
                <th className="px-4 py-3 font-medium">Score</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr key={lead.id} className="list-row">
                  <td className="px-4 py-3">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {lead.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <LeadScoreBadge score={lead.score} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {LEAD_STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.contact
                      ? `${lead.contact.firstName} ${lead.contact.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.assignedTo?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.source ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(lead.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 md:mt-0 md:border-0 md:px-0">
            <ListPagination
              pagination={{ page, pageSize, total, totalPages }}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              loading={loading}
            />
          </div>
        </>
      )}
    </div>
  )
}
