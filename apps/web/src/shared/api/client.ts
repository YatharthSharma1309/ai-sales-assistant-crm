const ACCESS_TOKEN_KEY = 'crm_access_token'
const REFRESH_TOKEN_KEY = 'crm_refresh_token'
const LEGACY_TOKEN_KEY = 'crm_token'

function migrateLegacyToken(): string | null {
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacy) {
    localStorage.setItem(ACCESS_TOKEN_KEY, legacy)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
    return legacy
  }
  return null
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY) ?? migrateLegacyToken()
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/** @deprecated Use getAccessToken */
export function getToken(): string | null {
  return getAccessToken()
}

export function setTokens(accessToken: string | null, refreshToken?: string | null) {
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }

  if (refreshToken !== undefined) {
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
    else localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

/** @deprecated Use setTokens */
export function setToken(token: string | null) {
  setTokens(token, token ? getRefreshToken() : null)
}

export function clearTokens() {
  setTokens(null, null)
}

export type ApiErrorBody = {
  error?: string
  requiresConfirmation?: boolean
  [key: string]: unknown
}

export class ApiError extends Error {
  status: number
  details?: ApiErrorBody

  constructor(message: string, status: number, details?: ApiErrorBody) {
    super(message)
    this.status = status
    this.details = details
  }
}

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false

  const base = import.meta.env.VITE_API_URL ?? ''
  try {
    const response = await fetch(`${base}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      clearTokens()
      return false
    }

    const data = (await response.json()) as {
      accessToken: string
      refreshToken: string
    }
    setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

async function ensureRefreshed(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const token = getAccessToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers ?? {}),
  }

  if (token) {
    ;(headers as Record<string, string>).Authorization = `Bearer ${token}`
  }

  const base = import.meta.env.VITE_API_URL ?? ''
  const response = await fetch(`${base}${path}`, { ...options, headers })

  if (response.status === 401 && !retried && getRefreshToken()) {
    const refreshed = await ensureRefreshed()
    if (refreshed) {
      return api<T>(path, options, true)
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiError(body.error ?? 'Request failed', response.status, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function logoutApi(): Promise<void> {
  const refreshToken = getRefreshToken()
  if (refreshToken) {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      })
    } catch {
      // ignore — clear local tokens regardless
    }
  }
  clearTokens()
}
