/**
 * @module api/client
 * @description Core HTTP client for all backend API communication.
 *
 * ## Security Model
 *
 * This module implements the exact security contract required by the ABA backend:
 *
 * 1. **Cookie-based auth (HttpOnly JWT)**: All requests use `credentials: 'include'`
 *    so the browser automatically attaches the HttpOnly session cookie. The JWT is
 *    NEVER readable from JavaScript — this is by design.
 *
 * 2. **CSRF protection (Double Submit Cookie)**: For mutating requests (POST/PUT/DELETE),
 *    we read the `XSRF-TOKEN` cookie (set by `GET /auth/csrf`) and send it back as the
 *    `X-CSRF-TOKEN` header. The backend validates they match.
 *
 * 3. **Rate limit handling**: When the backend returns `429 Too Many Requests`, we parse
 *    the `Retry-After` header and surface it to the user as a friendly message.
 *
 * 4. **Error standardization**: Every error is normalized to `ApiError` format so
 *    components don't need to handle different error shapes.
 *
 * ## Usage
 *
 * ```typescript
 * import { apiGet, apiPost } from './client'
 *
 * // GET request
 * const result = await apiGet<DashboardItem[]>('/dashboard/bases')
 *
 * // POST request (automatically includes CSRF token)
 * const result = await apiPost<ProvisioningResult>('/provisioning/crear', { nombreMotor: 'MySQL' })
 * ```
 *
 * @see message.txt — Sections 1, 3, 6 for the full backend security contract
 */

import type { ApiError, ApiResult } from './types'

// ─── Configuration ─────────────────────────────────────────────────────────

/**
 * Base URL for the ABA backend API.
 *
 * In development (Vite), reads from `VITE_API_URL` environment variable.
 * Falls back to the production API URL if not set.
 *
 * Configure in `.env` at the frontend root:
 * ```
 * VITE_API_URL=http://localhost:8080
 * ```
 */
export const API_BASE = import.meta.env.VITE_API_URL || 'https://api.aba.andrescortes.dev'

// ─── CSRF Token Management ─────────────────────────────────────────────────

/**
 * Tracks whether we've already fetched the CSRF token from the backend.
 *
 * The backend's `GET /auth/csrf` endpoint sets two cookies:
 * - `__CSRF` (HttpOnly, server-side validation)
 * - `XSRF-TOKEN` (readable by JS, sent back as header)
 *
 * We only need to call this once per session — after that, the cookies persist.
 */
/**
 * Fetches the CSRF token from the backend.
 *
 * Calls `GET /auth/csrf` which returns 204 No Content but sets the CSRF cookies
 * (`XSRF-TOKEN` readable by JS, `__CSRF` HttpOnly for server validation).
 *
 * Always re-fetches to avoid stale tokens if cookies were cleared by the browser
 * or SameSite policy. The endpoint is lightweight (204, no body).
 */
export async function fetchCsrf(): Promise<void> {
  await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' })
}

/**
 * No-op kept for API compatibility. CSRF is now always re-fetched.
 */
export function resetCsrf() {
  // Intentionally empty: fetchCsrf() always re-fetches, no flag to reset.
}

// ─── XSRF Token Reading ───────────────────────────────────────────────────

/**
 * Reads the XSRF-TOKEN value from the browser's cookie jar.
 *
 * The `XSRF-TOKEN` cookie is set by the backend's `GET /auth/csrf` endpoint
 * with `HttpOnly: false` so JavaScript can read it. We parse it manually
 * because the browser doesn't expose non-HttpOnly cookies via any API
 * other than `document.cookie`.
 *
 * @returns The decoded XSRF token string, or null if not found.
 *
 * @see message.txt — Section 3 (CSRF — obligatorio en POST / PUT / DELETE)
 */
function readXsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

// ─── Request Helpers ───────────────────────────────────────────────────────

/**
 * Performs a GET request to the ABA backend.
 *
 * @typeParam T - Expected response type
 * @param path - API path (e.g. '/dashboard/bases')
 * @returns Typed result with data or error
 *
 * @example
 * ```typescript
 * const result = await apiGet<DashboardItem[]>('/dashboard/bases')
 * if (result.ok) console.log(result.data)
 * ```
 */
export async function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>('GET', path)
}

/**
 * Performs a POST request to the ABA backend.
 *
 * Automatically includes the CSRF token header for CSRF protection.
 *
 * @typeParam T - Expected response type
 * @param path - API path (e.g. '/auth/refresh')
 * @param body - Optional request body (will be JSON-serialized)
 * @returns Typed result with data or error
 *
 * @example
 * ```typescript
 * const result = await apiPost<unknown>('/auth/logout')
 * ```
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return apiRequest<T>('POST', path, body)
}

/**
 * Performs a DELETE request to the ABA backend.
 *
 * Automatically includes the CSRF token header for CSRF protection.
 *
 * @typeParam T - Expected response type
 * @param path - API path (e.g. '/dashboard/bases/1')
 * @returns Typed result with data or error
 */
export async function apiDelete<T>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>('DELETE', path)
}

// ─── Core Request Engine ───────────────────────────────────────────────────

/**
 * Internal request handler that implements the full security contract.
 *
 * This function:
 * 1. Sets `credentials: 'include'` so the browser sends HttpOnly cookies
 * 2. Reads `XSRF-TOKEN` and sends it as `X-CSRF-TOKEN` for mutations
 * 3. Handles special status codes (204, 401, 429) with appropriate messages
 * 4. Normalizes all responses to `ApiResult<T>` format
 *
 * @typeParam T - Expected response data type
 * @param method - HTTP method
 * @param path - API path relative to `API_BASE`
 * @param body - Optional request body
 * @returns Normalized result
 *
 * @see message.txt — Section 6 (Endpoints) for the full endpoint table
 */
async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const url = `${API_BASE}${path}`
  const headers: Record<string, string> = {}

  // Set content type for requests with a body
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  // CSRF protection: attach X-CSRF-TOKEN header for mutating requests
  // (POST, PUT, DELETE, PATCH) — the backend validates this against the
  // __CSRF cookie using the Double Submit Cookie pattern.
  const isMutating = method === 'POST' || method === 'PUT' || method === 'DELETE' || method === 'PATCH'
  if (isMutating) {
    const xsrf = readXsrfToken()
    if (xsrf) {
      headers['X-CSRF-TOKEN'] = xsrf
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: 'include', // CRITICAL: sends HttpOnly cookies (access_token, refresh_token, __CSRF)
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // 204 No Content — used by /auth/refresh, /auth/logout, /auth/csrf
  if (res.status === 204) {
    return { ok: true, data: undefined as T }
  }

  // 401 Unauthorized — session expired or invalid
  // The refresh interceptor in App.tsx handles automatic retry before showing this.
  if (res.status === 401) {
    const retryAfter = res.headers.get('Retry-After')
    const error: ApiError = {
      error: retryAfter ? `Sesión expirada. Reintenta en ${retryAfter}s.` : 'Sesión no válida.',
    }
    return { ok: false, error, status: 401 }
  }

  // 429 Too Many Requests — rate limited
  // The backend includes a Retry-After header with seconds until the limit resets.
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After')
    const error: ApiError = {
      error: retryAfter
        ? `Demasiadas solicitudes. Reintenta en ${retryAfter} segundos.`
        : 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
    }
    return { ok: false, error, status: 429 }
  }

  // Parse JSON response body
  let json: Record<string, unknown>
  try {
    json = await res.json()
  } catch {
    const error: ApiError = { error: 'Respuesta inválida del servidor.' }
    return { ok: false, error, status: res.status }
  }

  // Non-2xx responses: extract error message and traceId
  if (!res.ok) {
    const error: ApiError = {
      error: (json.error as string) || 'Ha ocurrido un error inesperado.',
      traceId: json.traceId as string | undefined,
    }
    return { ok: false, error, status: res.status }
  }

  // Success: return parsed JSON
  return { ok: true, data: json as T }
}
