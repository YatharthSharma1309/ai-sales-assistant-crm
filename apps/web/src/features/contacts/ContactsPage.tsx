import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { ListPagination } from '../../shared/components/ListPagination'
import { ListPageSkeleton } from '../../shared/components/Skeleton'
import { useListQuery } from '../../shared/hooks/useListQuery'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { fetchAccounts } from '../../store/accountsSlice'
import { ListErrorBanner } from '../../shared/components/ListErrorBanner'
import { createContact, fetchContacts } from '../../store/contactsSlice'

export function ContactsPage() {
  const dispatch = useAppDispatch()
  const { items, loading, error, page, pageSize, total, totalPages } =
    useAppSelector((state) => state.contacts)
  const { page: queryPage, pageSize: queryPageSize, onPageChange, onPageSizeChange, resetPage } =
    useListQuery(pageSize)
  const { items: accounts } = useAppSelector((state) => state.accounts)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    jobTitle: '',
    accountId: '',
  })

  useEffect(() => {
    dispatch(fetchAccounts({ pageSize: 100 }))
  }, [dispatch])

  useEffect(() => {
    resetPage()
  }, [search, resetPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchContacts({
          q: search || undefined,
          page: queryPage,
          pageSize: queryPageSize,
        }),
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [dispatch, search, queryPage, queryPageSize])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await dispatch(
      createContact({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || undefined,
        jobTitle: form.jobTitle || undefined,
        accountId: form.accountId || undefined,
      }),
    )
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      jobTitle: '',
      accountId: '',
    })
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="People you sell to at each account"
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : 'Add contact'}
          </button>
        }
      />

      <ListErrorBanner error={error} />

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['firstName', 'First name'],
              ['lastName', 'Last name'],
              ['email', 'Email'],
              ['jobTitle', 'Job title'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  {label}
                </label>
                <input
                  required={key === 'firstName' || key === 'lastName'}
                  type={key === 'email' ? 'email' : 'text'}
                  value={form[key as keyof typeof form]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Account
              </label>
              <select
                value={form.accountId}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, accountId: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">No account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Save contact
          </button>
        </form>
      )}

      {loading ? (
        <ListPageSkeleton rows={6} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No contacts yet"
          description="Add decision-makers and champions at your target accounts."
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((contact) => (
              <Link
                key={contact.id}
                to={`/contacts/${contact.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-medium text-brand-600">
                  {contact.firstName} {contact.lastName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {contact.jobTitle ?? 'No title'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {contact.account?.name ?? 'No account'} ·{' '}
                  {contact.email ?? 'No email'}
                </p>
              </Link>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Email</th>
              </tr>
            </thead>
            <tbody>
              {items.map((contact) => (
                <tr key={contact.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to={`/contacts/${contact.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {contact.firstName} {contact.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {contact.jobTitle ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
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
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {contact.email ?? '—'}
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
