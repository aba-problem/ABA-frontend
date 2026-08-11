/**
 * @module api/celulasSocias
 * @description Admin API for managing partner cells — `/admin/celulas-socias`.
 *
 * Requires `usuario.esAdmin` (backend enforces the real check via the
 * `Admin` role on the JWT regardless of what the UI shows). Not to be
 * confused with `api/provisioning.ts` — this manages the CELL registry
 * itself, not the databases a cell provisions with its own key.
 *
 * ## API key handling
 *
 * The backend generates the key (`CRYPT_GEN_RANDOM` in SQL) and returns it
 * in plaintext exactly once, on create and on rotate — same pattern as
 * `passwordTemporal` when provisioning a database. It is never stored or
 * retrievable again after that response.
 *
 * @see ABA-backend/Controllers/AdminCelulasSociasController.cs
 * @see api/types.ts — CelulaSocia, CelulaSociaCreada
 */

import { apiGet, apiPost, apiPatch } from './client'
import type { CelulaSocia, CelulaSociaCreada } from './types'

/**
 * Lists all partner cells (Admin only).
 *
 * Calls `GET /admin/celulas-socias`.
 */
export async function listarCelulasSocias() {
  return apiGet<CelulaSocia[]>('/admin/celulas-socias')
}

/** Payload for creating a partner cell. */
export interface AltaCelulaSociaPayload {
  /** Display name (e.g. "Beta Devs"). */
  nombreCelula: string
  /** Short lowercase prefix that forces name isolation for its databases (e.g. "beta"). */
  prefijo: string
}

/**
 * Creates a new partner cell and generates its API key.
 *
 * Calls `POST /admin/celulas-socias`. The response's `apiKey` is shown
 * ONLY this once — copy it before closing the confirmation.
 *
 * On failure: 422 (invalid prefix or duplicate name/prefix).
 */
export async function altaCelulaSocia(payload: AltaCelulaSociaPayload) {
  return apiPost<CelulaSociaCreada>('/admin/celulas-socias', payload)
}

/**
 * Activates or deactivates a partner cell (soft toggle — never deletes the row).
 *
 * Calls `PATCH /admin/celulas-socias/{id}/estado`. A deactivated cell's API
 * key stops working immediately (generic 401, same as an invalid key).
 */
export async function cambiarEstadoCelulaSocia(id: number, activo: boolean) {
  return apiPatch<CelulaSocia>(`/admin/celulas-socias/${id}/estado`, { activo })
}

/**
 * Rotates a partner cell's API key (e.g. after it leaked).
 *
 * Calls `POST /admin/celulas-socias/{id}/rotar-key`. The old key stops
 * working immediately; the new one is shown ONLY this once.
 */
export async function rotarApiKeyCelulaSocia(id: number) {
  return apiPost<CelulaSociaCreada>(`/admin/celulas-socias/${id}/rotar-key`)
}
