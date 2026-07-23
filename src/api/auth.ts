/**
 * @module api/auth
 * @description Authentication API functions.
 *
 * ## OAuth2 Flow
 *
 * ABA uses OAuth2 (Google/GitHub) for authentication. The flow is:
 *
 * 1. Frontend redirects the browser to `api.aba.andrescortes.dev/auth/{provider}/login`
 * 2. The user authorizes with the provider (Google/GitHub)
 * 3. The provider redirects back to the backend's callback URL
 * 4. The backend validates, creates/updates the user, and sets HttpOnly cookies
 * 5. The backend redirects to `aba.andrescortes.dev/auth/success`
 * 6. The frontend's `/auth/success` page confirms the session via `POST /auth/refresh`
 *
 * **Why `window.location.href`?** OAuth2 requires a full browser navigation to the
 * provider's authorization page — it can't be done via `fetch()` or `XMLHttpRequest`.
 *
 * @see message.txt — Section 2 (Flujo de login)
 */

import { apiPost, fetchCsrf } from './client'

// ─── OAuth Login ───────────────────────────────────────────────────────────

/**
 * Initiates the Google OAuth2 login flow.
 *
 * Redirects the browser to Google's authorization page. The backend handles
 * the callback at `/auth/google/callback`, validates the tokens, creates
 * the user if needed, sets session cookies, and redirects to `/auth/success`.
 *
 * **This is a full page navigation, not an AJAX call.**
 */
export function loginWithGoogle() {
  window.location.href = 'https://api.aba.andrescortes.dev/auth/google/login'
}

/**
 * Initiates the GitHub OAuth2 login flow.
 *
 * Same flow as Google but via GitHub's authorization endpoint.
 * The backend handles the callback at `/auth/github/callback`.
 */
export function loginWithGithub() {
  window.location.href = 'https://api.aba.andrescortes.dev/auth/github/login'
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
