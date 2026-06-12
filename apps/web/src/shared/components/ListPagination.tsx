import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { PaginationMeta } from '../types/pagination'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

type ListPaginationProps = {
  pagination: Pick<PaginationMeta, 'page' | 'pageSize' | 'total' | 'totalPages'>
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  loading?: boolean
}

export function ListPagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  loading = false,
}: ListPaginationProps) {
  const { page, pageSize, total, totalPages } = pagination
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600">
      <p>
        {total === 0
          ? 'No results'
          : `Showing ${start}–${end} of ${total}`}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span>Per page</span>
          <select
            value={pageSize}
            disabled={loading}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={16} />
            Prev
          </button>
          <span className="px-2 text-slate-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
