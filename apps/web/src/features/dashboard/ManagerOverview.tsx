import { Link } from 'react-router-dom'
import { StatCard } from '../../shared/components/StatCard'
import { ROLE_LABELS } from '../../shared/constants/roles'
import { useRole } from '../../shared/hooks/useRole'
import type { ManagerDashboard } from '../../shared/types/team'
import { ACTIVITY_TYPE_LABELS } from '../../shared/constants/activities'
import type { ActivityType } from '../../shared/types'

type ManagerOverviewProps = {
  data: ManagerDashboard
  loading?: boolean
}

export function ManagerOverview({ data, loading }: ManagerOverviewProps) {
  const { isAdmin, isManager } = useRole()

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Team pipeline ARR"
          value={loading ? '—' : `$${data.pipelineArr.toLocaleString()}`}
        />
        <StatCard
          label="Weighted forecast"
          value={
            loading ? '—' : `$${Math.round(data.weightedPipeline).toLocaleString()}`
          }
        />
        <StatCard
          label="Win rate"
          value={loading ? '—' : `${data.winRate}%`}
          hint={`${data.wonCount} won · ${data.lostCount} lost`}
        />
        <StatCard
          label="Team members"
          value={loading ? '—' : data.team.length}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Rep activity
            </h2>
            <Link
              to="/team"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              {isAdmin
                ? 'Manage team →'
                : isManager && !isAdmin
                  ? 'View team →'
                  : 'Manage team →'}
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {data.team.map((member, index) => {
              const max = Math.max(...data.team.map((m) => m.activityCount), 1)
              const width = `${(member.activityCount / max) * 100}%`
              return (
                <div key={member.userId}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-700">
                      {index + 1}. {member.name}
                      <span className="ml-2 text-xs text-slate-400">
                        {ROLE_LABELS[member.role]}
                      </span>
                    </span>
                    <span className="font-medium">
                      {member.leadCount}L · {member.dealCount}D ·{' '}
                      {member.activityCount} act
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent team activity
          </h2>
          <ul className="mt-4 divide-y divide-slate-100">
            {data.recentActivity.length === 0 ? (
              <li className="py-4 text-sm text-slate-500">No activity yet.</li>
            ) : (
              data.recentActivity.map((activity) => (
                <li key={activity.id} className="py-3 text-sm">
                  <p className="font-medium text-slate-900">{activity.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {ACTIVITY_TYPE_LABELS[activity.type as ActivityType] ??
                      activity.type}
                    {activity.createdBy ? ` · ${activity.createdBy.name}` : ''}
                    {' · '}
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  )
}
