import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, ApiError } from '../shared/api/client'
import type { PaginatedResponse } from '../shared/types/pagination'
import type { Contact } from '../shared/types'

type ContactsState = {
  items: Contact[]
  current: Contact | null
  currentError: string | null
  loading: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const initialState: ContactsState = {
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

export const fetchContacts = createAsyncThunk(
  'contacts/fetchAll',
  async (params?: {
    q?: string
    accountId?: string
    page?: number
    pageSize?: number
  }) => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.accountId) search.set('accountId', params.accountId)
    if (params?.page) search.set('page', String(params.page))
    if (params?.pageSize) search.set('pageSize', String(params.pageSize))
    const query = search.toString() ? `?${search}` : ''
    return api<PaginatedResponse<Contact>>(`/api/contacts${query}`)
  },
)

export const fetchContact = createAsyncThunk(
  'contacts/fetchOne',
  async (id: string, { rejectWithValue }) => {
    try {
      return await api<Contact>(`/api/contacts/${id}`)
    } catch (err) {
      if (err instanceof ApiError) return rejectWithValue(err.message)
      throw err
    }
  },
)

export const updateContact = createAsyncThunk(
  'contacts/update',
  async (payload: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
    jobTitle?: string
    phone?: string
    accountId?: string | null
  }) => {
    const { id, ...data } = payload
    return api<Contact>(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },
)

export const deleteContact = createAsyncThunk(
  'contacts/delete',
  async (id: string) => {
    await api(`/api/contacts/${id}`, { method: 'DELETE' })
    return id
  },
)

export const createContact = createAsyncThunk(
  'contacts/create',
  async (payload: {
    firstName: string
    lastName: string
    email?: string
    jobTitle?: string
    phone?: string
    accountId?: string
  }) =>
    api<Contact>('/api/contacts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
)

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    clearCurrentContact(state) {
      state.current = null
      state.currentError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.data
        state.page = action.payload.pagination.page
        state.pageSize = action.payload.pagination.pageSize
        state.total = action.payload.pagination.total
        state.totalPages = action.payload.pagination.totalPages
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load contacts'
      })
      .addCase(fetchContact.pending, (state) => {
        state.current = null
        state.currentError = null
      })
      .addCase(fetchContact.fulfilled, (state, action) => {
        state.current = action.payload
        state.currentError = null
      })
      .addCase(fetchContact.rejected, (state, action) => {
        state.currentError =
          (action.payload as string) ?? action.error.message ?? 'Failed to load contact'
      })
      .addCase(createContact.fulfilled, (state, action) => {
        state.items.unshift(action.payload)
        state.total += 1
      })
      .addCase(updateContact.fulfilled, (state, action) => {
        const index = state.items.findIndex((c) => c.id === action.payload.id)
        if (index >= 0) state.items[index] = action.payload
        if (state.current?.id === action.payload.id) {
          state.current = { ...state.current, ...action.payload }
        }
      })
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.items = state.items.filter((c) => c.id !== action.payload)
        state.total = Math.max(0, state.total - 1)
        if (state.current?.id === action.payload) state.current = null
      })
  },
})

export const { clearCurrentContact } = contactsSlice.actions
export default contactsSlice.reducer
