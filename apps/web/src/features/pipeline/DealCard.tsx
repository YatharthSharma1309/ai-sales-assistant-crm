import { Link } from 'react-router-dom'
import { GripVertical } from 'lucide-react'
import { DEAL_STAGES, isOpenStage } from '../../shared/constants/pipeline'
import { useMediaQuery } from '../../shared/hooks/useMediaQuery'
import type { Deal, DealStage } from '../../shared/types'

type DealCardProps = {
  deal: Deal
  onDragStart: (dealId: string) => void
  onDragEnd: () => void
  onStageChange?: (dealId: string, stage: DealStage) => void
  isDragging?: boolean
}

export function DealCard({
  deal,
  onDragStart,
  onDragEnd,
  onStageChange,
  isDragging,
}: DealCardProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const weightedValue =
    deal.arr != null
      ? Math.round((deal.arr * deal.probability) / 100)
      : null

  const openStages = DEAL_STAGES.filter((s) => isOpenStage(s.id))

  return (
    <div
      draggable={isDesktop}
      onDragStart={(e) => {
        if (!isDesktop) return
        e.dataTransfer.setData('text/deal-id', deal.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart(deal.id)
      }}
      onDragEnd={onDragEnd}
      className={`rounded-lg border bg-white p-3 shadow-sm ${
        isDesktop ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        isDragging
          ? 'border-brand-400 opacity-50'
          : 'border-slate-200 hover:border-brand-300'
      }`}
    >
      <div className="flex items-start gap-2">
        {isDesktop && (
          <GripVertical
            size={14}
            className="mt-0.5 shrink-0 text-slate-300"
            aria-hidden
          />
        )}
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
          {!isDesktop && onStageChange && (
            <label className="mt-3 block">
              <span className="text-xs font-medium text-slate-600">Move to stage</span>
              <select
                value={deal.stage}
                onChange={(e) =>
                  onStageChange(deal.id, e.target.value as DealStage)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                {openStages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
    </div>
  )
}
