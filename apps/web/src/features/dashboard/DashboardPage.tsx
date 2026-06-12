import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { StatCard } from '../../shared/components/StatCard'
import { HealthIndicator } from '../../shared/components/HealthIndicator'
import { useRole } from '../../shared/hooks/useRole'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchDashboardForecast,
  fetchDashboardStats,
  fetchManagerDashboard,
  fetchOnboardingStatus,
} from '../../store/dashboardSlice'
import { DEAL_STAGES, isOpenStage } from '../../shared/constants/pipeline'
import { OnboardingWizard } from '../onboarding/OnboardingWizard'
import { ManagerOverview } from './ManagerOverview'

const ONBOARDING_DISMISS_KEY = 'crm_onboarding_dismissed'

export function DashboardPage() {
  const dispatch = useAppDispatch()
  const { isManager } = useRole()
  const {
    stats,
    forecast,
    manager,
    onboarding,
    loading,
    forecastLoading,
    managerLoading,
    error,
    forecastError,
    managerError,
  } = useAppSelector((state) => state.dashboard)
  const { organization } = useAppSelector((state) => state.auth)
  const [searchParams, setSearchParams] = useSearchParams()
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_DISMISS_KEY) === 'true',
  )
  const [teamAccessNoticeDismissed, setTeamAccessNoticeDismissed] = useState(
    () => searchParams.get('notice') !== 'team-access',
  )

  useEffect(() => {
    if (searchParams.get('notice') !== 'team-access') return

    if (isManager) {
      const next = new URLSearchParams(searchParams)
      next.delete('notice')
      setSearchParams(next, { replace: true })
      return
    }

    setTeamAccessNoticeDismissed(false)
  }, [searchParams, isManager, setSearchParams])

  const showTeamAccessNotice =
    !isManager &&
    !teamAccessNoticeDismissed &&
    searchParams.get('notice') === 'team-access'

  useEffect(() => {
    dispatch(fetchDashboardStats())
    dispatch(fetchDashboardForecast())
    dispatch(fetchOnboardingStatus())
    if (isManager) dispatch(fetchManagerDashboard())

    function onFocus() {
      dispatch(fetchOnboardingStatus())
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [dispatch, isManager])

  const stageMap = new Map(
    stats?.dealsByStage?.map((s) => [s.stage, s.count]) ?? [],
  )

  const weightedPipeline = forecast?.weightedPipeline ?? stats?.weightedPipeline ?? 0
  const forecastPipeline = forecast?.forecastPipeline ?? 0

  return (
    <div>
      <PageHeader
        title={`Welcome back${organization ? `, ${organization.name}` : ''}`}
        description={
          isManager
            ? 'Manager overview — team pipeline and activity'
            : 'Your B2B SaaS sales command center'
        }
      />

      {showTeamAccessNotice && (
        <div
          role="alert"
          aria-labelledby="team-access-notice"
          className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p id="team-access-notice">
            You don&apos;t have permission to access Team. Team management is
            available to managers and admins only.
          </p>
          <button
            type="button"
            aria-label="Dismiss team access notice"
            onClick={() => {
              setTeamAccessNoticeDismissed(true)
              const next = new URLSearchParams(searchParams)
              next.delete('notice')
              setSearchParams(next, { replace: true })
            }}
            className="shrink-0 font-medium text-amber-800 hover:text-amber-950"
          >
            Got it
          </button>
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {forecastError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {forecastError}
        </p>
      )}

      {onboarding && !onboardingDismissed && (
        <OnboardingWizard
          status={onboarding}
          onDismiss={() => {
            localStorage.setItem(ONBOARDING_DISMISS_KEY, 'true')
            setOnboardingDismissed(true)
          }}
        />
      )}

      {managerError && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {managerError}
        </p>
      )}

      {isManager && manager && (
        <div className="mb-8">
          <ManagerOverview data={manager} loading={managerLoading} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={loading ? '—' : (stats?.leadCount ?? 0)}
        />
        <StatCard
          label="Open Deals"
          value={loading ? '—' : (stats?.dealCount ?? 0)}
        />
        <StatCard
          label="Weighted Pipeline"
          value={
            forecastLoading
              ? '—'
              : `$${Math.round(weightedPipeline).toLocaleString()}`
          }
        />
        <StatCard
          label="Forecast Pipeline"
          value={
            forecastLoading
              ? '—'
              : `$${Math.round(forecastPipeline).toLocaleString()}`
          }
        />
      </div>

      {forecast?.pipelineHealth && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <HealthIndicator
            score={forecast.pipelineHealth.score}
            label={forecast.pipelineHealth.label}
          />
          {forecast.pipelineHealth.dealsAtRisk > 0 && (
            <p className="mt-3 text-sm text-slate-600">
              {forecast.pipelineHealth.dealsAtRisk} deal
              {forecast.pipelineHealth.dealsAtRisk === 1 ? '' : 's'} at risk
              (stale &gt; 14 days)
            </p>
          )}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Pipeline snapshot</h2>
          <div className="mt-4 space-y-3">
            {DEAL_STAGES.filter((s) => isOpenStage(s.id)).map(
              (stage) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-slate-600">{stage.label}</span>
                  <span className="font-medium text-slate-900">
                    {stageMap.get(stage.id) ?? 0}
                  </span>
                </div>
              ),
            )}
          </div>
          <Link
            to="/pipeline"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            View pipeline →
          </Link>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              to="/leads"
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Add a new lead
            </Link>
            <Link
              to="/pipeline"
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Create a deal
            </Link>
            <Link
              to="/communications"
              className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              Generate AI follow-up email
            </Link>
            <Link
              to="/meetings"
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Summarize a meeting
            </Link>
            {isManager && (
              <Link
                to="/team"
                className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View team dashboard
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
