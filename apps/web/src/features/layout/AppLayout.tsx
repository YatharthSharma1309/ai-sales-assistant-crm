import { useState } from 'react'
import { useSyncRole } from '../../shared/hooks/useSyncRole'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  Kanban,
  LayoutDashboard,
  Mail,
  Plug,
  Settings,
  UserCircle,
  Users,
  UsersRound,
  Video,
  X,
} from 'lucide-react'
import { useRole } from '../../shared/hooks/useRole'
import { useAppSelector } from '../../store/hooks'
import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'

const baseNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Building2 },
  { to: '/contacts', label: 'Contacts', icon: UserCircle },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/meetings', label: 'Meetings', icon: Video },
  { to: '/communications', label: 'AI Emails', icon: Mail },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

export function AppLayout() {
  const { organization } = useAppSelector((state) => state.auth)
  const { isManager } = useRole()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useSyncRole()

  const navItems = [
    ...baseNavItems,
    ...(isManager
      ? [{ to: '/team', label: 'Team', icon: UsersRound }]
      : []),
    { to: '/integrations', label: 'Integrations', icon: Plug },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  const sidebar = (
    <>
      <div className="flex items-center justify-between border-b border-slate-700 px-6 py-5 lg:block">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            AI Sales CRM
          </p>
          <p className="mt-1 truncate text-sm font-medium">
            {organization?.name ?? 'Workspace'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          aria-label="Close navigation menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  )

  return (
    <div className="flex min-h-screen">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close navigation menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-white transition-transform lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <AppHeader onMenuToggle={() => setMobileNavOpen((open) => !open)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto p-4 outline-none sm:p-8"
        >
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  )
}
