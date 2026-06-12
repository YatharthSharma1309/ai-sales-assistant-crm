import { Link } from 'react-router-dom'
import { CheckCircle2, Circle } from 'lucide-react'
import type { OnboardingStatus } from '../../shared/types/team'

const STEPS = [
  { key: 'hasAccount' as const, label: 'Add an account', to: '/accounts' },
  { key: 'hasContact' as const, label: 'Add a contact', to: '/contacts' },
  { key: 'hasLead' as const, label: 'Create a lead', to: '/leads' },
  { key: 'hasDeal' as const, label: 'Add a pipeline deal', to: '/pipeline' },
  {
    key: 'hasActivity' as const,
    label: 'Log an activity on a lead or deal',
    to: '/leads',
  },
]

type OnboardingWizardProps = {
  status: OnboardingStatus
  onDismiss?: () => void
}

export function OnboardingWizard({ status, onDismiss }: OnboardingWizardProps) {
  if (status.completed) return null

  const doneCount = STEPS.filter((s) => status.steps[s.key]).length

  return (
    <section className="mb-8 rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Get started
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Set up your B2B SaaS CRM workspace
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {doneCount} of {STEPS.length} steps complete
          </p>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Hide setup checklist"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Hide checklist
          </button>
        )}
      </div>

      <div className="mt-2 h-2 rounded-full bg-brand-100">
        <div
          className="h-2 rounded-full bg-brand-500 transition-all"
          style={{ width: `${(doneCount / STEPS.length) * 100}%` }}
        />
      </div>

      <ul className="mt-5 space-y-3">
        {STEPS.map((step) => {
          const done = status.steps[step.key]
          return (
            <li key={step.key}>
              <Link
                to={step.to}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                  done
                    ? 'border-green-200 bg-green-50 text-green-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'
                }`}
              >
                {done ? (
                  <CheckCircle2 size={18} className="shrink-0 text-green-600" />
                ) : (
                  <Circle size={18} className="shrink-0 text-slate-300" />
                )}
                {step.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
