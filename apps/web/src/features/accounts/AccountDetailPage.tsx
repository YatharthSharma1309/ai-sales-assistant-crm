import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { DetailLoadState } from '../../shared/components/DetailLoadState'
import { DeleteRecordButton } from '../../shared/components/DeleteRecordButton'
import { useRole } from '../../shared/hooks/useRole'
import {
  clearCurrentAccount,
  deleteAccount,
  fetchAccount,
  updateAccount,
} from '../../store/accountsSlice'
import { useToast } from '../../shared/components/ToastProvider'

export function AccountDetailPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const { success, error: toastError } = useToast()
  const { isManager } = useRole()
  const { current: account, currentError } = useAppSelector(
    (state) => state.accounts,
  )
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '',
    industry: '',
    companySize: '',
    website: '',
  })

  useEffect(() => {
    if (id) dispatch(fetchAccount(id))
    return () => {
      dispatch(clearCurrentAccount())
    }
  }, [dispatch, id])

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name,
        industry: account.industry ?? '',
        companySize: account.companySize ?? '',
        website: account.website ?? '',
      })
    }
  }, [account])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!account) return
    const result = await dispatch(
      updateAccount({
        id: account.id,
        name: form.name,
        industry: form.industry || undefined,
        companySize: form.companySize || undefined,
        website: form.website || undefined,
      }),
    )
    if (updateAccount.fulfilled.match(result)) {
      success('Account saved')
      setEditing(false)
    } else {
      toastError('Failed to save account')
    }
  }

  if (currentError || !account) {
    return (
      <DetailLoadState
        record={account}
        error={currentError}
        backTo="/accounts"
        backLabel="← Back to accounts"
      >
        <span />
      </DetailLoadState>
    )
  }

  return (
    <div>
      <PageHeader
        title={account.name}
        description={[account.industry, account.companySize]
          .filter(Boolean)
          .join(' · ') || 'Account details'}
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
                recordLabel={account.name}
                redirectTo="/accounts"
                onDelete={() => dispatch(deleteAccount(account.id))}
              />
            )}
            <Link
              to="/accounts"
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
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              placeholder="Industry"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.companySize}
              onChange={(e) => setForm({ ...form, companySize: e.target.value })}
              placeholder="Company size"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              placeholder="Website"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Save changes
          </button>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
          {account.contacts && account.contacts.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {account.contacts.map((contact) => (
                <li key={contact.id} className="py-3">
                  <Link
                    to={`/contacts/${contact.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {contact.firstName} {contact.lastName}
                  </Link>
                  <p className="text-sm text-slate-500">
                    {contact.jobTitle ?? 'No title'}
                    {contact.email ? ` · ${contact.email}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No contacts linked yet.</p>
          )}
          <Link
            to="/contacts"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            Manage contacts →
          </Link>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Deals</h2>
          {account.deals && account.deals.length > 0 ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {account.deals.map((deal) => (
                <li key={deal.id} className="flex justify-between py-3 text-sm">
                  <Link
                    to={`/pipeline/${deal.id}`}
                    className="font-medium text-brand-600 hover:underline"
                  >
                    {deal.title}
                  </Link>
                  <span className="text-slate-500">{deal.stage.replace(/_/g, ' ')}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No deals for this account.</p>
          )}
          <Link
            to="/pipeline"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            View pipeline →
          </Link>
        </section>
      </div>
    </div>
  )
}
