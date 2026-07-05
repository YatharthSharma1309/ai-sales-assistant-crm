import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'

const SECTIONS = [
  { to: '/', title: 'Dashboard', desc: 'Home — numbers, onboarding checklist, pipeline health' },
  { to: '/accounts', title: 'Accounts', desc: 'Companies you sell to (e.g. Acme Corp)' },
  { to: '/contacts', title: 'Contacts', desc: 'People at those companies' },
  { to: '/leads', title: 'Leads', desc: 'Early prospects not yet qualified' },
  { to: '/pipeline', title: 'Pipeline', desc: 'Active deals on a Kanban board' },
  { to: '/meetings', title: 'Meetings', desc: 'Paste notes → AI summary + action items' },
  { to: '/communications', title: 'AI Emails', desc: 'Generate follow-up emails from CRM context' },
  { to: '/analytics', title: 'Analytics', desc: 'Charts, funnel, team performance' },
  { to: '/team', title: 'Team', desc: 'Invite coworkers, assign roles' },
  { to: '/integrations', title: 'Integrations', desc: 'Google, HubSpot, Salesforce, lead forms' },
  { to: '/settings', title: 'Settings', desc: 'Profile, password, sessions, automation' },
]

const GLOSSARY = [
  ['Lead', 'Someone who might buy'],
  ['Contact', 'A person you know details about'],
  ['Account', 'Their company'],
  ['Deal', 'A specific sales opportunity with $ value'],
  ['Pipeline', 'Where deals live, by stage'],
  ['Activity', 'Anything you did (call, email, note)'],
]

export function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help & walkthrough"
        description="What each part of the CRM does and how to use it day to day"
      />

      <section className="card mb-6 border-brand-200 bg-brand-50/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Try the demo simulation</h2>
        <p className="mt-2 text-sm text-slate-600">
          Load sample data from the repo root: <code className="rounded bg-white px-1.5 py-0.5">npm run seed:demo</code>
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-medium text-slate-700">Demo email</dt>
            <dd className="text-slate-900">demo@example.com</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-700">Demo password</dt>
            <dd className="text-slate-900">DemoPass123!</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm text-slate-500">
          Full step-by-step guide: <code>docs/BEGINNER_SIMULATION.md</code> in the GitHub repo.
        </p>
      </section>

      <section className="card mb-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Daily workflow</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Add a prospect as a <strong>Lead</strong> (or use the web capture form)</li>
          <li>Qualify them → add <strong>Contact</strong> + <strong>Account</strong></li>
          <li>Create a <strong>Deal</strong> on the <strong>Pipeline</strong> board</li>
          <li>Log calls/emails in the <strong>activity timeline</strong></li>
          <li>Use <strong>AI Emails</strong> for follow-ups and <strong>Meetings</strong> for summaries</li>
        </ol>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s.to} to={s.to} className="card card-hover block p-5">
            <h3 className="font-semibold text-brand-700">{s.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
          </Link>
        ))}
      </div>

      <section className="card mt-6 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Glossary</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {GLOSSARY.map(([term, def]) => (
            <div key={term}>
              <dt className="font-medium text-slate-900">{term}</dt>
              <dd className="text-sm text-slate-600">{def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
