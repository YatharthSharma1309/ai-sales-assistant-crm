import type { ActivityType } from '../types'

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  NOTE: 'Note',
  CALL: 'Call',
  EMAIL: 'Email',
  MEETING: 'Meeting',
  TASK: 'Task',
}

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
  NOTE: 'bg-slate-100 text-slate-700',
  CALL: 'bg-green-100 text-green-700',
  EMAIL: 'bg-blue-100 text-blue-700',
  MEETING: 'bg-purple-100 text-purple-700',
  TASK: 'bg-amber-100 text-amber-700',
}
