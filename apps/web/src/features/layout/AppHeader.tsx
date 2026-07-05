import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, Menu, Settings } from 'lucide-react'
import { AppLogo } from '../../shared/components/AppLogo'
import { GlobalSearch } from '../../shared/components/GlobalSearch'
import { ROLE_LABELS } from '../../shared/constants/roles'
import { getBreadcrumbLabels } from '../../shared/lib/routeLabels'
import { useRole } from '../../shared/hooks/useRole'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { signOut } from '../../store/authSlice'

type AppHeaderProps = {
  onMenuToggle: () => void
}

function getInitials(name?: string | null) {
  if (!name?.trim()) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
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
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <a
        href="#main-content"
        onClick={(e) => {
          e.preventDefault()
          handleSkipToMain()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>

      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-xl p-2.5 text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          <div className="hidden h-8 w-px bg-slate-200 lg:block" />

          <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 items-center gap-1 text-sm"
          >
            {breadcrumbs.map((label, index) => (
              <span key={`${label}-${index}`} className="flex items-center gap-1">
                {index > 0 && (
                  <ChevronRight size={14} className="shrink-0 text-slate-300" />
                )}
                <span
                  className={
                    index === breadcrumbs.length - 1
                      ? 'truncate font-semibold text-slate-900'
                      : 'truncate text-slate-500'
                  }
                >
                  {label}
                </span>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <GlobalSearch />

          {organization && (
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 md:flex">
              <AppLogo size="xs" variant="plain" />
              <p className="max-w-[12rem] truncate text-sm font-medium text-slate-700">
                {organization.name}
              </p>
            </div>
          )}

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-xs font-bold text-white">
                {getInitials(user?.name)}
              </span>
              <span className="hidden max-w-[8rem] truncate font-semibold text-slate-900 sm:inline">
                {user?.name}
              </span>
              {role && (
                <span className="hidden rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 lg:inline">
                  {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
                </span>
              )}
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl"
              >
                <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                </div>
                <Link
                  to="/settings"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Settings size={16} />
                  Settings
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
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
