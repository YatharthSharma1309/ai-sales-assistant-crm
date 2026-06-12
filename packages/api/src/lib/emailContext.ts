import { prisma } from './prisma.js'

const STAGE_LABELS: Record<string, string> = {
  DISCOVERY: 'Discovery',
  DEMO_SCHEDULED: 'Demo Scheduled',
  TRIAL: 'Trial / POC',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

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
  contactId?: string
}

function formatActivity(a: {
  type: string
  title: string
  body: string | null
  createdAt: Date
}): string {
  const date = a.createdAt.toLocaleDateString()
  return `${date} — ${a.type}: ${a.title}${a.body ? ` (${a.body.slice(0, 120)}${a.body.length > 120 ? '…' : ''})` : ''}`
}

export async function buildEmailContextFromLead(
  leadId: string,
  organizationId: string,
): Promise<EmailContext | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    include: {
      contact: { include: { account: true } },
    },
  })

  if (!lead) return null

  const activities = await prisma.activity.findMany({
    where: {
      organizationId,
      OR: [
        { leadId },
        ...(lead.contactId ? [{ contactId: lead.contactId }] : []),
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const contactName = lead.contact
    ? `${lead.contact.firstName} ${lead.contact.lastName}`
    : lead.title.split('—')[0]?.trim() || lead.title

  const companyName =
    lead.contact?.account?.name ??
    (lead.title.includes('—') ? lead.title.split('—')[0]?.trim() : undefined)

  return {
    contactName,
    contactEmail: lead.contact?.email ?? undefined,
    companyName,
    jobTitle: lead.contact?.jobTitle ?? undefined,
    leadStatus: lead.status,
    lastActivity: activities[0] ? formatActivity(activities[0]) : undefined,
    recentActivities: activities.map(formatActivity),
    notes: lead.notes ?? undefined,
    sourceType: 'lead',
    sourceId: lead.id,
    contactId: lead.contactId ?? undefined,
  }
}

export async function buildEmailContextFromDeal(
  dealId: string,
  organizationId: string,
): Promise<EmailContext | null> {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    include: { contact: true, account: true },
  })

  if (!deal) return null

  const activities = await prisma.activity.findMany({
    where: { organizationId, dealId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  })

  const contactName = deal.contact
    ? `${deal.contact.firstName} ${deal.contact.lastName}`
    : deal.account?.name ?? deal.title

  return {
    contactName,
    contactEmail: deal.contact?.email ?? undefined,
    companyName: deal.account?.name,
    jobTitle: deal.contact?.jobTitle ?? undefined,
    dealStage: STAGE_LABELS[deal.stage] ?? deal.stage,
    dealTitle: deal.title,
    arr: deal.arr ?? undefined,
    probability: deal.probability,
    lastActivity: activities[0] ? formatActivity(activities[0]) : undefined,
    recentActivities: activities.map(formatActivity),
    sourceType: 'deal',
    sourceId: deal.id,
    contactId: deal.contactId ?? undefined,
  }
}

export function buildMockEmail(
  context: EmailContext,
  goal: string,
): { subject: string; body: string } {
  const { contactName, companyName, lastActivity } = context
  const subject = `Following up${companyName ? ` — ${companyName}` : ''}`
  const cta =
    goal === 'schedule_demo'
      ? 'Would you be open to a quick demo this week?'
      : goal === 'proposal_follow_up'
        ? 'I wanted to check if you had a chance to review our proposal.'
        : 'Just checking in to see how things are going on your end.'

  const body = `Hi ${contactName},

I wanted to follow up on our recent conversation${lastActivity ? ` (${lastActivity.split('—')[0]?.trim()})` : ''}.

${cta}

Best regards`

  return { subject, body }
}

export async function generateEmailWithOpenAI(
  context: EmailContext,
  tone: string,
  goal: string,
  apiKey: string,
): Promise<{ subject: string; body: string }> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You write concise B2B SaaS sales follow-up emails.
Use the CRM context provided. Match the requested tone.
Return JSON with "subject" and "body" keys only. Keep under 150 words.`,
        },
        {
          role: 'user',
          content: JSON.stringify({ ...context, tone, goal }),
        },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI error: ${response.status}`)
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[]
  }
  return JSON.parse(data.choices[0].message.content) as {
    subject: string
    body: string
  }
}
