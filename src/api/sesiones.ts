/**
 * @module api/sesiones
 * @description Session/access history API — reads from the backend's existing
 * Auditoria table, scoped to the authenticated user's own events. Server-side
 * paginated as of the 2026-08-11 backend update (`sp_ListarSesionesUsuario`).
 *
 * @see ABA-backend/Controllers/SesionesController.cs
 */

import { apiGet, apiPost } from './client'
import type { SesionesPaginadas } from './types'

/**
 * Lists a page of the authenticated user's access history: logins,
 * registrations, IP whitelist validation/rejection, and IP revocations.
 *
 * Calls `GET /sesiones?pagina=&tamanoPagina=`.
 */
export async function listarSesiones(pagina = 1, tamanoPagina = 20) {
  return apiGet<SesionesPaginadas>(`/sesiones?pagina=${pagina}&tamanoPagina=${tamanoPagina}`)
}

/**
 * "No fui yo, bloquear" — deactivates a specific IP from the user's own
 * whitelist. Calls `POST /sesiones/ips/revocar`. Returns 404 if that IP
 * isn't currently active for the user (e.g. already revoked elsewhere).
 */
export async function revocarIp(direccionIp: string) {
  return apiPost<unknown>('/sesiones/ips/revocar', { direccionIp })
}
