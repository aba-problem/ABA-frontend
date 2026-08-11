/**
 * @module components/SesionesSection
 * @description Session/access history, redesigned for non-technical users —
 * lives inside SettingsModal (and the `/dashboard/sesiones` direct-link page).
 *
 * Design notes (UX audit, 2026-08-11):
 * - Grouped by day ("Hoy" / "Ayer" / date) instead of one flat list — a wall
 *   of timestamped rows is hard to scan; grouping gives it a shape.
 * - Tabs (Todos / Inicios de sesión / Alertas) so a user chasing "did someone
 *   else get in?" doesn't have to read every row.
 * - Status banner at the top is DERIVED FROM REAL DATA (counts actual
 *   `IP_RECHAZADA` events already returned by the backend) — never a
 *   fabricated "everything looks fine" claim.
 * - "Cargar más registros" reveals more of the already-fetched list (backend
 *   caps at the 50 most recent events via `sp_ListarSesionesUsuario`) rather
 *   than silently re-fetching — true pagination past 50 needs a backend
 *   change (see summary given to the user), not something to fake here.
 *
 * Explicitly NOT built (would require backend data/endpoints that don't
 * exist yet — see conversation, not simulated with fake data):
 * - City/device/browser labels (e.g. "Chrome en macOS", "Bogotá, Colombia")
 *   — the backend only stores the raw IP, no User-Agent or geolocation
 *   beyond the country-level check already used for the whitelist.
 * - "Fui yo / No fui yo, bloquear" per-event action — there is no endpoint
 *   to let a user revoke/blocklist a specific IP from this view yet.
 *
 * @see api/sesiones.ts — listarSesiones
 * @see Controllers/SesionesController.cs — GET /sesiones (backend)
 */

import { useEffect, useMemo, useState } from 'react'
import { listarSesiones } from '../api/sesiones'
import type { SesionRegistro } from '../api/types'
import type { BadgeVariant } from '../ds/Badge'
import { SkeletonCard } from '../ds/Skeleton'
import { Button } from '../ds/Button'
import {
  History, LogIn, UserPlus, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle,
} from 'lucide-react'

const ACCION_INFO: Record<string, { label: string; variant: BadgeVariant; icon: typeof LogIn }> = {
  LOGIN: { label: 'Iniciaste sesión', variant: 'success', icon: LogIn },
  REGISTRO: { label: 'Creaste tu cuenta', variant: 'info', icon: UserPlus },
  IP_VALIDADA: { label: 'Dispositivo autorizado para conectar a tus bases', variant: 'success', icon: ShieldCheck },
  IP_RECHAZADA: { label: 'Intento de conexión bloqueado', variant: 'danger', icon: ShieldAlert },
}

type TabId = 'todos' | 'accesos' | 'alertas'
const TABS: { id: TabId; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'accesos', label: 'Inicios de sesión' },
  { id: 'alertas', label: 'Alertas' },
]

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

const REVEAL_STEP = 15

export function SesionesSection() {
  const [sesiones, setSesiones] = useState<SesionRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('todos')
  const [visibleCount, setVisibleCount] = useState(REVEAL_STEP)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listarSesiones()
      if (cancelled) return
      if (result.ok) {
        setSesiones(result.data)
        setError(null)
      } else {
        setError(result.error.error)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const alertCount = useMemo(() => sesiones.filter(s => s.accion === 'IP_RECHAZADA').length, [sesiones])

  const filtered = useMemo(() => {
    if (tab === 'accesos') return sesiones.filter(s => s.accion === 'LOGIN' || s.accion === 'REGISTRO')
    if (tab === 'alertas') return sesiones.filter(s => s.accion === 'IP_RECHAZADA')
    return sesiones
  }, [sesiones, tab])

  const visible = filtered.slice(0, visibleCount)

  // Agrupa por día conservando el orden (ya viene ordenado DESC del backend).
  const groups = useMemo(() => {
    const map = new Map<string, SesionRegistro[]>()
    for (const s of visible) {
      const label = dayLabel(s.fechaEvento)
      if (!map.has(label)) map.set(label, [])
      map.get(label)!.push(s)
    }
    return Array.from(map.entries())
  }, [visible])

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
          {/* Banner derivado de datos reales — nunca una afirmación inventada. */}
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

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-[var(--aba-border)]">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setVisibleCount(REVEAL_STEP) }}
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
                            {s.ipOrigen && (
                              <p className="text-[11px] text-[var(--aba-text-muted)] font-mono truncate">{s.ipOrigen}</p>
                            )}
                          </div>
                          <span className="text-[11px] text-[var(--aba-text-disabled)] shrink-0">{timeLabel(s.fechaEvento)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}

              {visibleCount < filtered.length && (
                <div className="text-center pt-1">
                  <Button variant="ghost" size="sm" onClick={() => setVisibleCount(c => c + REVEAL_STEP)}>
                    Cargar más registros
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
