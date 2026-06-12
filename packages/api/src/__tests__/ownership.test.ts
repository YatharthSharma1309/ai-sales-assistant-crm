import { describe, expect, it } from 'vitest'
import type { Request } from 'express'
import {
  buildLeadListWhere,
  canAccessAssignedRecord,
  canReassignRecord,
} from '../lib/ownership.js'

function mockReq(role: string, userId = 'user-1', orgId = 'org-1') {
  return {
    auth: { role, userId, organizationId: orgId },
  } as Request
}

describe('ownership', () => {
  it('reps only access assigned records', () => {
    expect(canAccessAssignedRecord(mockReq('REP'), 'user-1')).toBe(true)
    expect(canAccessAssignedRecord(mockReq('REP'), 'user-2')).toBe(false)
    expect(canAccessAssignedRecord(mockReq('REP'), null)).toBe(false)
  })

  it('managers access all records', () => {
    expect(canAccessAssignedRecord(mockReq('MANAGER'), null)).toBe(true)
    expect(canAccessAssignedRecord(mockReq('ADMIN'), 'other')).toBe(true)
  })

  it('reps cannot reassign', () => {
    expect(canReassignRecord(mockReq('REP'))).toBe(false)
    expect(canReassignRecord(mockReq('MANAGER'))).toBe(true)
  })

  it('lead search combines ownership and query with AND', () => {
    const where = buildLeadListWhere(mockReq('REP'), {
      q: 'acme',
      status: 'NEW',
    })

    const clauses = Array.isArray(where.AND) ? where.AND : []
    expect(clauses).toHaveLength(3)
    expect(clauses[0]).toEqual({
      organizationId: 'org-1',
      assignedToId: 'user-1',
    })
    expect(clauses[2]).toMatchObject({
      OR: expect.arrayContaining([
        { title: { contains: 'acme' } },
      ]),
    })
  })
})
