/**
 * @module api/n8n
 * @description N8N workspace self-service API (Entregable 3).
 *
 * These endpoints require authentication (HttpOnly cookie) and CSRF for
 * mutations. The workspace name and password are generated entirely by the
 * backend SP — the client only triggers the operation.
 *
 * ## Rate Limit
 *
 * - `POST /n8n/crear` — 1 creation every 10 minutes per user.
 *
 * ## One-Time Secret
 *
 * `passwordTemporal` is returned exactly once by `crearWorkspaceN8n()`. It must
 * be shown immediately to the user (with copy option) and a clear warning that
 * it will never be shown again. Never store it in localStorage.
 *
 * @see ABA-backend/Controllers/N8nController.cs
 * @see guia-integracion-frontend.md — Entregable 3, Módulo N8N
 */

import { apiGet, apiPost, apiDelete } from './client'
import type { N8nWorkspace, N8nWorkspaceCreado } from './types'

/**
 * Creates a new N8N workspace for the authenticated user.
 *
 * Calls `POST /n8n/crear`. The backend generates the workspace name and a
 * temporary password, returned only once in `passwordTemporal`.
 *
 * On failure:
 * - 409 Conflict: user already has an active N8N workspace
 * - 429 Too Many Requests: rate limit hit (1 per 10 minutes)
 *
 * @returns Created workspace with the one-time password, or error
 *
 * @example
 * ```typescript
 * const result = await crearWorkspaceN8n()
 * if (result.ok) {
 *   console.log('Password (save this!):', result.data.passwordTemporal)
 * }
 * ```
 */
export async function crearWorkspaceN8n() {
  return apiPost<N8nWorkspaceCreado>('/n8n/crear', {})
}

/**
 * Gets the authenticated user's current N8N workspace.
 *
 * Calls `GET /n8n/mi-workspace`. Returns 404 (surfaced as `status: 404`)
 * when the user has no active workspace — use that to drive the UI's
 * empty state.
 *
 * @returns The user's workspace, or error (status 404 if none)
 */
export async function obtenerMiWorkspaceN8n() {
  return apiGet<N8nWorkspace>('/n8n/mi-workspace')
}

/**
 * Soft-deletes the authenticated user's N8N workspace.
 *
 * Calls `DELETE /n8n/mi-workspace`. Returns 204 on success, 404 if the
 * user had no active workspace.
 *
 * @returns Success or error
 */
export async function eliminarWorkspaceN8n() {
  return apiDelete<unknown>('/n8n/mi-workspace')
}
