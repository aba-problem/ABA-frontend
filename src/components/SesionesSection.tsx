/**
 * @module components/SesionesSection
 * @description Session/access history, redesigned for non-technical users —
 * lives inside SettingsModal (and the `/dashboard/sesiones` direct-link page).
 *
 * Backend update 2026-08-11 (`sql/019_sesiones_avanzado.sql`):
 * - `GET /sesiones` is now truly paginated server-side (`sp_ListarSesionesUsuario`
 *   takes `@Pagina`/`@TamanoPagina`, no longer a hardcoded TOP 50).
 * - City (when the geo-IP provider resolves it) and browser User-Agent are now
 *   captured into `Auditoria.Detalle` going forward — shown when present,
 *   silently omitted for older events that predate this (never fabricated).
 * - `POST /sesiones/ips/revocar` — real backend for "No fui yo, bloquear":
 *   deactivates that IP in the user's own whitelist (UsuarioIp) and
 *   re-syncs the MySQL mirror immediately.
 *
 * Fetches pages of 100 (the backend's max page size) so the day-grouping +
 * tab filters below apply within a page that comfortably covers the
 * common case; `Pagination` only becomes visible once a user has genuinely
 * crossed 100 events.
 *
 * @see api/sesiones.ts — listarSesiones, revocarIp
 * @see Controllers/SesionesController.cs — backend
 */

import { useEffect, useMemo, useState } from 'react'
import { listarSesiones, revocarIp } from '../api/sesiones'
import type { SesionRegistro } from '../api/types'
import type { BadgeVariant } from '../ds/Badge'
import { SkeletonCard } from '../ds/Skeleton'
import { Button } from '../ds/Button'
import { Pagination } from '../ds/Pagination'
import {
  History, LogIn, UserPlus, ShieldCheck, ShieldAlert, ShieldX, CheckCircle2, AlertTriangle, MapPin, Monitor,
} from 'lucide-react'

const ACCION_INFO: Record<string, { label: string; variant: BadgeVariant; icon: typeof LogIn }> = {
  LOGIN: { label: 'Iniciaste sesión', variant: 'success', icon: LogIn },
  REGISTRO: { label: 'Creaste tu cuenta', variant: 'info', icon: UserPlus },
  IP_VALIDADA: { label: 'Dispositivo autorizado para conectar a tus bases', variant: 'success', icon: ShieldCheck },
  IP_RECHAZADA: { label: 'Intento de conexión bloqueado', variant: 'danger', icon: ShieldAlert },
  IP_REVOCADA: { label: 'Bloqueaste este dispositivo', variant: 'default', icon: ShieldX },
}

type TabId = 'todos' | 'accesos' | 'alertas'
const TABS: { id: TabId; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'accesos', label: 'Inicios de sesión' },
  { id: 'alertas', label: 'Alertas' },
]

/** Extrae `ciudad`/`userAgent`/`ipRevocada` del JSON de Detalle — nunca inventa un valor si falta. */
function parseDetalle(detalle: string | null): { ciudad?: string; userAgent?: string; ipRevocada?: string } {
  if (!detalle) return {}
  try {
    const d = JSON.parse(detalle)
    return { ciudad: d.ciudad ?? undefined, userAgent: d.userAgent ?? undefined, ipRevocada: d.ipRevocada ?? undefined }
  } catch {
    return {}
  }
}

/** Resumen corto y legible del User-Agent — no es un parser completo, solo lo esencial. */
function resumirNavegador(ua: string): string {
  const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : null
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : null
  if (nav && os) return `${nav} en ${os}`
  return nav ?? os ?? ''
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  if (sameDay(d, today)) return 'Hoy'
  if (sameDay(d, yesterday)) return 'Ayer'
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

const PAGE_SIZE = 100

export function SesionesSection() {
  const [sesiones, setSesiones] = useState<SesionRegistro[]>([])
  const [totalServidor, setTotalServidor] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('todos')
  const [revocando, setRevocando] = useState<string | null>(null)
  const [confirmarIp, setConfirmarIp] = useState<string | null>(null)

  const load = async (p: number) => {
    setLoading(true)
    const result = await listarSesiones(p, PAGE_SIZE)
    if (result.ok) {
      setSesiones(result.data.registros)
      setTotalServidor(result.data.total)
      setError(null)
    } else {
      setError(result.error.error)
    }
    setLoading(false)
  }

  useEffect(() => { load(pagina) }, [pagina])

  const handleRevocar = async (ip: string) => {
    setRevocando(ip)
    const result = await revocarIp(ip)
    setRevocando(null)
    setConfirmarIp(null)
    if (result.ok) {
      load(pagina)
    } else {
      setError(result.error.error)
    }
  }

  const alertCount = useMemo(() => sesiones.filter(s => s.accion === 'IP_RECHAZADA').length, [sesiones])

  const filtered = useMemo(() => {
    if (tab === 'accesos') return sesiones.filter(s => s.accion === 'LOGIN' || s.accion === 'REGISTRO')
    if (tab === 'alertas') return sesiones.filter(s => s.accion === 'IP_RECHAZADA')
    return sesiones
  }, [sesiones, tab])

  const groups = useMemo(() => {
    const map = new Map<string, SesionRegistro[]>()
    for (const s of filtered) {
      const label = dayLabel(s.fechaEvento)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(s)
    }
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--aba-text)] flex items-center gap-2">
          <History size={16} className="text-[var(--aba-accent-text)]" />
          Registros de sesión
        </h2>
        <p className="text-[12px] text-[var(--aba-text-muted)] mt-0.5">Revisa la actividad de acceso a tu cuenta.</p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      {loading ? (
        <SkeletonCard />
      ) : (
        <>
          {sesiones.length > 0 && (
            alertCount > 0 ? (
              <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-3.5 flex items-start gap-2.5">
                <AlertTriangle size={16} className="text-[#F87171] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-[#F87171]">
                    {alertCount} intento{alertCount === 1 ? '' : 's'} de conexión bloqueado{alertCount === 1 ? '' : 's'}
                  </p>
                  <p className="text-[12px] text-[#71717A] mt-0.5">
                    Alguien intentó conectarse a una de tus bases desde una ubicación no autorizada y el sistema lo bloqueó. Revisa la pestaña "Alertas".
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-[10px] border border-[#14522D] bg-[#14291E] p-3.5 flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-[#4ADE80] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-medium text-[#4ADE80]">Sin intentos bloqueados</p>
                  <p className="text-[12px] text-[#71717A] mt-0.5">No encontramos conexiones rechazadas en tu actividad reciente.</p>
                </div>
              </div>
            )
          )}

          <div className="flex items-center gap-1 border-b border-[var(--aba-border)]">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 h-9 text-[13px] font-medium border-b-2 -mb-px transition-all cursor-pointer ${
                  tab === t.id
                    ? 'text-[var(--aba-text)] border-[var(--aba-accent)]'
                    : 'text-[var(--aba-text-muted)] border-transparent hover:text-[var(--aba-text-secondary)]'
                }`}
              >
                {t.label}{t.id === 'alertas' && alertCount > 0 ? ` (${alertCount})` : ''}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <History size={20} className="text-[var(--aba-text-disabled)] mx-auto mb-2" />
              <p className="text-[13px] text-[var(--aba-text-muted)]">
                {tab === 'alertas' ? 'No hay alertas — buena señal.' : 'Todavía no hay eventos registrados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(([label, items]) => (
                <div key={label}>
                  <p className="text-[11px] font-semibold text-[var(--aba-text-disabled)] uppercase tracking-wider mb-1.5">{label}</p>
                  <div className="rounded-[12px] border border-[var(--aba-border)] bg-[var(--aba-card)] overflow-hidden">
                    {items.map(s => {
                      const info = ACCION_INFO[s.accion] ?? { label: s.accion, variant: 'default' as BadgeVariant, icon: History }
                      const Icon = info.icon
                      const { ciudad, userAgent } = parseDetalle(s.detalle)
                      const navegador = userAgent ? resumirNavegador(userAgent) : ''
                      const puedeRevocar = s.accion === 'IP_VALIDADA' && s.ipOrigen
                      const confirmando = confirmarIp === s.ipOrigen

                      return (
                        <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-[var(--aba-border-subtle)] last:border-0 hover:bg-[var(--aba-card-hover)] transition-colors">
                          <div
                            className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: info.variant === 'danger' ? '#2A1010' : info.variant === 'success' ? '#14291E' : '#1E2D4A',
                            }}
                          >
                            <Icon size={14} className={info.variant === 'danger' ? 'text-[#F87171]' : info.variant === 'success' ? 'text-[#4ADE80]' : 'text-[#60A5FA]'} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-[var(--aba-text)] truncate">{info.label}</p>
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {s.ipOrigen && <span className="text-[11px] text-[var(--aba-text-muted)] font-mono">{s.ipOrigen}</span>}
                              {ciudad && (
                                <span className="text-[11px] text-[var(--aba-text-muted)] flex items-center gap-0.5">
                                  <MapPin size={10} />{ciudad}
                                </span>
                              )}
                              {navegador && (
                                <span className="text-[11px] text-[var(--aba-text-muted)] flex items-center gap-0.5">
                                  <Monitor size={10} />{navegador}
                                </span>
                              )}
                            </div>
                          </div>

                          {puedeRevocar && (
                            confirmando ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[11px] text-[#F87171]">¿Bloquear?</span>
                                <Button variant="danger" size="xs" loading={revocando === s.ipOrigen} onClick={() => handleRevocar(s.ipOrigen!)}>Sí</Button>
                                <Button variant="secondary" size="xs" onClick={() => setConfirmarIp(null)} disabled={revocando === s.ipOrigen}>No</Button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmarIp(s.ipOrigen!)}
                                className="text-[11px] text-[var(--aba-text-muted)] hover:text-[#F87171] border border-[var(--aba-border)] hover:border-[#7F1D1D] rounded-[6px] px-2 h-6 shrink-0 transition-all cursor-pointer whitespace-nowrap"
                              >
                                No fui yo, bloquear
                              </button>
                            )
                          )}

                          <span className="text-[11px] text-[var(--aba-text-disabled)] shrink-0">{timeLabel(s.fechaEvento)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            page={pagina}
            totalPages={Math.max(1, Math.ceil(totalServidor / PAGE_SIZE))}
            onChange={setPagina}
            label={`${totalServidor} evento${totalServidor === 1 ? '' : 's'} en total`}
          />
        </>
      )}
    </div>
  )
}
