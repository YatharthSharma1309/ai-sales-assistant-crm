export type User = {
  id: string
  name: string
  email: string
  pendingEmail?: string | null
}

export type Organization = {
  id: string
  name: string
  slug: string
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'UNQUALIFIED'

export type ScoreFactor = { rule: string; points: number }

export type ActivityType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'TASK'

export type Account = {
  id: string
  name: string
  industry: string | null
  companySize: string | null
  website: string | null
  createdAt: string
  updatedAt: string
  _count?: { contacts: number; deals: number }
  contacts?: Contact[]
  deals?: Deal[]
}

export type Contact = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  jobTitle: string | null
  phone: string | null
  accountId: string | null
  createdAt: string
  updatedAt: string
  account?: { id: string; name: string } | null
  leads?: Lead[]
  deals?: Deal[]
}

export type Lead = {
  id: string
  title: string
  status: LeadStatus
  source: string | null
  notes: string | null
  score?: number
  scoreUpdatedAt?: string
  scoreFactors?: ScoreFactor[]
  contactId: string | null
  assignedToId: string | null
  createdAt: string
  updatedAt: string
  contact?: (Contact & { account?: { id: string; name: string } | null }) | null
  assignedTo?: { id: string; name: string; email: string } | null
  activities?: Activity[]
}

export type Activity = {
  id: string
  type: ActivityType
  title: string
  body: string | null
  contactId: string | null
  leadId: string | null
  dealId: string | null
  dueAt: string | null
  completedAt: string | null
  createdAt: string
  createdBy?: { id: string; name: string } | null
}

export type DealStage =
  | 'DISCOVERY'
  | 'DEMO_SCHEDULED'
  | 'TRIAL'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

export type Deal = {
  id: string
  title: string
  stage: DealStage
  mrr: number | null
  arr: number | null
  probability: number
  contactId: string | null
  accountId: string | null
  assignedToId: string | null
  closeDate: string | null
  riskLevel?: string | null
  riskNote?: string | null
  createdAt: string
  updatedAt: string
  assignedTo?: { id: string; name: string; email: string } | null
  contact?: {
    id: string
    firstName: string
    lastName: string
    email?: string | null
  } | null
  account?: { id: string; name: string } | null
  activities?: Activity[]
}

export type DashboardStats = {
  leadCount: number
  dealCount: number
  pipelineValue: number
  weightedPipeline: number
  wonDeals?: number
  lostDeals?: number
  leadsByStatus?: { status: string; count: number }[]
  dealsByStage: { stage: string; count: number }[]
}

export type PipelineHealth = {
  score: number
  label: string
  staleDealCount: number
  staleDeals?: {
    id: string
    title: string
    updatedAt: string
    stage: string
  }[]
  bottleneckStage: string | null
  dealsAtRisk: number
}

export type PipelineForecast = {
  weightedPipeline: number
  forecastPipeline: number
  pipelineHealth: PipelineHealth
}

export type DashboardTrends = {
  weeks: { week: string; leads: number; deals: number }[]
}
