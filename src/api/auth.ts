/**
 * @module api/auth
 * @description Authentication API functions.
 *
 * ## OAuth2 Flow
 *
 * ABA uses OAuth2 (Google/GitHub) for authentication. The flow is:
 *
 * 1. Frontend probes the login endpoint via `fetch()` with `redirect: 'manual'`
 * 2. If the backend returns a redirect (opaque) → proceed with `window.location.href`
 * 3. If the backend returns 400 `CAPTCHA_REQUERIDO` → show Turnstile widget
 * 4. After Turnstile solves, retry with `?captchaToken=<token>`
 * 5. On success, the full redirect flow completes: provider → backend → /auth/success
 *
 * **Why `fetch` with `redirect: 'manual'`?**
 * The login endpoints (`/auth/{provider}/login`) are navigation endpoints that return
 * 302 redirects to the OAuth provider. We need to detect `CAPTCHA_REQUERIDO` (400)
 * BEFORE the browser navigates away. Using `window.location.href` directly would lose
 * the response body and show an ugly nginx error page.
 *
 * **Opaque redirect handling:**
 * With `redirect: 'manual'`, a 302 response becomes `type: 'opaqueredirect'` with
 * `status: 0` — we can't read the Location header. But we already know the URL we
 * probed, so we just navigate to it. The second request follows the same path.
 *
 * @see message.txt — Section 2 (Flujo de login)
 */

import { apiPost, fetchCsrf, API_BASE } from './client'
import type { ApiError } from './types'

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Result of probing a login endpoint.
 *
 * - `ok: true` with `redirectUrl` — proceed with `window.location.href = redirectUrl`
 * - `ok: false` with `CAPTCHA_REQUERIDO` — show Turnstile challenge
 * - `ok: false` with other error — show error message
 */
export type LoginResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: ApiError; status: number }

// ─── OAuth Login ───────────────────────────────────────────────────────────

/**
 * Probes the backend login endpoint without triggering a browser redirect.
 *
 * Uses `fetch()` with `redirect: 'manual'` to detect:
 * - **Opaque redirect (302)**: Login can proceed — returns the probed URL
 * - **400 CAPTCHA_REQUERIDO**: Too many attempts — Turnstile challenge needed
 * - **429 Too Many Requests**: Rate limited — returns Retry-After
 *
 * When the result is `ok: true`, the caller should use `window.location.href`
 * to navigate to the `redirectUrl` (the same URL we probed). This triggers a
 * second request that the backend handles normally (302 → OAuth provider).
 *
 * @param provider - 'google' or 'github'
 * @param captchaToken - Optional Turnstile token (passed as query param on retry)
 * @returns Login result with redirect URL or error
 */
async function probeLogin(provider: 'google' | 'github', captchaToken?: string): Promise<LoginResult> {
  const url = new URL(`${API_BASE}/auth/${provider}/login`)
  if (captchaToken) {
    url.searchParams.set('captchaToken', captchaToken)
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'manual', // Don't follow — we need to inspect the response
    credentials: 'include',
  })

  // Opaque redirect = backend returned 302 to the OAuth provider.
  // We can't read the Location header (opaque), but we know the URL we probed.
  // Just navigate there — the browser will follow the redirect on the second request.
  if (res.type === 'opaqueredirect') {
    return { ok: true, redirectUrl: url.toString() }
  }

  // 429 Too Many Requests → rate limited
  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After')
    return {
      ok: false,
      error: { error: retryAfter ? `Demasiados intentos. Reintenta en ${retryAfter}s.` : 'Demasiados intentos.' },
      status: 429,
    }
  }

  // 400 CAPTCHA_REQUERIDO or other errors
  if (res.status >= 400) {
    try {
      const json = await res.json()
      return {
        ok: false,
        error: { error: (json.error as string) || 'Error de autenticación.' },
        status: res.status,
      }
    } catch {
      return {
        ok: false,
        error: { error: 'Error de autenticación.' },
        status: res.status,
      }
    }
  }

  // Unexpected response — treat as error
  return {
    ok: false,
    error: { error: 'Respuesta inesperada del servidor.' },
    status: res.status,
  }
}

/**
 * Initiates the Google OAuth2 login flow.
 *
 * Probes the endpoint first to detect CAPTCHA requirements.
 * On success, redirects the browser to Google's authorization page.
 *
 * @param captchaToken - Optional Turnstile token for retry after CAPTCHA challenge
 * @returns Login result
 */
export function loginWithGoogle(captchaToken?: string): Promise<LoginResult> {
  return probeLogin('google', captchaToken)
}

/**
 * Initiates the GitHub OAuth2 login flow.
 *
 * Same flow as Google but via GitHub's authorization endpoint.
 *
 * @param captchaToken - Optional Turnstile token for retry after CAPTCHA challenge
 * @returns Login result
 */
export function loginWithGithub(captchaToken?: string): Promise<LoginResult> {
  return probeLogin('github', captchaToken)
}

// ─── Session Management ────────────────────────────────────────────────────

/**
 * Attempts to refresh the session by calling `POST /auth/refresh`.
 *
 * The backend validates the refresh token (from HttpOnly cookie), rotates
 * both access and refresh tokens, and returns 204 on success.
 *
 * This is used by:
 * - `AuthContext.confirmSession()` on app mount to check if user is logged in
 * - The automatic refresh interceptor (if implemented in the API layer)
 *
 * @returns `ApiResult<unknown>` — success means session is valid
 *
 * @see message.txt — Section 4 (Refresh automático)
 */
export async function refreshSession() {
  return apiPost<unknown>('/auth/refresh')
}

/**
 * Logs out the current user.
 *
 * Calls `POST /auth/logout` which clears all session cookies (access_token,
 * refresh_token, __CSRF). Requires CSRF token (automatically handled by `apiPost`).
 *
 * After calling this, the user should be redirected to `/login`.
 */
export async function logout() {
  await fetchCsrf()
  const result = await apiPost<unknown>('/auth/logout')
  return result
}

/**
 * Initializes the CSRF token by fetching it from the backend.
 *
 * Calls `GET /auth/csrf` which sets two cookies:
 * - `__CSRF` (HttpOnly) — used by the backend for validation
 * - `XSRF-TOKEN` (readable by JS) — sent back as `X-CSRF-TOKEN` header
 *
 * Must be called once after login before any mutating requests.
 *
 * @see message.txt — Section 3 (CSRF)
 */
export async function initCsrf() {
  await fetchCsrf()
}
