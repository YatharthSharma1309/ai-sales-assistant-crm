import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { StatCard } from '../../shared/components/StatCard'
import { StageBarChart, TrendLineChart } from '../../shared/components/Charts'
import { ChartSkeleton } from '../../shared/components/Skeleton'
import { DEAL_STAGES, isOpenStage, LEAD_STATUS_LABELS } from '../../shared/constants/pipeline'
import { useRole } from '../../shared/hooks/useRole'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchDashboardStats,
  fetchDashboardTrends,
  fetchManagerDashboard,
} from '../../store/dashboardSlice'
import { ManagerOverview } from '../dashboard/ManagerOverview'

export function AnalyticsPage() {
  const dispatch = useAppDispatch()
  const { isManager } = useRole()
  const {
    stats,
    trends,
    manager,
    loading,
    trendsLoading,
    managerLoading,
    error,
    managerError,
  } = useAppSelector((state) => state.dashboard)

  useEffect(() => {
    dispatch(fetchDashboardStats())
    dispatch(fetchDashboardTrends())
    if (isManager) dispatch(fetchManagerDashboard())
  }, [dispatch, isManager])

  const stageMap = new Map(
    stats?.dealsByStage?.map((s) => [s.stage, s.count]) ?? [],
  )
  const openDeals = DEAL_STAGES.filter((s) => isOpenStage(s.id)).reduce(
    (sum, s) => sum + (stageMap.get(s.id) ?? 0),
    0,
  )
  const leadStatusMap = new Map(
    stats?.leadsByStatus?.map((s) => [s.status, s.count]) ?? [],
  )
  const qualifiedLeads = leadStatusMap.get('QUALIFIED') ?? 0
  const leadQualRate =
    stats?.leadCount && stats.leadCount > 0
      ? Math.round((qualifiedLeads / stats.leadCount) * 100)
      : 0
  const closedDeals = (stats?.wonDeals ?? 0) + (stats?.lostDeals ?? 0)
  const winRate =
    closedDeals > 0 ? Math.round(((stats?.wonDeals ?? 0) / closedDeals) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Pipeline metrics for your sales team"
      />

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
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
        <StatCard label="Total leads" value={loading ? '—' : (stats?.leadCount ?? 0)} />
        <StatCard label="Open deals" value={loading ? '—' : openDeals} />
        <StatCard
          label="Pipeline ARR"
          value={loading ? '—' : `$${(stats?.pipelineValue ?? 0).toLocaleString()}`}
        />
        <StatCard
          label="Weighted forecast"
          value={
            loading
              ? '—'
              : `$${Math.round(stats?.weightedPipeline ?? 0).toLocaleString()}`
          }
        />
      </div>

      {isManager && (
        <p className="mt-4 text-sm text-slate-500">
          <Link to="/team" className="font-medium text-brand-600 hover:underline">
            Team management →
          </Link>{' '}
          for rep roles and invites.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Lead funnel</h2>
          <p className="mt-1 text-sm text-slate-500">
            {loading ? '—' : `${leadQualRate}% qualified`} ·{' '}
            {loading ? '—' : `${winRate}% win rate`}
          </p>
          <ul className="mt-4 space-y-3">
            {(['NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED'] as const).map((status) => {
              const count = leadStatusMap.get(status) ?? 0
              const pct =
                stats?.leadCount && stats.leadCount > 0
                  ? Math.round((count / stats.leadCount) * 100)
                  : 0
              return (
                <li key={status}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">
                      {LEAD_STATUS_LABELS[status]}
                    </span>
                    <span className="text-slate-500">
                      {loading ? '—' : count} ({loading ? '—' : `${pct}%`})
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: loading ? '0%' : `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Deal outcomes</h2>
          <dl className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-slate-50 p-4">
              <dt className="text-xs font-medium uppercase text-slate-500">Open</dt>
              <dd className="mt-1 text-2xl font-bold text-slate-900">
                {loading ? '—' : openDeals}
              </dd>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4">
              <dt className="text-xs font-medium uppercase text-emerald-700">Won</dt>
              <dd className="mt-1 text-2xl font-bold text-emerald-800">
                {loading ? '—' : (stats?.wonDeals ?? 0)}
              </dd>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <dt className="text-xs font-medium uppercase text-red-700">Lost</dt>
              <dd className="mt-1 text-2xl font-bold text-red-800">
                {loading ? '—' : (stats?.lostDeals ?? 0)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">4-week trend</h2>
          <div className="mt-4">
            {trendsLoading ? (
              <ChartSkeleton />
            ) : (
              <TrendLineChart data={trends?.weeks ?? []} />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
    </div>
  )
}
