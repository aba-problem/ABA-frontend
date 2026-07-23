/**
 * @module api/dashboard
 * @description Dashboard API functions for managing user databases.
 *
 * All endpoints in this module require authentication (HttpOnly cookie).
 * The backend extracts the user ID from the JWT claim — never trust
 * client-provided user IDs (security control BOLA).
 *
 * ## Rate Limits
 *
 * - `GET /dashboard/bases` — Sliding Window rate limiter
 * - `GET /dashboard/bases/{id}/credencial` — Strict: 5 requests/hour per user
 *   (security control 3.2: credential exposure minimization)
 *
 * @see message.txt — Section 6 (Endpoints)
 * @see ABA-backend/Controllers/DashboardController.cs
 */

import { apiGet } from './client'
import type { DashboardItem, Credencial } from './types'

/**
 * Lists all databases belonging to the authenticated user.
 *
 * Calls `GET /dashboard/bases` with session cookies. Returns an array of
 * `DashboardItem` objects with connection info, status, and storage metrics.
 *
 * **Does NOT include passwords** — use `getCredential()` for that.
 *
 * @returns Array of database items, or error
 *
 * @example
 * ```typescript
 * const result = await listDatabases()
 * if (result.ok) {
 *   result.data.forEach(db => console.log(db.nombreBD, db.estado))
 * }
 * ```
 */
export async function listDatabases() {
  return apiGet<DashboardItem[]>('/dashboard/bases')
}

/**
 * Gets details for a single database by ID.
 *
 * Calls `GET /dashboard/bases/{id}`. The backend validates ownership —
 * you can only access your own databases. If the ID doesn't belong to
 * the user, returns 404 (not 403, to avoid confirming resource existence).
 *
 * @param id - Database ID (from `DashboardItem.id`)
 * @returns Single database item, or error
 */
export async function getDatabase(id: number) {
  return apiGet<DashboardItem>(`/dashboard/bases/${id}`)
}

/**
 * Gets the full credentials for a database, including the password.
 *
 * Calls `GET /dashboard/bases/{id}/credencial`. This endpoint has a strict
 * rate limit of **5 requests per hour per user** to prevent credential
 * enumeration attacks.
 *
 * **Security notes:**
 * - The password is decrypted from AES-256 storage only for this response
 * - Never log, store in localStorage, or display without user action
 * - If the database doesn't belong to the user, returns 404 (not 403)
 *
 * @param id - Database ID
 * @returns Full credential details including password, or error
 */
export async function getCredential(id: number) {
  return apiGet<Credencial>(`/dashboard/bases/${id}/credencial`)
}
