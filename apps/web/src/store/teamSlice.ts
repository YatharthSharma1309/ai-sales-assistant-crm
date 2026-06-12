import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { api, ApiError } from '../shared/api/client'
import type { OrgRole } from '../shared/constants/roles'
import type { TeamInvite, TeamMember } from '../shared/types/team'

type TeamState = {
  members: TeamMember[]
  pendingInvites: TeamInvite[]
  loading: boolean
  error: string | null
}

const initialState: TeamState = {
  members: [],
  pendingInvites: [],
  loading: false,
  error: null,
}

export const fetchTeam = createAsyncThunk('team/fetch', async () => {
  return api<TeamMember[]>('/api/team')
})

export const fetchPendingInvites = createAsyncThunk('team/fetchInvites', async () => {
  return api<TeamInvite[]>('/api/team/invites')
})

export const inviteTeamMember = createAsyncThunk(
  'team/invite',
  async (
    payload: {
      name?: string
      email: string
      role: 'MANAGER' | 'REP'
    },
    { rejectWithValue },
  ) => {
    try {
      return await api<TeamInvite>('/api/team/invite', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    } catch (err) {
      if (err instanceof ApiError) {
        return rejectWithValue({ message: err.message })
      }
      throw err
    }
  },
)

export const revokeInvite = createAsyncThunk(
  'team/revokeInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      await api(`/api/team/invites/${inviteId}`, { method: 'DELETE' })
      return inviteId
    } catch (err) {
      if (err instanceof ApiError) {
        return rejectWithValue({ message: err.message })
      }
      throw err
    }
  },
)

export const resendInvite = createAsyncThunk(
  'team/resendInvite',
  async (inviteId: string, { rejectWithValue }) => {
    try {
      return await api<{ id: string; expiresAt: string; inviteUrl?: string }>(
        `/api/team/invites/${inviteId}/resend`,
        { method: 'POST' },
      )
    } catch (err) {
      if (err instanceof ApiError) {
        return rejectWithValue({ message: err.message })
      }
      throw err
    }
  },
)

export const removeTeamMember = createAsyncThunk(
  'team/remove',
  async (membershipId: string, { rejectWithValue }) => {
    try {
      await api(`/api/team/${membershipId}`, { method: 'DELETE' })
      return membershipId
    } catch (err) {
      if (err instanceof ApiError) {
        return rejectWithValue({ message: err.message })
      }
      throw err
    }
  },
)

export const updateMemberRole = createAsyncThunk(
  'team/updateRole',
  async (
    payload: { membershipId: string; role: OrgRole },
    { rejectWithValue },
  ) => {
    try {
      return await api<{ id: string; role: OrgRole; user: TeamMember['user'] }>(
        `/api/team/${payload.membershipId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role: payload.role }),
        },
      )
    } catch (err) {
      if (err instanceof ApiError) {
        return rejectWithValue({ message: err.message })
      }
      throw err
    }
  },
)

const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeam.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTeam.fulfilled, (state, action) => {
        state.loading = false
        state.members = action.payload
      })
      .addCase(fetchTeam.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Failed to load team'
      })
      .addCase(fetchPendingInvites.fulfilled, (state, action) => {
        state.pendingInvites = action.payload
      })
      .addCase(inviteTeamMember.fulfilled, (state, action) => {
        state.pendingInvites.unshift(action.payload)
      })
      .addCase(revokeInvite.fulfilled, (state, action) => {
        state.pendingInvites = state.pendingInvites.filter(
          (inv) => inv.id !== action.payload,
        )
      })
      .addCase(resendInvite.fulfilled, (state, action) => {
        const index = state.pendingInvites.findIndex(
          (inv) => inv.id === action.payload.id,
        )
        if (index >= 0) {
          state.pendingInvites[index].expiresAt = action.payload.expiresAt
        }
      })
      .addCase(updateMemberRole.fulfilled, (state, action) => {
        const index = state.members.findIndex((m) => m.id === action.payload.id)
        if (index >= 0) state.members[index].role = action.payload.role
      })
      .addCase(removeTeamMember.fulfilled, (state, action) => {
        state.members = state.members.filter((m) => m.id !== action.payload)
      })
      .addCase(removeTeamMember.rejected, (state, action) => {
        const payload = action.payload as { message?: string } | undefined
        state.error =
          payload?.message ?? action.error.message ?? 'Failed to remove member'
      })
      .addCase(updateMemberRole.rejected, (state, action) => {
        const payload = action.payload as { message?: string } | undefined
        state.error =
          payload?.message ?? action.error.message ?? 'Failed to update role'
      })
  },
})

export default teamSlice.reducer
