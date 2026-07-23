/**
 * @module api/landing
 * @description Public landing page API functions.
 *
 * These endpoints do NOT require authentication and are used to display
 * public statistics on the landing page.
 *
 * ## Rate Limit
 *
 * Sliding Window limiter per IP — aggressive to protect SQL Server from
 * expensive aggregation queries on a public endpoint.
 *
 * ## Cache
 *
 * Results are cached 60 seconds server-side. The frontend should NOT implement
 * its own polling — just fetch once on mount.
 *
 * @see message.txt — Section 6 (Endpoints)
 * @see ABA-backend/Controllers/LandingController.cs
 */

import { apiGet } from './client'
import type { MetricasPublicas } from './types'

/**
 * Fetches public platform statistics.
 *
 * Calls `GET /stats` (no authentication required). Returns aggregated
 * metrics like total users, databases, and availability percentage.
 *
 * **Important:** This endpoint may return 500 if the backend database
 * (`ABA_Control`) is still initializing. This is NOT a frontend bug —
 * report it to the backend team with the traceId.
 *
 * @returns Platform metrics, or error
 *
 * @example
 * ```typescript
 * const result = await getStats()
 * if (result.ok) {
 *   console.log(`${result.data.totalUsuarios} users`)
 * }
 * ```
 */
export async function getStats() {
  return apiGet<MetricasPublicas>('/stats')
}
