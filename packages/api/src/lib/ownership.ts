import type { Prisma } from '@prisma/client'
import type { Request } from 'express'
import { prisma } from './prisma.js'
import { isManagerRole, type OrgRole } from './rbac.js'

export function canReassignRecord(req: Request): boolean {
  return isManagerRole(req.auth!.role as OrgRole)
}

export function listOwnershipWhere(
  req: Request,
  assignedToFilter?: string,
): Prisma.LeadWhereInput & Prisma.DealWhereInput {
  const orgId = req.auth!.organizationId

  if (assignedToFilter && isManagerRole(req.auth!.role as OrgRole)) {
    if (assignedToFilter === 'unassigned') {
      return { organizationId: orgId, assignedToId: null }
    }
    return { organizationId: orgId, assignedToId: assignedToFilter }
  }

  if (!isManagerRole(req.auth!.role as OrgRole)) {
    return { organizationId: orgId, assignedToId: req.auth!.userId }
  }

  return { organizationId: orgId }
}

export function buildLeadListWhere(
  req: Request,
  filters: {
    q?: string
    status?: string
    assignedTo?: string
  },
): Prisma.LeadWhereInput {
  const orgId = req.auth!.organizationId
  const and: Prisma.LeadWhereInput[] = [listOwnershipWhere(req, filters.assignedTo)]

  if (filters.status) {
    and.push({
      status: filters.status as
        | 'NEW'
        | 'CONTACTED'
        | 'QUALIFIED'
        | 'UNQUALIFIED',
    })
  }

  if (filters.q) {
    and.push({
      OR: [
        { title: { contains: filters.q } },
        { source: { contains: filters.q } },
        { notes: { contains: filters.q } },
        {
          contact: {
            OR: [
              { firstName: { contains: filters.q } },
              { lastName: { contains: filters.q } },
              { email: { contains: filters.q } },
            ],
          },
        },
      ],
    })
  }

  return { organizationId: orgId, AND: and }
}

export function canAccessAssignedRecord(
  req: Request,
  assignedToId: string | null,
): boolean {
  if (isManagerRole(req.auth!.role as OrgRole)) return true
  return assignedToId === req.auth!.userId
}

export function nestedLeadFilter(req: Request): Prisma.LeadWhereInput {
  if (isManagerRole(req.auth!.role as OrgRole)) {
    return {}
  }
  return { assignedToId: req.auth!.userId }
}

export function nestedDealFilter(req: Request): Prisma.DealWhereInput {
  if (isManagerRole(req.auth!.role as OrgRole)) {
    return {}
  }
  return { assignedToId: req.auth!.userId }
}

export async function validateAssignee(
  organizationId: string,
  assignedToId: string | null | undefined,
): Promise<boolean> {
  if (!assignedToId) return true
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId: assignedToId },
  })
  return Boolean(membership)
}

export function validateAssigneeChange(
  req: Request,
  newAssigneeId: string | null | undefined,
): void {
  if (newAssigneeId === undefined) return
  if (!canReassignRecord(req)) {
    throw new AssigneeError('Only managers can reassign records')
  }
}

export class AssigneeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AssigneeError'
  }
}

export const assigneeListInclude = {
  assignedTo: { select: { id: true, name: true } },
}

export const assigneeInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
}
