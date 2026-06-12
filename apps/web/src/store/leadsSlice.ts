import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, ApiError } from '../shared/api/client'
import type { PaginatedResponse } from '../shared/types/pagination'
import type { Lead, LeadStatus } from '../shared/types'

type LeadsState = {
  items: Lead[]
  current: Lead | null
  currentError: string | null
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const initialState: LeadsState = {
  items: [],
  current: null,
  currentError: null,
  loading: false,
  error: null,
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
}

export const fetchLeads = createAsyncThunk(
  'leads/fetchAll',
  async (params?: {
    q?: string
    status?: LeadStatus
    assignedTo?: string
    page?: number
    pageSize?: number
  }) => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.status) search.set('status', params.status)
    if (params?.assignedTo) search.set('assignedTo', params.assignedTo)
    if (params?.page) search.set('page', String(params.page))
    if (params?.pageSize) search.set('pageSize', String(params.pageSize))
    const query = search.toString() ? `?${search}` : ''
    return api<PaginatedResponse<Lead>>(`/api/leads${query}`)
  },
)

export const fetchLead = createAsyncThunk(
  'leads/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api<Lead>(`/api/leads/${id}`)
    } catch (err) {
      if (err instanceof ApiError) return rejectWithValue(err.message)
      throw err
    }
  },
)

export const createLead = createAsyncThunk(
  'leads/create',
  async (payload: {
    title: string
    status?: LeadStatus
    source?: string
    notes?: string
    contactId?: string
  }) =>
    api<Lead>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
)

export const updateLead = createAsyncThunk(
  'leads/update',
  async (payload: {
    id: string
    title?: string
    status?: LeadStatus
    source?: string
    notes?: string
    contactId?: string | null
    assignedToId?: string | null
  }) => {
    const { id, ...data } = payload
    return api<Lead>(`/api/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
)

export const deleteLead = createAsyncThunk(
  'leads/delete',
  async (id: string) => {
    await api(`/api/leads/${id}`, { method: 'DELETE' })
    return id
  },
)

export const importLeads = createAsyncThunk(
  'leads/import',
  async (
    leads: {
      title: string
      status?: LeadStatus
      source?: string
      notes?: string
    }[],
  ) =>
    api<{ imported: number; leads: Lead[] }>('/api/leads/import', {
      method: 'POST',
      body: JSON.stringify({ leads }),
    }),
)

const leadsSlice = createSlice({
  name: 'leads',
  initialState,
  reducers: {
    clearCurrentLead(state) {
      state.current = null
      state.currentError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeads.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.data
        state.page = action.payload.pagination.page
        state.pageSize = action.payload.pagination.pageSize
        state.total = action.payload.pagination.total
        state.totalPages = action.payload.pagination.totalPages
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load leads'
      })
      .addCase(fetchLead.pending, (state) => {
        state.current = null
        state.currentError = null
      })
      .addCase(fetchLead.fulfilled, (state, action) => {
        state.current = action.payload
        state.currentError = null
      })
      .addCase(fetchLead.rejected, (state, action) => {
        state.currentError =
          (action.payload as string) ?? action.error.message ?? 'Failed to load lead'
      })
      .addCase(createLead.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
        state.total += 1
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        const index = state.items.findIndex((l) => l.id === action.payload.id)
        if (index >= 0) state.items[index] = action.payload
        if (state.current?.id === action.payload.id) {
          state.current = action.payload
        }
      })
      .addCase(importLeads.fulfilled, (state, action) => {
        state.items = [...action.payload.leads, ...state.items]
        state.total += action.payload.imported
      })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.items = state.items.filter((l) => l.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
        if (state.current?.id === action.payload) state.current = null
      })
  },
})

export const { clearCurrentLead } = leadsSlice.actions
export default leadsSlice.reducer
