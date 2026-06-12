import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, ApiError } from '../shared/api/client'
import type { PaginatedResponse } from '../shared/types/pagination'
import type { Account } from '../shared/types'

type AccountsState = {
  items: Account[]
  current: Account | null
  currentError: string | null
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const initialState: AccountsState = {
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

export const fetchAccounts = createAsyncThunk(
  'accounts/fetchAll',
  async (params?: { q?: string; page?: number; pageSize?: number }) => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.page) search.set('page', String(params.page))
    if (params?.pageSize) search.set('pageSize', String(params.pageSize))
    const query = search.toString() ? `?${search}` : ''
    return api<PaginatedResponse<Account>>(`/api/accounts${query}`)
  },
)

export const fetchAccount = createAsyncThunk(
  'accounts/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api<Account>(`/api/accounts/${id}`)
    } catch (err) {
      if (err instanceof ApiError) return rejectWithValue(err.message)
      throw err
    }
  },
)

export const updateAccount = createAsyncThunk(
  'accounts/update',
  async (payload: {
    id: string
    name?: string
    industry?: string
    companySize?: string
    website?: string
  }) => {
    const { id, ...data } = payload
    return api<Account>(`/api/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
)

export const deleteAccount = createAsyncThunk(
  'accounts/delete',
  async (id: string) => {
    await api(`/api/accounts/${id}`, { method: 'DELETE' })
    return id
  },
)

export const createAccount = createAsyncThunk(
  'accounts/create',
  async (payload: {
    name: string
    industry?: string
    companySize?: string
    website?: string
  }) =>
    api<Account>('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
)

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    clearCurrentAccount(state) {
      state.current = null
      state.currentError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccounts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAccounts.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.data
        state.page = action.payload.pagination.page
        state.pageSize = action.payload.pagination.pageSize
        state.total = action.payload.pagination.total
        state.totalPages = action.payload.pagination.totalPages
      })
      .addCase(fetchAccounts.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load accounts'
      })
      .addCase(fetchAccount.pending, (state) => {
        state.current = null
        state.currentError = null
      })
      .addCase(fetchAccount.fulfilled, (state, action) => {
        state.current = action.payload
        state.currentError = null
      })
      .addCase(fetchAccount.rejected, (state, action) => {
        state.currentError =
          (action.payload as string) ?? action.error.message ?? 'Failed to load account'
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
        state.total += 1
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        const index = state.items.findIndex((a) => a.id === action.payload.id)
        if (index >= 0) state.items[index] = action.payload
        if (state.current?.id === action.payload.id) {
          state.current = { ...state.current, ...action.payload }
        }
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.items = state.items.filter((a) => a.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
        if (state.current?.id === action.payload) state.current = null
      })
  },
})

export const { clearCurrentAccount } = accountsSlice.actions
export default accountsSlice.reducer
