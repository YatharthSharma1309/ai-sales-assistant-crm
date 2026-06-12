export type MeetingActionItem = {
  title: string
  dueInDays?: number
}

export type MeetingSummaryResult = {
  summary: string
  painPoints: string[]
  objections: string[]
  nextSteps: string[]
  actionItems: MeetingActionItem[]
  suggestedFollowUpAngle: string
  source?: string
  message?: string
  meetingActivityId?: string
  taskActivityIds?: string[]
}

export type MeetingRecord = {
  id: string
  title: string
  createdAt: string
  contact?: { id: string; firstName: string; lastName: string } | null
  lead?: { id: string; title: string } | null
  deal?: { id: string; title: string } | null
  createdBy?: { id: string; name: string } | null
  summary: MeetingSummaryResult | null
}
