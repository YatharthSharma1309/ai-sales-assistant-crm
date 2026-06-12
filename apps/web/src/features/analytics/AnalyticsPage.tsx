import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../shared/components/PageHeader'
import { StatCard } from '../../shared/components/StatCard'
import { DEAL_STAGES, isOpenStage } from '../../shared/constants/pipeline'
import { useRole } from '../../shared/hooks/useRole'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchDashboardStats,
  fetchManagerDashboard,
} from '../../store/dashboardSlice'
import { ManagerOverview } from '../dashboard/ManagerOverview'

export function AnalyticsPage() {
  const dispatch = useAppDispatch()
  const { isManager } = useRole()
  const { stats, manager, loading, managerLoading, error, managerError } =
    useAppSelector((state) => state.dashboard)

  useEffect(() => {
    dispatch(fetchDashboardStats())
    if (isManager) dispatch(fetchManagerDashboard())
  }, [dispatch, isManager])

  const stageMap = new Map(
    stats?.dealsByStage?.map((s) => [s.stage, s.count]) ?? [],
  )
  const openDeals = DEAL_STAGES.filter((s) => isOpenStage(s.id)).reduce(
    (sum, s) => sum + (stageMap.get(s.id) ?? 0),
    0,
  )

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

      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Deals by stage</h2>
        <div className="mt-6 space-y-4">
          {DEAL_STAGES.map((stage) => {
            const count = stageMap.get(stage.id) ?? 0
            const max = Math.max(...DEAL_STAGES.map((s) => stageMap.get(s.id) ?? 0), 1)
            const width = `${(count / max) * 100}%`

            return (
              <div key={stage.id}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-600">{stage.label}</span>
                  <span className="font-medium text-slate-900">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-brand-500 transition-all"
                    style={{ width }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
