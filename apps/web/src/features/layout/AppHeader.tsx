import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Menu, Settings, User } from 'lucide-react'
import { ROLE_LABELS } from '../../shared/constants/roles'
import { getBreadcrumbLabels } from '../../shared/lib/routeLabels'
import { useRole } from '../../shared/hooks/useRole'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { signOut } from '../../store/authSlice'

type AppHeaderProps = {
  onMenuToggle: () => void
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, organization } = useAppSelector((state) => state.auth)
  const { role } = useRole()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const breadcrumbs = getBreadcrumbLabels(location.pathname)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout() {
    await dispatch(signOut())
    navigate('/login')
  }

  function handleSkipToMain() {
    const main = document.getElementById('main-content')
    main?.focus()
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          handleSkipToMain()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
            {breadcrumbs.map((label, index) => (
              <span key={`${label}-${index}`} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight size={14} className="shrink-0 text-slate-400" />
                )}
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? 'truncate font-medium text-slate-900'
                      : 'truncate text-slate-500'
                  }
                >
                  {label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {organization && (
            <p className="hidden truncate text-sm text-slate-600 md:block">
              {organization.name}
            </p>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-sm hover:bg-slate-50"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <User size={14} />
              </span>
              <span className="hidden max-w-[8rem] truncate font-medium text-slate-900 sm:inline">
                {user?.name}
              </span>
              {role && (
                <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 lg:inline">
                  {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
