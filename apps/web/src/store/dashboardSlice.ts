import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, ApiError } from '../shared/api/client'
import type { DashboardStats, DashboardTrends, PipelineForecast } from '../shared/types'
import type { ManagerDashboard, OnboardingStatus } from '../shared/types/team'

type DashboardState = {
  stats: DashboardStats | null
  forecast: PipelineForecast | null
  manager: ManagerDashboard | null
  onboarding: OnboardingStatus | null
  trends: DashboardTrends | null
  loading: boolean
  forecastLoading: boolean
  managerLoading: boolean
  trendsLoading: boolean
  error: string | null
  forecastError: string | null
  managerError: string | null
}

const initialState: DashboardState = {
  stats: null,
  forecast: null,
  manager: null,
  onboarding: null,
  trends: null,
  loading: false,
  forecastLoading: false,
  managerLoading: false,
  trendsLoading: false,
  error: null,
  forecastError: null,
  managerError: null,
}

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async () => api<DashboardStats>('/api/dashboard/stats'),
)

export const fetchDashboardForecast = createAsyncThunk(
  'dashboard/fetchForecast',
  async () => api<PipelineForecast>('/api/dashboard/forecast'),
)

export const fetchManagerDashboard = createAsyncThunk(
  'dashboard/fetchManager',
  async (_, { rejectWithValue }) => {
    try {
      return await api<ManagerDashboard>('/api/dashboard/manager')
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        return rejectWithValue({ forbidden: true, message: err.message })
      }
      throw err
    }
  },
)

export const fetchOnboardingStatus = createAsyncThunk(
  'dashboard/fetchOnboarding',
  async () => api<OnboardingStatus>('/api/dashboard/onboarding'),
)

export const fetchDashboardTrends = createAsyncThunk(
  'dashboard/fetchTrends',
  async () => api<DashboardTrends>('/api/dashboard/trends'),
)

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false
        state.stats = action.payload
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load stats'
      })
      .addCase(fetchDashboardForecast.pending, (state) => {
        state.forecastLoading = true
        state.forecastError = null
      })
      .addCase(fetchDashboardForecast.fulfilled, (state, action) => {
        state.forecastLoading = false
        state.forecast = action.payload
      })
      .addCase(fetchDashboardForecast.rejected, (state, action) => {
        state.forecastLoading = false
        state.forecastError = action.error.message ?? 'Failed to load forecast'
      })
      .addCase(fetchManagerDashboard.pending, (state) => {
        state.managerLoading = true
        state.managerError = null
      })
      .addCase(fetchManagerDashboard.fulfilled, (state, action) => {
        state.managerLoading = false
        state.manager = action.payload
      })
      .addCase(fetchManagerDashboard.rejected, (state, action) => {
        state.managerLoading = false
        const payload = action.payload as
          | { forbidden?: boolean; message?: string }
          | undefined
        if (payload?.forbidden) {
          state.manager = null
          state.managerError = null
          return
        }
        state.managerError =
          payload?.message ??
          action.error.message ??
          'Failed to load manager dashboard'
      })
      .addCase(fetchOnboardingStatus.fulfilled, (state, action) => {
        state.onboarding = action.payload
      })
      .addCase(fetchDashboardTrends.pending, (state) => {
        state.trendsLoading = true
      })
      .addCase(fetchDashboardTrends.fulfilled, (state, action) => {
        state.trendsLoading = false
        state.trends = action.payload
      })
      .addCase(fetchDashboardTrends.rejected, (state) => {
        state.trendsLoading = false
      })
  },
})

export default dashboardSlice.reducer
