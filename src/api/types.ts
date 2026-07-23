/**
 * @module api/types
 * @description TypeScript interfaces that mirror the backend DTOs (Data Transfer Objects).
 *
 * These types are 1:1 representations of the C# records defined in the ABA backend
 * (see `ABA-backend/Contracts/`). Field names use camelCase (JSON serialization convention)
 * while the backend uses PascalCase — the backend's System.Text.Json configuration
 * handles the conversion automatically.
 *
 * @see https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json
 */

// ─── Error Handling ────────────────────────────────────────────────────────

/**
 * Standard error response from the backend.
 *
 * Every error returned by the API follows this shape — never HTML, never stack traces.
 * The `traceId` is a correlation ID for debugging; report it to the backend team
 * when diagnosing 500-level errors.
 *
 * @example
 * ```json
 * { "error": "Ha ocurrido un error interno.", "traceId": "00-abc123..." }
 * ```
 */
export interface ApiError {
  /** Human-readable error message (never exposes internal details). */
  error: string
  /** Correlation ID for backend debugging. Omitted on some errors. */
  traceId?: string
}

/**
 * Discriminated union for API call results.
 *
 * Instead of throwing on errors, every API function returns `ApiResult<T>` so the
 * caller can handle success and failure without try/catch. Check `result.ok` to
 * narrow the type.
 *
 * @typeParam T - The expected success data type
 *
 * @example
 * ```typescript
 * const result = await listDatabases()
 * if (result.ok) {
 *   // result.data is DashboardItem[]
 * } else {
 *   // result.error is ApiError, result.status is the HTTP status code
 * }
 * ```
 */
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError; status: number }

// ─── Dashboard / Database Types ────────────────────────────────────────────

/**
 * A single database item as returned by `GET /dashboard/bases`.
 *
 * Mirrors `DashboardItemDto.cs` from the backend. Contains connection info,
 * status, and storage metrics — but NOT the password (that's in `Credencial`).
 *
 * @see ABA-backend/Contracts/DashboardItemDto.cs
 */
export interface DashboardItem {
  /** Unique database ID (assigned by the backend SP). */
  id: number
  /** Database name (user-facing identifier). */
  nombreBD: string
  /** Database username for connections. */
  usuarioBD: string
  /** Hostname or IP of the database server. */
  host: string
  /** Port number for the database connection. */
  puerto: number
  /** Database engine: 'MySQL' or 'SQLServer'. */
  motor: string
  /** Current status: 'ACTIVA', 'PAUSADA', 'PENDIENTE', 'ELIMINADA', etc. */
  estado: string
  /** ISO timestamp of when the database was created. */
  fechaCreacion: string
  /** ISO timestamp of last activity, or null if never used. */
  ultimaActividad: string | null
  /** Maximum allowed storage in MB (quota). */
  espacioMaximoMB: number
  /** Current storage usage in MB. */
  espacioUtilizadoMB: number
}

/**
 * Full credential details for a database, including the password.
 *
 * Mirrors `CredencialDto.cs`. This endpoint is rate-limited to 5 requests/hour
 * per user to prevent credential enumeration attacks.
 *
 * @warning The password is sensitive — never log it, never store it in localStorage,
 * never display it without explicit user action (click-to-reveal).
 *
 * @see ABA-backend/Contracts/CredencialDto.cs
 */
export interface Credencial {
  /** Unique database ID. */
  id: number
  /** Database name. */
  nombreBD: string
  /** Database username. */
  usuarioBD: string
  /** Database password (AES-256 encrypted at rest, decrypted only for this response). */
  password: string
  /** Database server hostname. */
  host: string
  /** Database server port. */
  puerto: number
  /** Database engine type. */
  motor: string
  /** Current database status. */
  estado: string
  /** Creation timestamp (ISO format). */
  fechaCreacion: string
  /** Last activity timestamp, or null. */
  ultimaActividad: string | null
  /** Maximum storage quota in MB. */
  espacioMaximoMB: number
  /** Current storage usage in MB. */
  espacioUtilizadoMB: number
}

// ─── Provisioning Types ────────────────────────────────────────────────────

/**
 * Result of a successful database provisioning operation.
 *
 * Mirrors `ProvisioningResultDto.cs`. The `passwordTemporal` field is returned
 * ONLY once in this response — it's never stored in plaintext and can't be
 * retrieved again (security control 2.1 in the backend).
 *
 * @see ABA-backend/Contracts/ProvisioningResultDto.cs
 */
export interface ProvisioningResult {
  /** ID of the newly created database. */
  baseDeDatosId: number
  /** Name of the new database. */
  nombreBD: string
  /** Auto-generated database username. */
  usuarioBD: string
  /** Database server hostname. */
  host: string
  /** Database server port. */
  puerto: number
  /** Database engine ('MySQL' or 'SQLServer'). */
  motor: string
  /**
   * One-time password for the new database.
   * @warning This value is shown exactly once and cannot be recovered.
   */
  passwordTemporal: string
}

// ─── Public Metrics Types ──────────────────────────────────────────────────

/**
 * Public platform statistics for the landing page.
 *
 * Mirrors `MetricasPublicasDto.cs`. Only aggregated numbers are returned —
 * never personally identifiable information (security control 4.1).
 *
 * @see ABA-backend/Contracts/MetricasPublicasDto.cs
 */
export interface MetricasPublicas {
  /** Total registered users. */
  totalUsuarios: number
  /** Total databases ever created. */
  totalBasesCreadas: number
  /** Currently active databases. */
  basesActivas: number
  /** Total login count across all users. */
  totalLogins: number
  /** Users who logged in within the last 30 days. */
  usuariosActivos30Dias: number
  /** Platform availability percentage (e.g. 99.9). */
  disponibilidadPorcentaje: number
}

// ─── User Types ────────────────────────────────────────────────────────────

/**
 * Minimal user profile data.
 *
 * Mirrors `UsuarioDto.cs`. This is the ONLY user data exposed to the frontend —
 * no JWT tokens, no passwords, no internal IDs. The backend never trusts
 * `usuarioId` from the client; it always extracts it from the JWT claim.
 *
 * @see ABA-backend/Contracts/UsuarioDto.cs
 */
export interface Usuario {
  /** Unique user ID (from SQL Server). */
  usuarioId: number
  /** Display name (from OAuth provider). */
  nombre: string
  /** Email address. */
  correo: string
  /** Profile picture URL, or null. */
  avatarUrl: string | null
  /** OAuth provider: 'GOOGLE' or 'GITHUB'. */
  proveedor: string
  /** Account creation timestamp (ISO format). */
  fechaCreacion: string
  /** Last login timestamp, or null. */
  ultimoLogin: string | null
}
