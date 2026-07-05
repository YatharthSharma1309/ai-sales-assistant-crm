import { Phone, Mail, Video, CheckSquare, StickyNote } from 'lucide-react'
import type { Activity, ActivityType } from '../types'
import {
  ACTIVITY_TYPE_COLORS,
  ACTIVITY_TYPE_LABELS,
} from '../constants/activities'
import { useDialog } from './DialogProvider'
import { TimelineSkeleton } from './Skeleton'

const ICONS: Record<ActivityType, typeof StickyNote> = {
  NOTE: StickyNote,
  CALL: Phone,
  EMAIL: Mail,
  MEETING: Video,
  TASK: CheckSquare,
}

type ActivityTimelineProps = {
  activities: Activity[]
  loading?: boolean
  currentUserId?: string
  isManager?: boolean
  onDeleteActivity?: (id: string) => void
  onUpdateActivity?: (
    id: string,
    patch: {
      title?: string
      body?: string | null
      completed?: boolean
    },
  ) => void
}

export function ActivityTimeline({
  activities,
  loading,
  currentUserId,
  isManager,
  onDeleteActivity,
  onUpdateActivity,
}: ActivityTimelineProps) {
  const { confirm, prompt } = useDialog()

  if (loading) {
    return <TimelineSkeleton />
  }

  if (activities.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        No activities yet. Add a note or log a call to start the timeline.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = ICONS[activity.type]
        const canModify =
          Boolean(onDeleteActivity || onUpdateActivity) &&
          (isManager || activity.createdBy?.id === currentUserId)
        const isTaskDone = Boolean(activity.completedAt)

        return (
          <div
            key={activity.id}
            className={`flex gap-3 rounded-lg border border-slate-200 bg-white p-4 ${
              isTaskDone ? 'opacity-75' : ''
            }`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ACTIVITY_TYPE_COLORS[activity.type]}`}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTIVITY_TYPE_COLORS[activity.type]}`}
                  >
                    {ACTIVITY_TYPE_LABELS[activity.type]}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(activity.createdAt).toLocaleString()}
                  </span>
                  {activity.createdBy && (
                    <span className="text-xs text-slate-400">
                      by {activity.createdBy.name}
                    </span>
                  )}
                </div>
                {canModify && (
                  <div className="flex gap-2">
                    {activity.type === 'TASK' && onUpdateActivity && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateActivity(activity.id, {
                            completed: !isTaskDone,
                          })
                        }
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        {isTaskDone ? 'Reopen' : 'Complete'}
                      </button>
                    )}
                    {onUpdateActivity && (
                      <button
                        type="button"
                        onClick={async () => {
                          const title = await prompt({
                            title: 'Edit title',
                            defaultValue: activity.title,
                          })
                          if (!title) return
                          onUpdateActivity(activity.id, { title })
                        }}
                        className="text-xs font-medium text-slate-600 hover:text-slate-800"
                      >
                        Edit
                      </button>
                    )}
                    {onDeleteActivity && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete activity',
                            message:
                              'Delete this activity from the timeline?',
                            confirmLabel: 'Delete',
                            destructive: true,
                          })
                          if (ok) onDeleteActivity(activity.id)
                        }}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p
                className={`mt-1 font-medium text-slate-900 ${isTaskDone ? 'line-through' : ''}`}
              >
                {activity.title}
              </p>
              {activity.dueAt && activity.type === 'TASK' && (
                <p
                  className={`mt-1 text-xs ${isTaskDone ? 'text-slate-400' : 'text-amber-600'}`}
                >
                  Due {new Date(activity.dueAt).toLocaleDateString()}
                  {isTaskDone && ' · completed'}
                </p>
              )}
              {activity.type === 'MEETING' ? (
                <p className="mt-1 text-sm text-slate-600">
                  Meeting summary saved — view full details on the Meetings page.
                </p>
              ) : (
                activity.body && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                    {activity.body}
                  </p>
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
