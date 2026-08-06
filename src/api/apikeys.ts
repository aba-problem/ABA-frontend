/**
 * @module api/apikeys
 * @description API key management (Entregable 3 — IA como Servicio).
 *
 * These management endpoints use the standard cookie + CSRF scheme. The
 * actual *usage* of a key (`/ai/completar`) lives in a separate controller
 * protected by the `X-API-Key` header and is meant for external consumers,
 * not the browser.
 *
 * ## Rate Limit
 *
 * - `POST /apikeys/crear` — 5 creations per hour per user.
 *
 * ## One-Time Secret
 *
 * `keyCompleta` is returned exactly once by `crearApiKey()`. Only the
 * `prefijo` is ever listed later. Show the full key immediately and warn
 * the user it cannot be retrieved again.
 *
 * @see ABA-backend/Controllers/ApiKeysController.cs
 * @see guia-integracion-frontend.md — Entregable 3, Módulo IA
 */

import { apiGet, apiPost } from './client'
import type { ApiKey, ApiKeyCreada, ApiKeyConsumoDia } from './types'

/**
 * Creates a new API key for the authenticated user.
 *
 * Calls `POST /apikeys/crear`. Returns the full key once in `keyCompleta`.
 *
 * On failure:
 * - 409 Conflict: maximum number of active API keys reached
 * - 429 Too Many Requests: rate limit hit (5 per hour)
 *
 * @returns Created key with the one-time full key, or error
 *
 * @example
 * ```typescript
 * const result = await crearApiKey()
 * if (result.ok) {
 *   console.log('Full key (save this!):', result.data.keyCompleta)
 * }
 * ```
 */
export async function crearApiKey() {
  return apiPost<ApiKeyCreada>('/apikeys/crear', {})
}

/**
 * Lists the authenticated user's API keys.
 *
 * Calls `GET /apikeys`. Only exposes the `prefijo` of each key — never the
 * full key or its hash.
 *
 * @returns List of API keys, or error
 */
export async function listarApiKeys() {
  return apiGet<ApiKey[]>('/apikeys')
}

/**
 * Revokes an API key by ID.
 *
 * Calls `POST /apikeys/{id}/revocar`. Idempotent. Returns 404 if the key
 * does not exist or does not belong to the user.
 *
 * @param id - API key ID
 * @returns Success or error
 */
export async function revocarApiKey(id: number) {
  return apiPost<unknown>(`/apikeys/${id}/revocar`)
}

/**
 * Gets daily consumption for an API key over the last 30 days.
 *
 * Calls `GET /apikeys/{id}/consumo`. Returns 404 if the key does not exist
 * or does not belong to the user.
 *
 * @param id - API key ID
 * @returns Daily consumption entries, or error
 */
export async function obtenerConsumoApiKey(id: number) {
  return apiGet<ApiKeyConsumoDia[]>(`/apikeys/${id}/consumo`)
}
