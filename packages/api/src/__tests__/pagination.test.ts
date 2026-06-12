import { describe, expect, it } from 'vitest'
import { paginatedResponse, parsePageQuery } from '../lib/pagination.js'
import type { Request } from 'express'

function mockReq(query: Record<string, string>) {
  return { query } as unknown as Request
}

describe('pagination', () => {
  it('parses page and pageSize with defaults', () => {
    const result = parsePageQuery(mockReq({}))
    expect(result).toEqual({ page: 1, pageSize: 25, skip: 0 })
  })

  it('caps pageSize at max', () => {
    const result = parsePageQuery(mockReq({ pageSize: '500' }))
    expect(result.pageSize).toBe(100)
  })

  it('builds paginated response metadata', () => {
    const result = paginatedResponse(['a', 'b'], 50, 2, 25)
    expect(result.data).toHaveLength(2)
    expect(result.pagination).toEqual({
      page: 2,
      pageSize: 25,
      total: 50,
      totalPages: 2,
    })
  })
})
