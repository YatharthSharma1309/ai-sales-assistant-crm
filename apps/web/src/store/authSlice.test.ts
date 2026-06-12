import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage: Record<string, string> = {}

vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = value
  },
  removeItem: (key: string) => {
    delete storage[key]
  },
})

const { default: authReducer, fetchMe, logout } = await import('./authSlice')

describe('authSlice session handling', () => {
  beforeEach(() => {
    for (const key of Object.keys(storage)) {
      delete storage[key]
    }
  })

  it('fetchMe.fulfilled sets user and sessionChecked', () => {
    const state = authReducer(
      undefined,
      fetchMe.fulfilled(
        {
          user: { id: 'u1', name: 'Test', email: 't@test.com' },
          organization: { id: 'o1', name: 'Org', slug: 'org' },
          role: 'ADMIN',
          organizations: [],
        },
        '',
        undefined,
      ),
    )

    expect(state.user?.id).toBe('u1')
    expect(state.sessionChecked).toBe(true)
    expect(state.error).toBeNull()
  })

  it('fetchMe.rejected with 401 clears session and token', () => {
    storage.crm_access_token = 'stale-token'

    const state = authReducer(
      {
        user: { id: 'u1', name: 'Test', email: 't@test.com' },
        organization: { id: 'o1', name: 'Org', slug: 'org' },
        role: 'ADMIN',
        organizations: [],
        loading: true,
        error: null,
        sessionChecked: false,
      },
      {
        type: fetchMe.rejected.type,
        payload: { status: 401, message: 'Unauthorized' },
        meta: {
          requestId: 'test',
          arg: undefined,
          rejectedWithValue: true,
        },
        error: { message: 'Rejected' },
      },
    )

    expect(state.user).toBeNull()
    expect(state.sessionChecked).toBe(true)
    expect(state.error).toBe('Unauthorized')
    expect(storage.crm_access_token).toBeUndefined()
  })

  it('fetchMe.rejected with network error keeps token', () => {
    storage.crm_access_token = 'valid-token'

    const state = authReducer(
      {
        user: null,
        organization: null,
        role: null,
        organizations: [],
        loading: true,
        error: null,
        sessionChecked: false,
      },
      {
        type: fetchMe.rejected.type,
        payload: { status: 0, message: 'Could not reach the server' },
        meta: {
          requestId: 'test',
          arg: undefined,
          rejectedWithValue: true,
        },
        error: { message: 'Rejected' },
      },
    )

    expect(state.user).toBeNull()
    expect(state.sessionChecked).toBe(true)
    expect(state.error).toBe('Could not reach the server')
    expect(storage.crm_access_token).toBe('valid-token')
  })

  it('logout resets sessionChecked', () => {
    const state = authReducer(
      {
        user: { id: 'u1', name: 'Test', email: 't@test.com' },
        organization: { id: 'o1', name: 'Org', slug: 'org' },
        role: 'ADMIN',
        organizations: [],
        loading: false,
        error: null,
        sessionChecked: true,
      },
      logout(),
    )

    expect(state.user).toBeNull()
    expect(state.sessionChecked).toBe(true)
  })
})
