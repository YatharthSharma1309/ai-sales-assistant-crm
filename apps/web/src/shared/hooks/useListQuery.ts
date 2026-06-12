import { useCallback, useState } from 'react'

const DEFAULT_PAGE_SIZE = 25

export function useListQuery(initialPageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const onPageChange = useCallback((nextPage: number) => {
    setPage(Math.max(1, nextPage))
  }, [])

  const onPageSizeChange = useCallback((nextPageSize: number) => {
    setPageSize(nextPageSize)
    setPage(1)
  }, [])

  const resetPage = useCallback(() => {
    setPage(1)
  }, [])

  return {
    page,
    pageSize,
    setPage,
    setPageSize,
    onPageChange,
    onPageSizeChange,
    resetPage,
  }
}
