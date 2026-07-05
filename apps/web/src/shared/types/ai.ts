export type EmailTone = 'professional' | 'friendly' | 'urgent'

export type EmailGoal = 'schedule_demo' | 'check_in' | 'proposal_follow_up'

export type EmailContext = {
  contactName: string
  contactEmail?: string
  companyName?: string
  jobTitle?: string
  dealStage?: string
  leadStatus?: string
  dealTitle?: string
  arr?: number
  probability?: number
  lastActivity?: string
  recentActivities: string[]
  notes?: string
  sourceType: 'lead' | 'deal' | 'manual'
  sourceId?: string
}

export type EmailDraftResult = {
  subject: string
  body: string
  source?: string
  message?: string
  context?: EmailContext
  activityId?: string
  quality?: {
    score: number
    label: string
    factors: { label: string; score: number; max: number }[]
  }
}
