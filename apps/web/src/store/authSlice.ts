import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'

import {

  api,

  ApiError,

  clearTokens,

  logoutApi,

  setTokens,

  tryRestoreSession,

} from '../shared/api/client'



export type UserOrganization = {

  id: string

  name: string

  slug: string

  role: string

}

import type { Organization, User } from '../shared/types'



type AuthState = {

  user: User | null

  organization: Organization | null

  role: string | null

  organizations: UserOrganization[]

  loading: boolean

  error: string | null

  sessionChecked: boolean

}



const initialState: AuthState = {

  user: null,

  organization: null,

  role: null,

  organizations: [],

  loading: false,

  error: null,

  sessionChecked: false,

}



type TokenResponse = {

  accessToken?: string

  refreshToken?: string

  token?: string

}



function storeAuthTokens(data: TokenResponse) {

  const access = data.accessToken ?? data.token

  if (!access) return

  setTokens(access)

}



type AuthResponse = TokenResponse & {

  user: User

  organization: Organization

  role?: string

  organizations?: UserOrganization[]

}



export type LoginResponse =

  | AuthResponse

  | {

      requiresOrgSelection: true

      organizations: {

        id: string

        name: string

        slug: string

        role: string

      }[]

      user: User

    }



export const register = createAsyncThunk(

  'auth/register',

  async (payload: {

    name: string

    email: string

    password: string

    organizationName: string

  }) => {

    const data = await api<AuthResponse>('/api/auth/register', {

      method: 'POST',

      body: JSON.stringify(payload),

    })

    storeAuthTokens(data)

    return data

  },

)



export const login = createAsyncThunk(

  'auth/login',

  async (payload: { email: string; password: string; organizationId?: string }) => {

    const data = await api<LoginResponse>('/api/auth/login', {

      method: 'POST',

      body: JSON.stringify(payload),

    })

    if ('requiresOrgSelection' in data) return data

    storeAuthTokens(data)

    return data

  },

)



export const acceptInvite = createAsyncThunk(

  'auth/acceptInvite',

  async (payload: { token: string; password?: string; name?: string }) => {

    const data = await api<AuthResponse>('/api/auth/accept-invite', {

      method: 'POST',

      body: JSON.stringify(payload),

    })

    storeAuthTokens(data)

    return data

  },

)



export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { dispatch, rejectWithValue }) => {
    const restored = await tryRestoreSession()
    if (!restored) {
      return rejectWithValue({ status: 401, message: 'No active session' })
    }
    return dispatch(fetchMe()).unwrap()
  },
)

export const fetchMe = createAsyncThunk(

  'auth/fetchMe',

  async (_, { rejectWithValue }) => {

    try {

      return await api<{

        user: User

        organization: Organization

        role: string

        organizations: UserOrganization[]

      }>('/api/auth/me')

    } catch (err) {

      if (err instanceof ApiError) {

        return rejectWithValue({

          status: err.status,

          message: err.message,

        })

      }

      return rejectWithValue({

        status: 0,

        message: 'Could not reach the server',

      })

    }

  },

)



export const updateProfile = createAsyncThunk(

  'auth/updateProfile',

  async (payload: { name: string }) => {

    return api<{ user: User }>('/api/auth/me', {

      method: 'PATCH',

      body: JSON.stringify(payload),

    })

  },

)



export const changePassword = createAsyncThunk(

  'auth/changePassword',

  async (payload: { currentPassword: string; newPassword: string }) => {

    await api('/api/auth/change-password', {

      method: 'POST',

      body: JSON.stringify(payload),

    })

    return true

  },

)



export const changeEmail = createAsyncThunk(

  'auth/changeEmail',

  async (payload: { newEmail: string; password: string }) => {

    return api<{ ok: boolean; message: string; verifyUrl?: string }>(

      '/api/auth/me/email',

      {

        method: 'PATCH',

        body: JSON.stringify(payload),

      },

    )

  },

)



export const cancelEmailChange = createAsyncThunk('auth/cancelEmailChange', async () => {

  await api('/api/auth/me/email', { method: 'DELETE' })

  return true

})



export const verifyEmailChange = createAsyncThunk(

  'auth/verifyEmailChange',

  async (token: string) => {

    return api<{ ok: boolean; email: string }>('/api/auth/verify-email-change', {

      method: 'POST',

      body: JSON.stringify({ token }),

    })

  },

)



export const logoutAll = createAsyncThunk('auth/logoutAll', async () => {

  await api('/api/auth/logout-all', { method: 'POST' })

  clearTokens()

  return true

})



export const switchOrganization = createAsyncThunk(

  'auth/switchOrg',

  async (organizationId: string) => {

    const data = await api<AuthResponse>('/api/auth/switch-org', {

      method: 'POST',

      body: JSON.stringify({ organizationId }),

    })

    storeAuthTokens(data)

    return data

  },

)



export const signOut = createAsyncThunk('auth/signOut', async () => {

  await logoutApi()

})



const authSlice = createSlice({

  name: 'auth',

  initialState,

  reducers: {

    logout(state) {

      state.user = null

      state.organization = null

      state.role = null

      state.organizations = []

      state.sessionChecked = true

      clearTokens()

    },

    clearError(state) {

      state.error = null

    },

  },

  extraReducers: (builder) => {

    const pending = (state: AuthState) => {

      state.loading = true

      state.error = null

    }

    const rejected = (state: AuthState, action: { error: { message?: string } }) => {

      state.loading = false

      state.error = action.error.message ?? 'Something went wrong'

    }



    builder

      .addCase(register.pending, pending)

      .addCase(register.fulfilled, (state, action) => {

        state.loading = false

        state.sessionChecked = true

        state.user = action.payload.user

        state.organization = action.payload.organization

        state.role = action.payload.role ?? 'ADMIN'

      })

      .addCase(register.rejected, rejected)

      .addCase(login.pending, pending)

      .addCase(login.fulfilled, (state, action) => {

        state.loading = false

        if ('requiresOrgSelection' in action.payload) return

        state.sessionChecked = true

        state.user = action.payload.user

        state.organization = action.payload.organization

        state.role = action.payload.role ?? null

        state.organizations =

          'organizations' in action.payload

            ? (action.payload.organizations ?? [])

            : []

      })

      .addCase(login.rejected, rejected)

      .addCase(acceptInvite.pending, pending)

      .addCase(acceptInvite.fulfilled, (state, action) => {

        state.loading = false

        state.sessionChecked = true

        state.user = action.payload.user

        state.organization = action.payload.organization

        state.role = action.payload.role ?? null

        state.organizations = action.payload.organizations ?? []

      })

      .addCase(acceptInvite.rejected, rejected)

      .addCase(restoreSession.pending, pending)

      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false
        state.sessionChecked = true
        state.error = null
        state.user = action.payload.user
        state.organization = action.payload.organization
        state.role = action.payload.role
        state.organizations = action.payload.organizations ?? []
      })

      .addCase(restoreSession.rejected, (state) => {
        state.loading = false
        state.sessionChecked = true
        state.user = null
        state.organization = null
        state.role = null
        state.organizations = []
        state.error = null
      })

      .addCase(fetchMe.pending, pending)

      .addCase(fetchMe.fulfilled, (state, action) => {

        state.loading = false

        state.sessionChecked = true

        state.error = null

        state.user = action.payload.user

        state.organization = action.payload.organization

        state.role = action.payload.role

        state.organizations = action.payload.organizations ?? []

      })

      .addCase(switchOrganization.fulfilled, (state, action) => {

        state.user = action.payload.user

        state.organization = action.payload.organization

        state.role = action.payload.role ?? null

        state.organizations = action.payload.organizations ?? []

      })

      .addCase(fetchMe.rejected, (state, action) => {

        state.loading = false

        state.sessionChecked = true

        const payload = action.payload as

          | { status?: number; message?: string }

          | undefined

        const status = payload?.status ?? 0

        state.error = payload?.message ?? 'Session could not be restored'

        if (status === 401 || status === 403) {

          state.user = null

          state.organization = null

          state.role = null

          clearTokens()

        }

      })

      .addCase(updateProfile.fulfilled, (state, action) => {

        state.loading = false

        state.user = action.payload.user

      })

      .addCase(updateProfile.rejected, rejected)

      .addCase(changePassword.fulfilled, (state) => {

        state.loading = false

      })

      .addCase(changePassword.rejected, rejected)

      .addCase(signOut.fulfilled, (state) => {

        state.user = null

        state.organization = null

        state.role = null

        state.organizations = []

        state.sessionChecked = true

      })

  },

})



export const { logout, clearError } = authSlice.actions

export default authSlice.reducer


