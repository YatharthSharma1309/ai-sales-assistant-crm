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
  fetchDashboardTrends,
  fetchManagerDashboard,
  fetchOnboardingStatus,
} from '../../store/dashboardSlice'
import { DEAL_STAGES, isOpenStage } from '../../shared/constants/pipeline'
import { OnboardingWizard } from '../onboarding/OnboardingWizard'
import { ManagerOverview } from './ManagerOverview'
import { StageBarChart, TrendLineChart } from '../../shared/components/Charts'
import { ChartSkeleton } from '../../shared/components/Skeleton'

const ONBOARDING_DISMISS_KEY = 'crm_onboarding_dismissed'

export function DashboardPage() {
  const dispatch = useAppDispatch()
  const { isManager } = useRole()
  const {
    stats,
    forecast,
    trends,
    manager,
    onboarding,
    loading,
    forecastLoading,
    trendsLoading,
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
    dispatch(fetchDashboardTrends())
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
          accent="blue"
        />
        <StatCard
          label="Open Deals"
          value={loading ? '—' : (stats?.dealCount ?? 0)}
          accent="violet"
        />
        <StatCard
          label="Weighted Pipeline"
          value={
            forecastLoading
              ? '—'
              : `$${Math.round(weightedPipeline).toLocaleString()}`
          }
          accent="emerald"
        />
        <StatCard
          label="Forecast Pipeline"
          value={
            forecastLoading
              ? '—'
              : `$${Math.round(forecastPipeline).toLocaleString()}`
          }
          accent="amber"
        />
      </div>

      {forecast?.pipelineHealth && forecast.pipelineHealth.dealsAtRisk > 0 && (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4"
        >
          <p className="text-sm font-medium text-amber-900">
            {forecast.pipelineHealth.dealsAtRisk} deal
            {forecast.pipelineHealth.dealsAtRisk === 1 ? '' : 's'} stalled for
            more than 14 days
          </p>
          {forecast.pipelineHealth.staleDeals &&
            forecast.pipelineHealth.staleDeals.length > 0 && (
              <ul className="mt-2 space-y-1">
                {forecast.pipelineHealth.staleDeals.map((deal) => (
                  <li key={deal.id}>
                    <Link
                      to={`/pipeline/${deal.id}`}
                      className="text-sm text-amber-800 underline hover:text-amber-950"
                    >
                      {deal.title}
                    </Link>
                    <span className="ml-2 text-xs text-amber-700">
                      last updated{' '}
                      {new Date(deal.updatedAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          <Link
            to="/pipeline"
            className="mt-3 inline-block text-sm font-medium text-amber-900 hover:underline"
          >
            View pipeline →
          </Link>
        </div>
      )}

      {forecast?.pipelineHealth && (
        <div className="card mt-6 p-6">
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
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">4-week trend</h2>
          <div className="mt-4">
            {trendsLoading ? (
              <ChartSkeleton />
            ) : (
              <TrendLineChart data={trends?.weeks ?? []} />
            )}
          </div>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Deals by stage</h2>
          <div className="mt-4">
            <StageBarChart
              data={DEAL_STAGES.map((s) => ({
                stage: s.id,
                label: s.label,
                count: stageMap.get(s.id) ?? 0,
              }))}
            />
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
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

        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-4 flex flex-col gap-3">
            <Link to="/leads" className="btn-secondary justify-start">
              Add a new lead
            </Link>
            <Link to="/pipeline" className="btn-secondary justify-start">
              Create a deal
            </Link>
            <Link
              to="/communications"
              className="rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-white px-4 py-3 text-sm font-semibold text-brand-700 transition-all hover:border-brand-300 hover:shadow-sm"
            >
              Generate AI follow-up email
            </Link>
            <Link to="/meetings" className="btn-secondary justify-start">
              Summarize a meeting
            </Link>
            {isManager && (
              <Link to="/team" className="btn-secondary justify-start">
                View team dashboard
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
