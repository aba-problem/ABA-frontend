/**
 * @module api/dns
 * @description DNS self-service API (Entregable 3) — user endpoints + admin.
 *
 * The user picks a `subdominio`, `tipoRegistro` (`A` | `CNAME`) and `valor`.
 * The backend SP reserves the record, calls the real provider (Cloudflare)
 * and confirms. The record is never left "ACTIVO" if the provider call fails.
 *
 * ## Errors to handle in the UI
 *
 * - 409 Conflict: the subdomain is already in use (`/dns/crear`)
 * - 503 Service Unavailable: the real provider failed after validation —
 *   transient, retrying makes sense (the reservation was rolled back)
 *
 * ## Admin
 *
 * `AdminDnsController` (`/admin/dns`) requires the `Admin` role on the JWT.
 * Use `usuario.esAdmin` from the profile for UI visibility only — the backend
 * always enforces real authorization.
 *
 * @see ABA-backend/Controllers/DnsController.cs
 * @see ABA-backend/Controllers/AdminDnsController.cs
 * @see guia-integracion-frontend.md — Entregable 3, Módulo DNS
 */

import { apiGet, apiPost, apiDelete } from './client'
import type { DnsRegistro, DnsRegistroReserva } from './types'

/** Payload for creating a DNS record. */
export interface DnsRegistroCrearPayload {
  /** Subdomain (lowercase letters, digits, hyphens; max 40 chars). */
  subdominio: string
  /** Record type: 'A' or 'CNAME'. */
  tipoRegistro: 'A' | 'CNAME'
  /** Target value (IP for A, hostname for CNAME; max 255 chars). */
  valor: string
}

/**
 * Creates a DNS record for the authenticated user.
 *
 * Calls `POST /dns/crear` with `{ subdominio, tipoRegistro, valor }`.
 *
 * On failure:
 * - 409 Conflict: the subdomain is already in use
 * - 422 Unprocessable Entity: invalid subdomain, type or value
 * - 503 Service Unavailable: the real provider failed — transient, retry
 *
 * @param payload - Subdomain, record type and target value
 * @returns The created record reservation, or error
 *
 * @example
 * ```typescript
 * const result = await crearRegistroDns({ subdominio: 'app', tipoRegistro: 'A', valor: '1.2.3.4' })
 * ```
 */
export async function crearRegistroDns(payload: DnsRegistroCrearPayload) {
  return apiPost<DnsRegistroReserva>('/dns/crear', payload)
}

/**
 * Lists the authenticated user's DNS records.
 *
 * Calls `GET /dns/mis-registros`.
 *
 * @returns List of DNS records, or error
 */
export async function listarMisRegistrosDns() {
  return apiGet<DnsRegistro[]>('/dns/mis-registros')
}

/**
 * Deletes one of the authenticated user's DNS records.
 *
 * Calls `DELETE /dns/{id}`. Returns 404 if the record does not exist or
 * does not belong to the user.
 *
 * @param id - Record ID
 * @returns Success or error
 */
export async function eliminarRegistroDns(id: number) {
  return apiDelete<unknown>(`/dns/${id}`)
}

// ─── Admin endpoints ──────────────────────────────────────────────────────

/**
 * Lists ALL DNS records across all users (Admin only).
 *
 * Calls `GET /admin/dns`. Includes `usuarioCorreo` for each record. The
 * backend enforces the Admin role regardless of what the UI shows.
 *
 * @returns List of all DNS records, or error
 */
export async function listarTodosRegistrosDnsAdmin() {
  return apiGet<DnsRegistro[]>('/admin/dns')
}

/**
 * Deletes any DNS record (Admin only).
 *
 * Calls `DELETE /admin/dns/{id}`. Returns 404 if the record does not exist.
 *
 * @param id - Record ID
 * @returns Success or error
 */
export async function eliminarRegistroDnsAdmin(id: number) {
  return apiDelete<unknown>(`/admin/dns/${id}`)
}
