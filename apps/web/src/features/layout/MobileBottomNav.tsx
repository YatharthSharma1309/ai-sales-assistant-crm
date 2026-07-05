import { NavLink } from 'react-router-dom'
import {
  Kanban,
  LayoutDashboard,
  Mail,
  Settings,
  Users,
} from 'lucide-react'

const items = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/pipeline', label: 'Pipeline', icon: Kanban },
  { to: '/communications', label: 'AI', icon: Mail },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Mobile navigation"
    >
      <ul className="flex justify-around">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-w-[4rem] flex-col items-center gap-0.5 px-2 py-2.5 text-[10px] font-medium ${
                  isActive ? 'text-brand-600' : 'text-slate-500'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
