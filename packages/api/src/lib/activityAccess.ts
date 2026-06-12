import type { Request } from 'express'
import { canAccessAssignedRecord } from './ownership.js'
import {
  assertContactInOrg,
  assertDealInOrg,
  assertLeadInOrg,
} from './orgValidation.js'

export class ActivityAccessError extends Error {
  status: number
  constructor(message: string, status = 404) {
    super(message)
    this.name = 'ActivityAccessError'
    this.status = status
  }
}

export async function assertActivityRecordAccess(
  req: Request,
  orgId: string,
  refs: {
    leadId?: string
    contactId?: string
    dealId?: string
  },
) {
  if (refs.leadId) {
    const lead = await assertLeadInOrg(orgId, refs.leadId)
    if (lead && !canAccessAssignedRecord(req, lead.assignedToId)) {
      throw new ActivityAccessError('Lead not found')
    }
  }

  if (refs.dealId) {
    const deal = await assertDealInOrg(orgId, refs.dealId)
    if (deal && !canAccessAssignedRecord(req, deal.assignedToId)) {
      throw new ActivityAccessError('Deal not found')
    }
  }

  if (refs.contactId) {
    await assertContactInOrg(orgId, refs.contactId)
  }
}

export function handleActivityAccessError(
  err: unknown,
  res: { status: (code: number) => { json: (body: unknown) => void } },
): boolean {
  if (err instanceof ActivityAccessError) {
    res.status(err.status).json({ error: err.message })
    return true
  }
  return false
}
