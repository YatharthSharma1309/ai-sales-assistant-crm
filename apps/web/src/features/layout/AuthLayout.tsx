import { Link, Outlet } from 'react-router-dom'
import { BarChart3, Kanban, Mail, Users } from 'lucide-react'
import { AppLogo } from '../../shared/components/AppLogo'
import { AppFooter } from './AppFooter'

const highlights = [
  {
    icon: Users,
    title: 'Lead scoring',
    description: 'Prioritize prospects with AI-powered scores.',
  },
  {
    icon: Kanban,
    title: 'Pipeline kanban',
    description: 'Drag deals across stages with live forecasting.',
  },
  {
    icon: Mail,
    title: 'AI email drafts',
    description: 'Generate personalized follow-ups in seconds.',
  },
  {
    icon: BarChart3,
    title: 'Team analytics',
    description: 'Track ARR, win rates, and rep activity.',
  },
]

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
      <aside className="relative hidden overflow-hidden bg-sidebar text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-600/20 via-transparent to-brand-900/30" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-brand-400/10 blur-3xl" />

        <div className="relative px-10 pt-10">
          <Link to="/login" className="inline-flex items-center gap-3">
            <AppLogo
              size="lg"
              variant="onDark"
              showWordmark
              title="AI Sales Assistant"
              subtitle="CRM for B2B SaaS teams"
            />
          </Link>

          <div className="mt-14">
            <h2 className="text-3xl font-bold leading-tight tracking-tight">
              Close more deals with
              <span className="block text-brand-300">AI-powered sales ops</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">
              Manage leads, pipeline, meetings, and outreach from one workspace —
              built for modern revenue teams.
            </p>
          </div>
        </div>

        <ul className="relative space-y-4 px-10 pb-12">
          {highlights.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="border-b border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur lg:hidden">
          <Link to="/login" className="inline-flex items-center gap-2.5">
            <AppLogo
              size="sm"
              showWordmark
              title="AI Sales Assistant CRM"
            />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  )
}
