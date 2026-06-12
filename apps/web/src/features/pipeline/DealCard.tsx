import { Link } from 'react-router-dom'
import { GripVertical } from 'lucide-react'
import type { Deal } from '../../shared/types'
import { getStageLabel } from '../../shared/constants/pipeline'

type DealCardProps = {
  deal: Deal
  onDragStart: (dealId: string) => void
  onDragEnd: () => void
  isDragging?: boolean
}

export function DealCard({
  deal,
  onDragStart,
  onDragEnd,
  isDragging,
}: DealCardProps) {
  const weightedValue =
    deal.arr != null
      ? Math.round((deal.arr * deal.probability) / 100)
      : null

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/deal-id', deal.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(deal.id)
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm active:cursor-grabbing ${
        isDragging
          ? 'border-brand-400 opacity-50'
          : 'border-slate-200 hover:border-brand-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical
          size={14}
          className="mt-0.5 shrink-0 text-slate-300"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <Link
            to={`/pipeline/${deal.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-slate-900 hover:text-brand-600"
          >
            {deal.title}
          </Link>
          {deal.account && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {deal.account.name}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {deal.arr != null && <span>ARR ${deal.arr.toLocaleString()}</span>}
            <span>{deal.probability}%</span>
            {weightedValue != null && (
              <span className="text-brand-600">
                Wtd ${weightedValue.toLocaleString()}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {deal.assignedTo?.name ? `Owner: ${deal.assignedTo.name}` : 'Unassigned'}
            {deal.contact
              ? ` · ${deal.contact.firstName} ${deal.contact.lastName}`
              : ''}
          </p>
        </div>
      </div>
    </div>
  )
}

export function DealCardCompact({ deal }: { deal: Deal }) {
  return (
    <div className="text-sm">
      <span className="font-medium text-slate-900">{deal.title}</span>
      <span className="ml-2 text-xs text-slate-500">
        {getStageLabel(deal.stage)}
      </span>
    </div>
  )
}
