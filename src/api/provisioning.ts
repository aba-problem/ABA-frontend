/**
 * @module api/provisioning
 * @description Database provisioning API.
 *
 * Creates new databases for the authenticated user. The backend orchestrates
 * the provisioning process between ABA_Control (metadata) and the target
 * database engine (MySQL/SQLServer).
 *
 * ## Rate Limit
 *
 * Token Bucket: 1 creation every 10 minutes per user.
 *
 * ## Security Controls
 *
 * - **BOLA prevention**: userId is extracted from JWT, never from request body
 * - **Mass-assignment prevention**: Backend rejects unknown fields in the request
 * - **Engine validation**: Only 'MySQL' and 'SQLServer' are accepted
 *
 * @see message.txt — Section 6 (Endpoints)
 * @see ABA-backend/Controllers/ProvisioningController.cs
 */

import { apiPost } from './client'
import type { ProvisioningResult } from './types'

/**
 * Creates a new database for the authenticated user.
 *
 * Calls `POST /provisioning/crear` with the selected engine.
 *
 * On success, returns a `ProvisioningResult` containing the connection details
 * and a **one-time password** that cannot be retrieved again.
 *
 * On failure:
 * - 409 Conflict: User has reached the maximum number of databases
 * - 422 Unprocessable Entity: Invalid engine or business rule violation
 * - 429 Too Many Requests: Rate limit hit (1 per 10 minutes)
 * - 503 Service Unavailable: Database engine temporarily unavailable
 *
 * @param motor - Database engine: 'MySQL' or 'SQLServer'
 * @returns Provisioning result with credentials, or error
 *
 * @example
 * ```typescript
 * const result = await createDatabase('MySQL')
 * if (result.ok) {
 *   console.log('Database ID:', result.data.baseDeDatosId)
 *   console.log('Password (save this!):', result.data.passwordTemporal)
 * }
 * ```
 *
 * @todo backend: confirmar DTO exacto del body de provisioning — actualmente
 * enviamos `{ nombreMotor: motor }` basado en `ProvisioningRequest.cs`, pero
 * el campo exacto del motor puede cambiar.
 */
export async function createDatabase(motor: 'MySQL' | 'SQLServer') {
  return apiPost<ProvisioningResult>('/provisioning/crear', { nombreMotor: motor })
}
