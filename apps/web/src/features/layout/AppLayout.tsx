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
import { MobileBottomNav } from './MobileBottomNav'
import { AppLogo } from '../../shared/components/AppLogo'

const crmNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/accounts', label: 'Accounts', icon: Building2 },
  { to: '/contacts', label: 'Contacts', icon: UserCircle },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
]

const aiNav = [
  { to: '/meetings', label: 'Meetings', icon: Video },
  { to: '/communications', label: 'AI Emails', icon: Mail },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
]

function NavSection({
  title,
  items,
  onNavigate,
}: {
  title: string
  items: { to: string; label: string; icon: typeof LayoutDashboard }[]
  onNavigate: () => void
}) {
  return (
    <div className="mb-4">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export function AppLayout() {
  const { organization } = useAppSelector((state) => state.auth)
  const { isManager } = useRole()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useSyncRole()

  const adminNav = [
    ...(isManager
      ? [{ to: '/team', label: 'Team', icon: UsersRound }]
      : []),
    { to: '/integrations', label: 'Integrations', icon: Plug },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  const closeNav = () => setMobileNavOpen(false)

  const sidebar = (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo
              size="md"
              variant="onDark"
              showWordmark
              title="AI Sales CRM"
              subtitle={organization?.name ?? 'Workspace'}
            />
          </div>
          <button
            type="button"
            onClick={closeNav}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavSection title="CRM" items={crmNav} onNavigate={closeNav} />
        <NavSection title="AI & Insights" items={aiNav} onNavigate={closeNav} />
        <NavSection title="Workspace" items={adminNav} onNavigate={closeNav} />
      </nav>
    </>
  )

  return (
    <div className="flex min-h-screen">
      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          aria-label="Close navigation menu"
          onClick={closeNav}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-sidebar text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </aside>

      <div className="app-shell flex min-h-screen min-w-0 flex-1 flex-col">
        <AppHeader onMenuToggle={() => setMobileNavOpen((open) => !open)} />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-auto px-4 py-6 pb-24 outline-none sm:px-8 sm:py-8 lg:pb-8"
        >
          <Outlet />
        </main>

        <MobileBottomNav />
        <AppFooter />
      </div>
    </div>
  )
}
