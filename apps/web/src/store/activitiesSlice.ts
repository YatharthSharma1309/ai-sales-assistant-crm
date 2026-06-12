import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api } from '../shared/api/client'
import type { PaginatedResponse } from '../shared/types/pagination'
import type { Activity, ActivityType } from '../shared/types'

type ActivitiesState = {
  items: Activity[]
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const initialState: ActivitiesState = {
  items: [],
  loading: false,
  error: null,
  page: 1,
  pageSize: 25,
  total: 0,
  totalPages: 1,
}

export const fetchActivities = createAsyncThunk(
  'activities/fetch',
  async (params: {
    leadId?: string
    contactId?: string
    dealId?: string
    page?: number
    pageSize?: number
  }) => {
    const search = new URLSearchParams()
    if (params.leadId) search.set('leadId', params.leadId)
    if (params.contactId) search.set('contactId', params.contactId)
    if (params.dealId) search.set('dealId', params.dealId)
    if (params.page) search.set('page', String(params.page))
    if (params.pageSize) search.set('pageSize', String(params.pageSize))
    const query = search.toString() ? `?${search}` : ''
    return api<PaginatedResponse<Activity>>(`/api/activities${query}`)
  },
)

export const updateActivity = createAsyncThunk(
  'activities/update',
  async (payload: {
    id: string
    title?: string
    body?: string | null
    dueAt?: string | null
    completed?: boolean
  }) => {
    const { id, ...data } = payload
    return api<Activity>(`/api/activities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
)

export const deleteActivity = createAsyncThunk(
  'activities/delete',
  async (id: string) => {
    await api(`/api/activities/${id}`, { method: 'DELETE' })
    return id
  },
)

export const createActivity = createAsyncThunk(
  'activities/create',
  async (payload: {
    type: ActivityType
    title: string
    body?: string
    dueAt?: string
    leadId?: string
    contactId?: string
    dealId?: string
  }) =>
    api<Activity>('/api/activities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
)

const activitiesSlice = createSlice({
  name: 'activities',
  initialState,
  reducers: {
    clearActivities(state) {
      state.items = []
      state.page = 1
      state.total = 0
      state.totalPages = 1
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivities.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchActivities.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.data
        state.page = action.payload.pagination.page
        state.pageSize = action.payload.pagination.pageSize
        state.total = action.payload.pagination.total
        state.totalPages = action.payload.pagination.totalPages
      })
      .addCase(fetchActivities.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load activities'
      })
      .addCase(createActivity.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
        state.total += 1
      })
      .addCase(updateActivity.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id)
        if (index >= 0) state.items[index] = action.payload
      })
      .addCase(deleteActivity.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
      })
  },
})

export const { clearActivities } = activitiesSlice.actions
export default activitiesSlice.reducer
