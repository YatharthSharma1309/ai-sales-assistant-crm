import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { ActivityTimeline } from '../../shared/components/ActivityTimeline'
import { AddActivityForm } from '../../shared/components/AddActivityForm'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  clearActivities,
  deleteActivity,
  fetchActivities,
  updateActivity,
} from '../../store/activitiesSlice'
import { DetailLoadState } from '../../shared/components/DetailLoadState'
import { DeleteRecordButton } from '../../shared/components/DeleteRecordButton'
import { fetchAccounts } from '../../store/accountsSlice'
import { useRole } from '../../shared/hooks/useRole'
import {
  clearCurrentContact,
  deleteContact,
  fetchContact,
  updateContact,
} from '../../store/contactsSlice'
import { useToast } from '../../shared/components/ToastProvider'
import { MeetingSummaryPanel } from '../meetings/MeetingSummaryPanel'

export function ContactDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { success, error: toastError } = useToast()
  const { isManager } = useRole()
  const { user } = useAppSelector((state) => state.auth)
  const { current: contact, currentError } = useAppSelector(
    (state) => state.contacts,
  )
  const { items: accounts } = useAppSelector((state) => state.accounts)
  const { items: activities, loading: activitiesLoading } = useAppSelector(
    (state) => state.activities,
  )
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    phone: '',
    accountId: '',
  })

  useEffect(() => {
    dispatch(fetchAccounts({ pageSize: 100 }))
  }, [dispatch])

  useEffect(() => {
    if (!id) return
    dispatch(fetchContact(id))
    dispatch(fetchActivities({ contactId: id }))
    return () => {
      dispatch(clearCurrentContact())
      dispatch(clearActivities())
    }
  }, [dispatch, id])

  useEffect(() => {
    if (contact) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? '',
        jobTitle: contact.jobTitle ?? '',
        phone: contact.phone ?? '',
        accountId: contact.accountId ?? '',
      })
    }
  }, [contact])

  function refreshTimeline() {
    if (id) dispatch(fetchActivities({ contactId: id }))
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!contact) return
    const result = await dispatch(
      updateContact({
        id: contact.id,
        ...form,
        email: form.email || undefined,
        accountId: form.accountId || null,
      }),
    )
    if (updateContact.fulfilled.match(result)) {
      success('Contact saved')
      setEditing(false)
    } else {
      toastError('Failed to save contact')
    }
  }

  if (currentError || !contact) {
    return (
      <DetailLoadState
        record={contact}
        error={currentError}
        backTo="/contacts"
        backLabel="← Back to contacts"
      >
        <span />
      </DetailLoadState>
    )
  }

  return (
    <div>
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={
          [
            contact.jobTitle,
            contact.account?.name,
            contact.email,
          ]
            .filter(Boolean)
            .join(' · ') || 'Contact profile'
        }
        action={
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
            {isManager && (
              <DeleteRecordButton
                recordLabel={`${contact.firstName} ${contact.lastName}`}
                redirectTo="/contacts"
                onDelete={() => dispatch(deleteContact(contact.id))}
              />
            )}
            <Link
              to="/contacts"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              ← Back
            </Link>
          </div>
        }
      />

      {editing && (
        <form
          onSubmit={handleSave}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.jobTitle}
              onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="Job title"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
            >
              <option value="">No account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Save changes
          </button>
        </form>
      )}

      <div className="mb-6">
        <MeetingSummaryPanel contactId={contact.id} onSaved={refreshTimeline} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AddActivityForm contactId={contact.id} onAdded={refreshTimeline} />
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-900">{contact.phone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Account</dt>
                <dd>
                  {contact.account ? (
                    <Link
                      to={`/accounts/${contact.account.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {contact.account.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {contact.leads && contact.leads.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Linked leads</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {contact.leads.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      to={`/leads/${lead.id}`}
                      className="text-brand-600 hover:underline"
                    >
                      {lead.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
