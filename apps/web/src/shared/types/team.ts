import type { OrgRole } from '../constants/roles'

export type TeamInvite = {
  id: string
  email: string
  name: string | null
  role: OrgRole
  expiresAt: string
  createdAt: string
  invitedBy: { id: string; name: string }
  inviteUrl?: string
}

export type TeamMember = {
  id: string
  role: OrgRole
  joinedAt?: string
  user: { id: string; name: string; email: string }
  activityCount: number
  leadCount?: number
  dealCount?: number
}

export type ManagerDashboard = {
  leadCount: number
  dealCount: number
  pipelineArr: number
  weightedPipeline: number
  winRate: number
  wonCount: number
  lostCount: number
  team: {
    userId: string
    name: string
    email: string
    role: OrgRole
    activityCount: number
    leadCount: number
    dealCount: number
  }[]
  recentActivity: {
    id: string
    type: string
    title: string
    createdAt: string
    createdBy: { id: string; name: string } | null
  }[]
}

export type OnboardingStatus = {
  completed: boolean
  steps: {
    hasAccount: boolean
    hasContact: boolean
    hasLead: boolean
    hasDeal: boolean
    hasActivity: boolean
  }
}
