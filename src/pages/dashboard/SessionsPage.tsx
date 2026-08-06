/**
 * @module pages/dashboard/SessionsPage
 * @description Access history — `/dashboard/sesiones`.
 *
 * Read-only list of the authenticated user's last 50 access events (logins,
 * registrations, and IP whitelist validation/rejection), sourced from the
 * backend's existing Auditoria table.
 *
 * @see api/sesiones.ts — listarSesiones
 * @see api/types.ts — SesionRegistro
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listarSesiones } from '../../api/sesiones'
import type { SesionRegistro } from '../../api/types'
import { Badge, type BadgeVariant } from '../../ds/Badge'
import { SkeletonCard } from '../../ds/Skeleton'
import { History, ArrowLeft, LogIn, UserPlus, ShieldCheck, ShieldAlert } from 'lucide-react'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const ACCION_INFO: Record<string, { label: string; variant: BadgeVariant; icon: typeof LogIn }> = {
  LOGIN: { label: 'Inicio de sesión', variant: 'success', icon: LogIn },
  REGISTRO: { label: 'Cuenta creada', variant: 'info', icon: UserPlus },
  IP_VALIDADA: { label: 'IP autorizada', variant: 'success', icon: ShieldCheck },
  IP_RECHAZADA: { label: 'IP rechazada', variant: 'danger', icon: ShieldAlert },
}

export default function SessionsPage() {
  const navigate = useNavigate()
  const [sesiones, setSesiones] = useState<SesionRegistro[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="p-6 lg:p-8 max-w-[900px] mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
          <History size={18} className="text-[#3B82F6]" />
        </div>
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">Registros de sesión</h1>
          <p className="text-[13px] text-[#71717A]">Últimos 50 eventos de acceso a tu cuenta.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="max-w-xl"><SkeletonCard /></div>
      ) : (
        <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] overflow-hidden">
          {sesiones.length === 0 ? (
            <div className="p-10 text-center">
              <History size={20} className="text-[#52525B] mx-auto mb-2" />
              <p className="text-[13px] text-[#71717A]">Todavía no hay eventos registrados.</p>
            </div>
          ) : (
            sesiones.map(s => {
              const info = ACCION_INFO[s.accion] ?? { label: s.accion, variant: 'default' as BadgeVariant, icon: History }
              const Icon = info.icon
              return (
                <div key={s.id} className="flex items-center justify-between gap-4 p-4 border-b border-[#2B2D31] last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[8px] bg-[#1F2024] flex items-center justify-center shrink-0">
                      <Icon size={14} className="text-[#71717A]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={info.variant} size="xs">{info.label}</Badge>
                        {s.ipOrigen && (
                          <span className="text-[12px] font-mono text-[#71717A]">{s.ipOrigen}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#52525B] shrink-0">{formatDate(s.fechaEvento)}</span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
