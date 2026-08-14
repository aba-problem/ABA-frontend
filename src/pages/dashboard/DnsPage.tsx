/**
 * @module pages/dashboard/DnsPage
 * @description DNS self-service — `/dashboard/dns`.
 *
 * Lets the user create, list and delete their own DNS records, plus an
 * admin section (visible only when `esAdmin`) to manage ALL records.
 *
 * - Create form: subdominio (A/CNAME), with client-side validation matching
 *   the backend regex (`^[a-z0-9-]{1,40}$`)
 * - Error handling: 409 (subdomain in use), 503 (transient provider failure)
 * - Delete with inline confirmation
 *
 * @see api/dns.ts — crearRegistroDns, listarMisRegistrosDns, eliminarRegistroDns
 * @see api/dns.ts — listarTodosRegistrosDnsAdmin, eliminarRegistroDnsAdmin
 * @see api/types.ts — DnsRegistro
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  crearRegistroDns, listarMisRegistrosDns, eliminarRegistroDns,
  listarTodosRegistrosDnsAdmin, eliminarRegistroDnsAdmin,
} from '../../api/dns'
import { getProfile } from '../../api/dashboard'
import type { DnsRegistro } from '../../api/types'
import { Button } from '../../ds/Button'
import { Badge } from '../../ds/Badge'
import { SkeletonCard } from '../../ds/Skeleton'
import { Tooltip } from '../../ds/Tooltip'
import { MascotHelpButton } from '../../components/MascotGuide'
import {
  Globe, ArrowLeft, Trash2, AlertTriangle, Plus, Shield,
} from 'lucide-react'

const DNS_TOUR = [
  {
    title: 'Tu propio subdominio',
    body: 'Elegí un nombre acá y se crea como "tu-nombre.aba.coderhivex.com". Es tuyo, no de ABA.',
    selector: '[data-tour="dns-subdominio"]',
    tipo: 'crear' as const,
  },
  {
    title: 'El campo "Valor" es TU servidor',
    body: 'No es la dirección de ABA — es la IP (tipo A) o el dominio (tipo CNAME) de donde vive lo que querés exponer.',
    selector: '[data-tour="dns-valor"]',
    tipo: 'editar' as const,
  },
  {
    title: 'Propagación y límites',
    body: 'Un registro cada 5 minutos, y tarda unos minutos en propagarse antes de que funcione.',
    tipo: 'estado' as const,
  },
  {
    title: 'Eliminar un registro',
    body: 'Podés borrarlo cuando quieras con este ícono — es inmediato.',
    selector: '[data-tour="dns-eliminar"]',
    tipo: 'eliminar' as const,
  },
]

/** Traduce el estado técnico a algo que no requiere saber qué es un "provisioning". */
const ESTADO_LABEL: Record<string, string> = {
  ACTIVO: 'Activo',
  PENDIENTE: 'Creando…',
  ELIMINADA: 'Eliminado',
}

const SUBDOMINIO_REGEX = /^[a-z0-9-]{1,40}$/

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

type TipoRegistro = 'A' | 'CNAME'

export default function DnsPage() {
  const navigate = useNavigate()
  const [records, setRecords] = useState<DnsRegistro[]>([])
  const [adminRecords, setAdminRecords] = useState<DnsRegistro[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [subdominio, setSubdominio] = useState('')
  const [tipoRegistro, setTipoRegistro] = useState<TipoRegistro>('A')
  const [valor, setValor] = useState('')
  const [creating, setCreating] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    const [profileResult, recordsResult] = await Promise.all([getProfile(), listarMisRegistrosDns()])
    if (profileResult.ok) setIsAdmin(profileResult.data.esAdmin)
    if (recordsResult.ok) {
      setRecords(recordsResult.data)
    } else {
      setError(recordsResult.error.error)
    }
    setLoading(false)
  }

  const loadAdmin = async () => {
    const result = await listarTodosRegistrosDnsAdmin()
    if (result.ok) {
      setAdminRecords(result.data)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isAdmin) loadAdmin()
  }, [isAdmin])

  const handleCreate = async () => {
    setFieldError(null)
    setError(null)

    const sub = subdominio.trim().toLowerCase()
    const val = valor.trim()
    if (!SUBDOMINIO_REGEX.test(sub)) {
      setFieldError('Subdominio inválido: solo minúsculas, dígitos y guiones, máx 40 caracteres.')
      return
    }
    if (!val) {
      setFieldError('El valor del registro es obligatorio.')
      return
    }

    setCreating(true)
    const result = await crearRegistroDns({ subdominio: sub, tipoRegistro, valor: val })
    setCreating(false)
    if (result.ok) {
      setSubdominio('')
      setValor('')
      load()
    } else {
      setError(result.error.error)
    }
  }

  const handleDelete = async (id: number, admin: boolean) => {
    setDeletingId(id)
    setError(null)
    const result = admin ? await eliminarRegistroDnsAdmin(id) : await eliminarRegistroDns(id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    if (result.ok) {
      if (admin) loadAdmin()
      else load()
    } else {
      setError(result.error.error)
    }
  }

  const inputClass = 'h-9 px-3 rounded-[10px] border border-[#2B2D31] bg-[#111217] text-[13px] text-[#F5F5F5] placeholder-[#52525B] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 outline-none transition-all'

  const renderRecord = (r: DnsRegistro, admin: boolean) => {
    const key = `${admin ? 'admin-' : 'user-'}${r.id}`
    return (
    <div key={key} className="flex items-center justify-between gap-4 p-4 border-b border-[#2B2D31] last:border-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <p className="text-[14px] font-mono font-semibold text-[#F5F5F5]">{r.subdominio}</p>
          <Badge variant={r.tipoRegistro === 'A' ? 'info' : 'primary'} size="xs">{r.tipoRegistro}</Badge>
          <Badge variant={r.estado === 'ACTIVO' ? 'success' : r.estado === 'PENDIENTE' ? 'warning' : 'danger'} size="xs" dot>
            {ESTADO_LABEL[r.estado] ?? r.estado}
          </Badge>
          {admin && r.usuarioCorreo && (
            <span className="text-[11px] text-[#71717A]">{r.usuarioCorreo}</span>
          )}
        </div>
        <p className="text-[12px] font-mono text-[#A1A1AA] truncate mt-0.5">{r.valor}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-[#52525B] hidden sm:block">{formatDate(r.fechaCreacion)}</span>
        {!confirmDeleteId || confirmDeleteId !== key ? (
          <button
            data-tour="dns-eliminar"
            onClick={() => setConfirmDeleteId(key)}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#71717A] hover:text-[#EF4444] hover:bg-[#2A1010] transition-all cursor-pointer"
            title="Eliminar registro"
          >
            <Trash2 size={13} />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#F87171]">¿Eliminar?</span>
            <Button variant="danger" size="xs" loading={deletingId === r.id} onClick={() => handleDelete(r.id, admin)}>
              Sí
            </Button>
            <Button variant="secondary" size="xs" onClick={() => setConfirmDeleteId(null)} disabled={deletingId === r.id}>
              No
            </Button>
          </div>
        )}
      </div>
    </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1100px] mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
          <Globe size={18} className="text-[#3B82F6]" />
        </div>
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">DNS Autoservicio</h1>
          <p className="text-[13px] text-[#71717A]">Gestiona subdominios para tus proyectos.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
          {error.includes('Intenta de nuevo más tarde') && (
            <p className="text-[11px] text-[#71717A] mt-1">El proveedor DNS falló temporalmente. El subdominio no quedó reservado; puedes reintentar.</p>
          )}
        </div>
      )}

      {/* Create form */}
      <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={14} className="text-[#3B82F6]" />
          <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Nuevo registro</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_1fr_auto] gap-3">
          <div data-tour="dns-subdominio">
            <label className="flex items-center gap-1 text-[11px] text-[#52525B] uppercase tracking-wider mb-1.5">
              Subdominio
              <Tooltip text="El nombre que quieres usar antes de .aba.coderhivex.com — por ejemplo 'app' crea app.aba.coderhivex.com." />
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={subdominio}
                onChange={e => setSubdominio(e.target.value)}
                placeholder="app"
                className={`${inputClass} w-full rounded-r-none font-mono`}
              />
              <span className="h-9 px-2.5 inline-flex items-center rounded-r-[10px] border border-l-0 border-[#2B2D31] bg-[#09090B] text-[11px] text-[#52525B] font-mono">
                .aba.coderhivex.com
              </span>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-1 text-[11px] text-[#52525B] uppercase tracking-wider mb-1.5">
              Tipo
              <Tooltip text="'A' apunta directo a una dirección IP. 'CNAME' apunta a otro nombre de dominio en vez de una IP. Si no estás seguro, usa 'A'." />
            </label>
            <select
              value={tipoRegistro}
              onChange={e => setTipoRegistro(e.target.value as TipoRegistro)}
              className={`${inputClass} w-full cursor-pointer`}
            >
              <option value="A">A — apunta a una IP</option>
              <option value="CNAME">CNAME — apunta a otro dominio</option>
            </select>
          </div>
          <div data-tour="dns-valor">
            <label className="flex items-center gap-1 text-[11px] text-[#52525B] uppercase tracking-wider mb-1.5">
              Valor
              <Tooltip text={tipoRegistro === 'A' ? 'La dirección IP del servidor al que quieres apuntar.' : 'El dominio al que quieres apuntar (sin http:// ni www).'} />
            </label>
            <input
              type="text"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder={tipoRegistro === 'A' ? '203.0.113.10' : 'mi-servidor.example.com'}
              className={`${inputClass} w-full font-mono`}
            />
          </div>
          <div className="flex items-end">
            <Button variant="primary" size="md" loading={creating} onClick={handleCreate}>
              Crear
            </Button>
          </div>
        </div>
        {fieldError && (
          <p className="mt-3 text-[12px] text-[#F87171]">{fieldError}</p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <AlertTriangle size={12} className="text-[#EAB308] shrink-0" />
          <span className="text-[11px] text-[#71717A]">Límite: 1 registro cada 5 minutos. Los registros tardan unos minutos en propagarse.</span>
        </div>
      </div>

      {/* My records */}
      {loading ? (
        <div className="max-w-xl"><SkeletonCard /></div>
      ) : (
        <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2B2D31]">
            <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Mis registros</h3>
            <p className="text-[11px] text-[#71717A] mt-0.5">{records.length} total</p>
          </div>
          {records.length === 0 ? (
            <div className="p-10 text-center">
              <Globe size={20} className="text-[#52525B] mx-auto mb-2" />
              <p className="text-[13px] text-[#71717A]">Todavía no tienes ningún subdominio.</p>
              <p className="text-[12px] text-[#52525B] mt-1">Usa el formulario de arriba para crear el primero.</p>
            </div>
          ) : (
            records.map(r => renderRecord(r, false))
          )}
        </div>
      )}

      {/* Admin section */}
      {isAdmin && (
        <div className="rounded-[14px] border border-[#1E3A6E]/50 bg-[#18181B] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2B2D31] flex items-center gap-2">
            <Shield size={14} className="text-[#EAB308]" />
            <div>
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Todos los registros (Admin)</h3>
              <p className="text-[11px] text-[#71717A] mt-0.5">{adminRecords.length} total · incluye todos los usuarios</p>
            </div>
          </div>
          {adminRecords.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[13px] text-[#71717A]">Sin registros en la plataforma.</p>
            </div>
          ) : (
            adminRecords.map(r => renderRecord(r, true))
          )}
        </div>
      )}

      <MascotHelpButton tourId="dns" steps={DNS_TOUR} />
    </div>
  )
}
