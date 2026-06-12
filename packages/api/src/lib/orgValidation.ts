import { prisma } from './prisma.js'

export class OrgValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrgValidationError'
  }
}

export async function assertAccountInOrg(
  organizationId: string,
  accountId: string | null | undefined,
) {
  if (!accountId) return
  const account = await prisma.account.findFirst({
    where: { id: accountId, organizationId },
  })
  if (!account) {
    throw new OrgValidationError('Account not found in organization')
  }
}

export async function assertContactInOrg(
  organizationId: string,
  contactId: string | null | undefined,
) {
  if (!contactId) return
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId },
  })
  if (!contact) {
    throw new OrgValidationError('Contact not found in organization')
  }
}

export async function assertUniqueContactEmail(
  organizationId: string,
  email: string | null | undefined,
  excludeContactId?: string,
) {
  if (!email) return

  const existing = await prisma.contact.findFirst({
    where: {
      organizationId,
      email,
      ...(excludeContactId ? { NOT: { id: excludeContactId } } : {}),
    },
  })

  if (existing) {
    throw new OrgValidationError('Contact email already exists in this organization')
  }
}

export async function assertDealInOrg(
  organizationId: string,
  dealId: string | null | undefined,
) {
  if (!dealId) return
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId },
    select: { id: true, assignedToId: true },
  })
  if (!deal) {
    throw new OrgValidationError('Deal not found in organization')
  }
  return deal
}

export async function assertLeadInOrg(
  organizationId: string,
  leadId: string | null | undefined,
) {
  if (!leadId) return
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { id: true, assignedToId: true },
  })
  if (!lead) {
    throw new OrgValidationError('Lead not found in organization')
  }
  return lead
}

export function handleOrgValidationError(
  err: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): boolean {
  if (err instanceof OrgValidationError) {
    res.status(400).json({ error: err.message })
    return true
  }
  return false
}

export function handleAssigneeError(
  err: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): boolean {
  if (err instanceof Error && err.name === 'AssigneeError') {
    res.status(403).json({ error: err.message })
    return true
  }
  return false
}
