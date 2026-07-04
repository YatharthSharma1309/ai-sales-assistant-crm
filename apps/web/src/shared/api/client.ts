/** In-memory only — not persisted to localStorage (XSS mitigation). */
let accessToken: string | null = null

const LEGACY_ACCESS_KEY = 'crm_access_token'
const LEGACY_REFRESH_KEY = 'crm_refresh_token'
const LEGACY_TOKEN_KEY = 'crm_token'

function clearLegacyStorage(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(LEGACY_ACCESS_KEY)
  localStorage.removeItem(LEGACY_REFRESH_KEY)
  localStorage.removeItem(LEGACY_TOKEN_KEY)
}

/** One-time migration: move any legacy localStorage token into memory, then wipe storage. */
function migrateLegacyToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  const legacy =
    localStorage.getItem(LEGACY_ACCESS_KEY) ??
    localStorage.getItem(LEGACY_TOKEN_KEY)
  if (!legacy) return null
  accessToken = legacy
  clearLegacyStorage()
  return legacy
}

export function getAccessToken(): string | null {
  return accessToken ?? migrateLegacyToken()
}

/** @deprecated Refresh tokens are stored in httpOnly cookies */
export function getRefreshToken(): string | null {
  return null
}

/** @deprecated Use getAccessToken */
export function getToken(): string | null {
  return getAccessToken()
}

export function setTokens(token: string | null) {
  accessToken = token
  if (token) clearLegacyStorage()
}

/** @deprecated Use setTokens */
export function setToken(token: string | null) {
  setTokens(token)
}

export function clearTokens() {
  accessToken = null
  clearLegacyStorage()
}

export type ApiErrorBody = {
  error?: string
  code?: string
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

function apiBase() {
  return import.meta.env.VITE_API_URL ?? ''
}

function fetchOptions(options: RequestInit = {}): RequestInit {
  return {
    credentials: 'include',
    ...options,
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const base = apiBase()
  try {
    const response = await fetch(
      `${base}/api/auth/refresh`,
      fetchOptions({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    if (!response.ok) {
      clearTokens()
      return false
    }

    const data = (await response.json()) as {
      accessToken: string
      token?: string
    }
    setTokens(data.accessToken ?? data.token ?? null)
    return Boolean(data.accessToken ?? data.token)
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

/** Restore access token from httpOnly refresh cookie (e.g. after browser restart). */
export async function tryRestoreSession(): Promise<boolean> {
  if (getAccessToken()) return true
  return refreshAccessToken()
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

  const base = apiBase()
  const response = await fetch(
    `${base}${path}`,
    fetchOptions({ ...options, headers }),
  )

  if (response.status === 401 && !retried) {
    const refreshed = await ensureRefreshed()
    if (refreshed) {
      return api<T>(path, options, true)
    }
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    if (body.code === 'REFRESH_REUSE') {
      clearTokens()
    }
    throw new ApiError(body.error ?? 'Request failed', response.status, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export async function logoutApi(): Promise<void> {
  const base = apiBase()
  try {
    await fetch(
      `${base}/api/auth/logout`,
      fetchOptions({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  } catch {
    // ignore — clear local tokens regardless
  }
  clearTokens()
}
