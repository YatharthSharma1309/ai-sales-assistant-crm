import type { Request } from 'express'
import { prisma } from './prisma.js'
import { canAccessAssignedRecord } from './ownership.js'
import { assertContactInOrg } from './orgValidation.js'

export class RecordAccessError extends Error {
  status: number
  constructor(message: string, status = 404) {
    super(message)
    this.name = 'RecordAccessError'
    this.status = status
  }
}

export async function assertLeadAccess(
  req: Request,
  orgId: string,
  leadId: string,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: orgId },
    select: { id: true, assignedToId: true, contactId: true, title: true, status: true },
  })
  if (!lead || !canAccessAssignedRecord(req, lead.assignedToId)) {
    throw new RecordAccessError('Lead not found')
  }
  return lead
}

export async function assertDealAccess(
  req: Request,
  orgId: string,
  dealId: string,
) {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, organizationId: orgId },
    select: { id: true, assignedToId: true, contactId: true, title: true, stage: true },
  })
  if (!deal || !canAccessAssignedRecord(req, deal.assignedToId)) {
    throw new RecordAccessError('Deal not found')
  }
  return deal
}

export async function assertContactAccess(
  req: Request,
  orgId: string,
  contactId: string,
) {
  await assertContactInOrg(orgId, contactId)
}

export function handleRecordAccessError(
  err: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): boolean {
  if (err instanceof RecordAccessError) {
    res.status(err.status).json({ error: err.message })
    return true
  }
  return false
}
