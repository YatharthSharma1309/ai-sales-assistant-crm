import type { Request } from 'express'

export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

export type PageQuery = {
  page: number
  pageSize: number
  skip: number
}

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export function parsePageQuery(req: Request): PageQuery {
  const page = Math.max(1, Number(req.query.page) || 1)
  const rawSize = Number(req.query.pageSize) || DEFAULT_PAGE_SIZE
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, rawSize))
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  }
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    } satisfies PaginationMeta,
  }
}
