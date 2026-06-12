import { describe, expect, it } from 'vitest'
import type { Request } from 'express'
import { buildLeadListWhere } from '../lib/ownership.js'

function mockReq(role: string, userId = 'user-1', orgId = 'org-1') {
  return {
    auth: { role, userId, organizationId: orgId },
  } as Request
}

describe('leads search', () => {
  it('includes contact name and email in search OR', () => {
    const where = buildLeadListWhere(mockReq('MANAGER'), { q: 'jane' })
    const clauses = Array.isArray(where.AND) ? where.AND : []
    const searchClause = clauses.find(
      (c) => 'OR' in c && Array.isArray(c.OR),
    )

    expect(searchClause?.OR).toEqual(
      expect.arrayContaining([
        { title: { contains: 'jane' } },
        {
          contact: {
            OR: [
              { firstName: { contains: 'jane' } },
              { lastName: { contains: 'jane' } },
              { email: { contains: 'jane' } },
            ],
          },
        },
      ]),
    )
  })

  it('keeps rep ownership when searching', () => {
    const where = buildLeadListWhere(mockReq('REP'), { q: 'acme' })
    const clauses = Array.isArray(where.AND) ? where.AND : []

    expect(clauses[0]).toEqual({
      organizationId: 'org-1',
      assignedToId: 'user-1',
    })
  })
})
