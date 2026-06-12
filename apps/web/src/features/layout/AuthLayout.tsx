import { Link, Outlet } from 'react-router-dom'
import { AppFooter } from './AppFooter'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <Link to="/login" className="inline-flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            AI
          </span>
          <span className="text-sm font-semibold text-slate-900">
            AI Sales Assistant CRM
          </span>
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  )
}
