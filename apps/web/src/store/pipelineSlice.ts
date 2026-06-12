import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { api, ApiError } from '../shared/api/client'
import { STAGE_DEFAULT_PROBABILITY } from '../shared/constants/pipeline'
import type { PaginatedResponse } from '../shared/types/pagination'
import type { KanbanResponse } from '../shared/types/kanban'
import type { Deal, DealStage } from '../shared/types'

type PipelineState = {
  deals: Deal[]
  kanbanStages: KanbanResponse['stages']
  kanbanPerStage: number
  current: Deal | null
  currentError: string | null
  loading: boolean
  loadingStage: DealStage | null
  error: string | null
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const initialState: PipelineState = {
  deals: [],
  kanbanStages: [],
  kanbanPerStage: 15,
  current: null,
  currentError: null,
  loading: false,
  loadingStage: null,
  error: null,
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
}

export const fetchKanbanDeals = createAsyncThunk(
  'pipeline/fetchKanban',
  async (params?: {
    assignedTo?: string
    perStage?: number
    stagePages?: Partial<Record<DealStage, number>>
  }) => {
    const search = new URLSearchParams()
    if (params?.assignedTo) search.set('assignedTo', params.assignedTo)
    if (params?.perStage) search.set('perStage', String(params.perStage))
    if (params?.stagePages) {
      for (const [stage, page] of Object.entries(params.stagePages)) {
        if (page && page > 1) search.set(`page_${stage}`, String(page))
      }
    }
    const query = search.toString() ? `?${search}` : ''
    return api<KanbanResponse>(`/api/deals/kanban${query}`)
  },
)

export const loadMoreKanbanStage = createAsyncThunk(
  'pipeline/loadMoreKanbanStage',
  async (params: {
    stage: DealStage
    page: number
    assignedTo?: string
    perStage?: number
  }) => {
    const search = new URLSearchParams()
    if (params.assignedTo) search.set('assignedTo', params.assignedTo)
    if (params.perStage) search.set('perStage', String(params.perStage))
    search.set(`page_${params.stage}`, String(params.page))
    const data = await api<KanbanResponse>(`/api/deals/kanban?${search}`)
    const column = data.stages.find((s) => s.stage === params.stage)
    return { stage: params.stage, column }
  },
)

export const fetchDeals = createAsyncThunk(
  'pipeline/fetchDeals',
  async (params?: { assignedTo?: string; page?: number; pageSize?: number }) => {
    const search = new URLSearchParams()
    if (params?.assignedTo) search.set('assignedTo', params.assignedTo)
    if (params?.page) search.set('page', String(params.page))
    if (params?.pageSize) search.set('pageSize', String(params.pageSize))
    const query = search.toString() ? `?${search}` : ''
    return api<PaginatedResponse<Deal>>(`/api/deals${query}`)
  },
)

export const fetchDeal = createAsyncThunk(
  'pipeline/fetchDeal',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api<Deal>(`/api/deals/${id}`)
    } catch (err) {
      if (err instanceof ApiError) return rejectWithValue(err.message)
      throw err
    }
  },
)

export const createDeal = createAsyncThunk(
  'pipeline/createDeal',
  async (payload: {
    title: string
    stage?: DealStage
    mrr?: number
    arr?: number
    probability?: number
    contactId?: string
    accountId?: string
    closeDate?: string
  }) =>
    api<Deal>('/api/deals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
)

export const updateDeal = createAsyncThunk(
  'pipeline/updateDeal',
  async (payload: {
    id: string
    title?: string
    stage?: DealStage
    mrr?: number | null
    arr?: number | null
    probability?: number
    contactId?: string | null
    accountId?: string | null
    closeDate?: string | null
    assignedToId?: string | null
  }) => {
    const { id, ...data } = payload
    return api<Deal>(`/api/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
)

export const deleteDeal = createAsyncThunk(
  'pipeline/deleteDeal',
  async (id: string) => {
    await api(`/api/deals/${id}`, { method: 'DELETE' })
    return id
  },
)

export const updateDealStage = createAsyncThunk(
  'pipeline/updateStage',
  async (payload: { id: string; stage: DealStage }) => {
    return api<Deal>(`/api/deals/${payload.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        stage: payload.stage,
        probability: STAGE_DEFAULT_PROBABILITY[payload.stage],
      }),
    })
  },
)

const pipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    clearCurrentDeal(state) {
      state.current = null
      state.currentError = null
    },
    optimisticMoveDeal(
      state,
      action: PayloadAction<{ id: string; stage: DealStage }>,
    ) {
      const deal = state.deals.find((d) => d.id === action.payload.id)
      const previousStage = deal?.stage
      if (deal) {
        deal.stage = action.payload.stage
        deal.probability = STAGE_DEFAULT_PROBABILITY[action.payload.stage]
      }
      if (state.current?.id === action.payload.id) {
        state.current.stage = action.payload.stage
        state.current.probability =
          STAGE_DEFAULT_PROBABILITY[action.payload.stage]
      }
      if (deal && previousStage && state.kanbanStages.length > 0) {
        state.kanbanStages = state.kanbanStages.map((col) => {
          if (col.stage === previousStage) {
            return {
              ...col,
              deals: col.deals.filter((d) => d.id !== deal.id),
              total: Math.max(0, col.total - 1),
            }
          }
          if (col.stage === action.payload.stage) {
            return {
              ...col,
              deals: [deal, ...col.deals],
              total: col.total + 1,
            }
          }
          return col
        })
        state.deals = state.kanbanStages.flatMap((s) => s.deals)
      }
    },
  },
  extraReducers: (builder) => {
    const syncDeal = (state: PipelineState, deal: Deal) => {
      const index = state.deals.findIndex((d) => d.id === deal.id)
      if (index >= 0) state.deals[index] = deal
      else state.deals.unshift(deal)
      if (state.current?.id === deal.id) {
        state.current = { ...state.current, ...deal }
      }
    }

    builder
      .addCase(fetchKanbanDeals.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchKanbanDeals.fulfilled, (state, action) => {
        state.loading = false
        state.kanbanStages = action.payload.stages
        state.kanbanPerStage = action.payload.perStage
        state.deals = action.payload.stages.flatMap((s) => s.deals)
        state.total = action.payload.stages.reduce((sum, s) => sum + s.total, 0)
      })
      .addCase(fetchKanbanDeals.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load pipeline'
      })
      .addCase(loadMoreKanbanStage.pending, (state, action) => {
        state.loadingStage = action.meta.arg.stage
      })
      .addCase(loadMoreKanbanStage.fulfilled, (state, action) => {
        state.loadingStage = null
        if (!action.payload.column) return
        const idx = state.kanbanStages.findIndex(
          (s) => s.stage === action.payload.stage,
        )
        if (idx >= 0) {
          const existing = state.kanbanStages[idx]
          const existingIds = new Set(existing.deals.map((d) => d.id))
          const newDeals = action.payload.column.deals.filter(
            (d) => !existingIds.has(d.id),
          )
          state.kanbanStages[idx] = {
            ...action.payload.column,
            deals: [...existing.deals, ...newDeals],
          }
        }
        state.deals = state.kanbanStages.flatMap((s) => s.deals)
      })
      .addCase(loadMoreKanbanStage.rejected, (state) => {
        state.loadingStage = null
      })
      .addCase(fetchDeals.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDeals.fulfilled, (state, action) => {
        state.loading = false
        state.deals = action.payload.data
        state.page = action.payload.pagination.page
        state.pageSize = action.payload.pagination.pageSize
        state.total = action.payload.pagination.total
        state.totalPages = action.payload.pagination.totalPages
      })
      .addCase(fetchDeals.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load deals'
      })
      .addCase(fetchDeal.pending, (state) => {
        state.current = null
        state.currentError = null
      })
      .addCase(fetchDeal.fulfilled, (state, action) => {
        state.current = action.payload
        state.currentError = null
      })
      .addCase(fetchDeal.rejected, (state, action) => {
        state.currentError =
          (action.payload as string) ?? action.error.message ?? 'Failed to load deal'
      })
      .addCase(createDeal.fulfilled, (state, action) => {
        state.deals.unshift(action.payload)
        state.total += 1
      })
      .addCase(updateDeal.fulfilled, (state, action) => {
        syncDeal(state, action.payload)
      })
      .addCase(updateDealStage.fulfilled, (state, action) => {
        state.error = null
        syncDeal(state, action.payload)
      })
      .addCase(updateDealStage.rejected, (state, action) => {
        state.error = action.error.message ?? 'Failed to update deal stage'
      })
      .addCase(deleteDeal.fulfilled, (state, action) => {
        state.deals = state.deals.filter((d) => d.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
        if (state.current?.id === action.payload) state.current = null
      })
  },
})

export const { clearCurrentDeal, optimisticMoveDeal } = pipelineSlice.actions
export default pipelineSlice.reducer
