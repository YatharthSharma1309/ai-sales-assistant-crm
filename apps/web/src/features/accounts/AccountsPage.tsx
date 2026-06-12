import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { EmptyState } from '../../shared/components/EmptyState'
import { ListPagination } from '../../shared/components/ListPagination'
import { useListQuery } from '../../shared/hooks/useListQuery'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { ListErrorBanner } from '../../shared/components/ListErrorBanner'
import { createAccount, fetchAccounts } from '../../store/accountsSlice'

export function AccountsPage() {
  const dispatch = useAppDispatch()
  const { items, loading, error, page, pageSize, total, totalPages } =
    useAppSelector((state) => state.accounts)
  const { page: queryPage, pageSize: queryPageSize, onPageChange, onPageSizeChange, resetPage } =
    useListQuery(pageSize)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')

  useEffect(() => {
    resetPage()
  }, [search, resetPage])

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchAccounts({
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
      createAccount({
        name,
        industry: industry || undefined,
        companySize: companySize || undefined,
      }),
    )
    setName('')
    setIndustry('')
    setCompanySize('')
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="B2B companies in your CRM"
        action={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? 'Cancel' : 'Add account'}
          </button>
        }
      />

      <ListErrorBanner error={error} />

      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search accounts..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Company name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Industry
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="SaaS, FinTech..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Company size
              </label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option>1-50</option>
                <option>51-200</option>
                <option>201-1000</option>
                <option>1000+</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Save account
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading accounts...</p>
      ) : items.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          description="Add companies you sell to — contacts and deals link back here."
          action={
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            >
              Add first account
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Company</th>
                <th className="px-4 py-3 font-medium">Industry</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Contacts</th>
              </tr>
            </thead>
            <tbody>
              {items.map((account) => (
                <tr key={account.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to={`/accounts/${account.id}`}
                      className="font-medium text-brand-600 hover:underline"
                    >
                      {account.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {account.industry ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {account.companySize ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {account._count?.contacts ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-slate-200 px-4">
            <ListPagination
              pagination={{ page, pageSize, total, totalPages }}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              loading={loading}
            />
          </div>
        </div>
      )}
    </div>
  )
}
