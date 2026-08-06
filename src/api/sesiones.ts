/**
 * @module api/sesiones
 * @description Session/access history API — reads from the backend's existing
 * Auditoria table (no new table), scoped to the authenticated user's own events.
 *
 * @see ABA-backend/Controllers/SesionesController.cs
 */

import { apiGet } from './client'
import type { SesionRegistro } from './types'

/**
 * Lists the authenticated user's access history (last 50 events): logins,
 * registrations, and IP whitelist validation/rejection events.
 *
 * Calls `GET /sesiones`.
 */
export async function listarSesiones() {
  return apiGet<SesionRegistro[]>('/sesiones')
}
