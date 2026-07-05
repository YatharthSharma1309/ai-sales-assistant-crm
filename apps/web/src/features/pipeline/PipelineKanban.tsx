import { useState } from 'react'
import { DEAL_STAGES, isOpenStage } from '../../shared/constants/pipeline'
import type { DealStage } from '../../shared/types'
import type { KanbanStageColumn } from '../../shared/types/kanban'
import { ListErrorBanner } from '../../shared/components/ListErrorBanner'
import { useToast } from '../../shared/components/ToastProvider'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  loadMoreKanbanStage,
  optimisticMoveDeal,
  updateDealStage,
} from '../../store/pipelineSlice'
import { DealCard } from './DealCard'

type PipelineKanbanProps = {
  stages: KanbanStageColumn[]
  assignedFilter?: string
  perStage: number
}

export function PipelineKanban({
  stages,
  assignedFilter,
  perStage,
}: PipelineKanbanProps) {
  const dispatch = useAppDispatch()
  const { success, error: toastError } = useToast()
  const { error, loadingStage } = useAppSelector((state) => state.pipeline)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null)

  const deals = stages.flatMap((s) => s.deals)

  function columnForStage(stage: DealStage) {
    return stages.find((s) => s.stage === stage)
  }

  function stageTotalArr(stage: DealStage) {
    const column = columnForStage(stage)
    return (column?.deals ?? []).reduce((sum, d) => sum + (d.arr ?? 0), 0)
  }

  async function handleDrop(stage: DealStage, dealId: string) {
    const deal = deals.find((d) => d.id === dealId)
    if (!deal || deal.stage === stage) return

    const previousStage = deal.stage
    dispatch(optimisticMoveDeal({ id: dealId, stage }))
    const result = await dispatch(updateDealStage({ id: dealId, stage }))
    if (updateDealStage.rejected.match(result)) {
      dispatch(optimisticMoveDeal({ id: dealId, stage: previousStage }))
      toastError('Failed to move deal')
    } else {
      success('Deal moved')
    }
  }

  function handleLoadMore(stage: DealStage) {
    const column = columnForStage(stage)
    if (!column?.hasMore) return
    dispatch(
      loadMoreKanbanStage({
        stage,
        page: column.page + 1,
        assignedTo: assignedFilter || undefined,
        perStage,
      }),
    )
  }

  return (
    <div>
      <ListErrorBanner error={error} />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {DEAL_STAGES.filter((s) => isOpenStage(s.id)).map((stage) => {
          const column = columnForStage(stage.id)
          const columnDeals = column?.deals ?? []
          const totalArr = stageTotalArr(stage.id)
          const isOver = dragOverStage === stage.id
          const totalInStage = column?.total ?? columnDeals.length

          return (
            <div
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOverStage(stage.id)
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault()
                const dealId = e.dataTransfer.getData('text/deal-id')
                setDragOverStage(null)
                setDraggingId(null)
                if (dealId) void handleDrop(stage.id, dealId)
              }}
              className={`min-w-[260px] shrink-0 rounded-xl border transition-colors ${
                isOver
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-800">
                  {stage.label}
                </h3>
                <p className="text-xs text-slate-500">
                  {totalInStage} deals
                  {columnDeals.length < totalInStage &&
                    ` · showing ${columnDeals.length}`}
                  {totalArr > 0 && ` · $${totalArr.toLocaleString()} ARR`}
                </p>
              </div>
              <div className="min-h-[120px] space-y-3 p-3">
                {columnDeals.map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    isDragging={draggingId === deal.id}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                    onStageChange={(dealId, newStage) =>
                      void handleDrop(newStage, dealId)
                    }
                  />
                ))}
                {columnDeals.length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400">
                    Drop deals here
                  </p>
                )}
                {column?.hasMore && (
                  <button
                    type="button"
                    disabled={loadingStage === stage.id}
                    onClick={() => handleLoadMore(stage.id)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {loadingStage === stage.id
                      ? 'Loading more...'
                      : `Load more (${totalInStage - columnDeals.length} remaining)`}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
