/**
 * @module pages/dashboard/DatabaseDetailPage
 * @description Single database detail view — `/dashboard/databases/:id`.
 *
 * Split-view layout:
 * - **Left column** (1/3): Connection info, storage ring chart, activity dates
 * - **Right column** (2/3): Credentials panel, full database details table
 *
 * Credentials are hidden by default and loaded on-demand via a "Reveal
 * credentials" button. This respects the backend rate limit of 5
 * credential views per hour. The password is shown/hidden with a toggle.
 *
 * A one-click "Copy connection string" button constructs the full URI
 * (`mysql://` or `sqlserver://`) and copies it to the clipboard.
 *
 * Uses the `InfoRow` sub-component for all key-value rows with optional
 * copy-to-clipboard functionality.
 *
 * @see api/dashboard.ts — getDatabase, getCredential
 * @see api/types.ts — DashboardItem, Credencial
 * @see ds/Skeleton.tsx — Loading skeleton
 * @see ds/Badge.tsx — StatusDot, Badge
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getDatabase, getCredential, rotateCredential, deleteDatabase } from '../../api/dashboard'
import type { DashboardItem, Credencial } from '../../api/types'
import { Skeleton, SkeletonText } from '../../ds/Skeleton'
import { Badge, StatusDot } from '../../ds/Badge'
import { Button } from '../../ds/Button'
import { MascotHelpButton } from '../../components/MascotGuide'
import {
  Database, ArrowLeft, Copy, Check, Eye, EyeOff, HardDrive,
  Activity, Clock, Server, User, Shield, Trash2,
} from 'lucide-react'

const DATABASE_DETAIL_TOUR = [
  {
    title: 'El anillo de almacenamiento',
    body: 'Muestra cuánto espacio usás contra tu cuota máxima. Abajo, la columna de "Actividad" te dice cuándo se creó y cuándo se usó por última vez.',
  },
  {
    title: 'Ver credenciales',
    body: 'La contraseña no se muestra sola por seguridad — hacé clic en "Ver credenciales" para consultarla (hasta 5 veces por hora). El "connection string" de ahí es para pegar en tu código; para clientes gráficos como DBeaver usá los campos individuales.',
  },
  {
    title: 'Eliminar base de datos',
    body: 'Es una acción irreversible — perdés el acceso y todo lo que tenga guardado. Pedimos confirmación antes de ejecutarla, por las dudas.',
  },
]

/** Traduce el estado técnico a algo legible sin saber qué significa cada valor crudo. */
const ESTADO_LABEL: Record<string, string> = {
  ACTIVA: 'Activa',
  PAUSADA: 'Pausada por inactividad',
  PENDIENTE: 'Creando…',
  ELIMINADA: 'Eliminada',
  ERROR_APROVISIONAMIENTO: 'No se pudo crear',
  CUOTA_EXCEDIDA: 'Espacio lleno',
}

/**
 * Reusable key-value row with optional monospace font and copy button.
 * Shows a brief checkmark animation on successful copy.
 */
function InfoRow({ label, value, mono = false, copyable = false }: {
  label: string; value: string; mono?: boolean; copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#2B2D31] last:border-0">
      <span className="text-[12px] text-[#52525B] uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-[13px] text-[#A1A1AA] ${mono ? 'font-mono' : ''}`}>{value}</span>
        {copyable && (
          <button
            onClick={handleCopy}
            className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#18181B] transition-all cursor-pointer"
          >
            {copied ? <Check size={12} className="text-[#22C55E]" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}

export default function DatabaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [db, setDb] = useState<DashboardItem | null>(null)
  const [cred, setCred] = useState<Credencial | null>(null)
  const [loading, setLoading] = useState(true)
  const [credLoading, setCredLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedConn, setCopiedConn] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await getDatabase(Number(id))
      if (cancelled) return
      if (result.ok) {
        setDb(result.data)
      } else {
        setError(result.error.error)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id])

  const loadCredential = useCallback(async () => {
    if (!id || credLoading) return
    setCredLoading(true)
    const result = await getCredential(Number(id))
    if (result.ok) {
      setCred(result.data)
    } else {
      setError(result.error.error)
    }
    setCredLoading(false)
  }, [id, credLoading])

  const buildConnectionString = useCallback((c: Credencial) => {
    // Formato ADO.NET "Server=...;" en vez de un URI tipo mysql:// — es el que
    // entienden directo SSMS/Azure Data Studio/Microsoft.Data.SqlClient para
    // SQL Server (sqlserver:// no es un formato real que esas herramientas
    // parseen) y el que usa MySqlConnector/.NET para MySQL. TrustServerCertificate
    // es necesario en SQL Server porque el motor usa un certificado autofirmado.
    if (c.motor === 'MySQL')
      return `Server=${c.host};Port=${c.puerto};Database=${c.nombreBD};Uid=${c.usuarioBD};Pwd=${c.password};`
    if (c.motor === 'MongoDB')
      return `mongodb://${c.usuarioBD}:${c.password}@${c.host}:${c.puerto}/${c.nombreBD}`
    return `Server=${c.host},${c.puerto};Database=${c.nombreBD};User Id=${c.usuarioBD};Password=${c.password};TrustServerCertificate=True;Encrypt=True;`
  }, [])

  const [rotating, setRotating] = useState(false)
  const handleRotateCredential = useCallback(async () => {
    if (!id || rotating) return
    if (!window.confirm('Esto invalida la contraseña actual y genera una nueva. ¿Continuar?')) return
    setRotating(true)
    const result = await rotateCredential(Number(id))
    if (result.ok) {
      setCred(c => c ? { ...c, usuarioBD: result.data.usuario, password: result.data.password } : c)
      setShowPassword(true)
    } else {
      setError(result.error.error)
    }
    setRotating(false)
  }, [id, rotating])

  const copyConnectionString = useCallback(() => {
    if (!cred) return
    navigator.clipboard.writeText(buildConnectionString(cred))
    setCopiedConn(true)
    setTimeout(() => setCopiedConn(false), 2000)
  }, [cred, buildConnectionString])

  const handleDelete = useCallback(async () => {
    if (!id || deleting) return
    setDeleting(true)
    const result = await deleteDatabase(Number(id))
    if (result.ok) {
      navigate('/dashboard', { replace: true })
    } else {
      setError(result.error.error)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [id, deleting, navigate])

  if (loading) {
    return (
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <Skeleton height="24px" width="200px" className="mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-6">
            <SkeletonText lines={6} />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-6">
              <SkeletonText lines={4} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !db) {
    return (
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={14} />
          Back
        </button>
        <div className="rounded-[14px] border border-[#7F1D1D] bg-[#2A1010] p-5">
          <p className="text-[14px] text-[#F87171]">{error || 'Database not found.'}</p>
        </div>
      </div>
    )
  }

  const storagePercent = Math.min((db.espacioUtilizadoMB / db.espacioMaximoMB) * 100, 100)

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver a bases de datos
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
          <Database size={18} className="text-[#3B82F6]" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-[#F5F5F5] tracking-tight">{db.nombreBD}</h1>
            <div className="flex items-center gap-1.5">
              <StatusDot
                variant={db.estado === 'ACTIVA' ? 'success' : db.estado === 'PAUSADA' ? 'warning' : 'danger'}
                pulse={db.estado === 'ACTIVA'}
              />
              <span className="text-[12px] text-[#71717A]">{ESTADO_LABEL[db.estado] ?? db.estado}</span>
            </div>
          </div>
          <p className="text-[13px] text-[#71717A] font-mono">{db.host}:{db.puerto}</p>
        </div>
        <Badge variant={db.motor === 'MySQL' ? 'info' : 'primary'} size="md">{db.motor}</Badge>
      </div>

      {/* Split view: Info left, Connection right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Server size={14} className="text-[#3B82F6]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Conexión</h3>
            </div>
            <InfoRow label="Servidor" value={db.host} mono copyable />
            <InfoRow label="Puerto" value={String(db.puerto)} mono copyable />
            <InfoRow label="Motor" value={db.motor} />
            <InfoRow label="Usuario" value={db.usuarioBD} mono copyable />
          </div>

          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive size={14} className="text-[#A855F7]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Almacenamiento</h3>
            </div>
            {/* Storage ring */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1F2024" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={storagePercent > 80 ? '#EF4444' : '#3B82F6'}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${storagePercent * 2.51} ${251 - storagePercent * 2.51}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[18px] font-semibold text-[#F5F5F5]">{db.espacioUtilizadoMB}</span>
                  <span className="text-[10px] text-[#71717A]">/ {db.espacioMaximoMB} MB</span>
                </div>
              </div>
            </div>
            <div className="text-center">
              <span className="text-[12px] text-[#71717A]">{storagePercent.toFixed(1)}% usado</span>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#22C55E]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Actividad</h3>
            </div>
              <InfoRow label="Creada" value={new Date(db.fechaCreacion).toLocaleDateString()} />
            <InfoRow
              label="Último uso"
                value={db.ultimaActividad ? new Date(db.ultimaActividad).toLocaleDateString() : 'Todavía no se usó'}
            />
          </div>
        </div>

        {/* Right: Connection + Creds */}
        <div className="lg:col-span-2 space-y-4">
          {/* Connection string */}
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#EAB308]" />
                <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Credenciales</h3>
              </div>
              {!cred && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={credLoading}
                  onClick={loadCredential}
                >
                  Ver credenciales
                </Button>
              )}
            </div>

            {cred ? (
              <div className="space-y-3">
                <div className="rounded-[10px] border border-[#2B2D31] bg-[#09090B] p-4 font-mono text-[13px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#52525B] uppercase tracking-wider">Connection string</span>
                    <button
                      onClick={copyConnectionString}
                      className="flex items-center gap-1 text-[11px] text-[#3B82F6] hover:text-[#60A5FA] transition-colors cursor-pointer"
                    >
                      {copiedConn ? <Check size={11} /> : <Copy size={11} />}
                      {copiedConn ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <p className="text-[#A1A1AA] break-all">
                    {buildConnectionString({ ...cred, password: '•'.repeat(8) })}
                  </p>
                  <p className="text-[11px] text-[#52525B] mt-2 font-sans normal-case">
                    Para tu código (.env / appsettings). En clientes gráficos como DBeaver usá la
                    pestaña <strong className="text-[#71717A]">Host</strong> (no "URL") con los
                    campos individuales de arriba — el formato de URL de conexión varía por
                    herramienta y no hay un único string que sirva para todas.
                  </p>
                </div>

                <div className="rounded-[10px] border border-[#2B2D31] bg-[#09090B] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#52525B] uppercase tracking-wider font-mono">Contraseña</span>
                    <button
                      onClick={() => setShowPassword(s => !s)}
                      className="flex items-center gap-1 text-[11px] text-[#71717A] hover:text-[#A1A1AA] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <p className="font-mono text-[13px] text-[#A1A1AA]">
                    {showPassword ? cred.password : '\u2022'.repeat(16)}
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#2A2008] border border-[#422006]">
                  <Clock size={12} className="text-[#EAB308] shrink-0" />
                  <span className="text-[11px] text-[#FCD34D]">
                       Límite: 5 consultas de credenciales por hora
                  </span>
                </div>

                {db.motor === 'MongoDB' && (
                  <Button variant="secondary" size="sm" loading={rotating} onClick={handleRotateCredential}>
                    Rotar contraseña
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#2B2D31] bg-[#09090B] p-8 text-center">
                <User size={20} className="text-[#52525B] mx-auto mb-2" />
                <p className="text-[13px] text-[#71717A]">
                  Haz clic en &quot;Ver credenciales&quot; para consultar los datos de conexión
                </p>
                <p className="text-[11px] text-[#52525B] mt-1">Limitado a 5 consultas por hora</p>
              </div>
            )}
          </div>

          {/* Database info table */}
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={14} className="text-[#3B82F6]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Detalles de la base</h3>
            </div>
            <InfoRow label="Nombre" value={db.nombreBD} mono copyable />
            <InfoRow label="Usuario" value={db.usuarioBD} mono copyable />
            <InfoRow label="Motor" value={db.motor} />
            <InfoRow label="Estado" value={ESTADO_LABEL[db.estado] ?? db.estado} />
            <InfoRow label="Espacio máximo" value={`${db.espacioMaximoMB} MB`} />
            <InfoRow label="Espacio usado" value={`${db.espacioUtilizadoMB} MB`} />
            <InfoRow label="Creada" value={new Date(db.fechaCreacion).toLocaleString()} />
            <InfoRow
              label="Última actividad"
              value={db.ultimaActividad ? new Date(db.ultimaActividad).toLocaleString() : 'Todavía no se usó'}
            />
          </div>

          {/* Danger zone: Delete */}
          <div className="rounded-[14px] border border-[#7F1D1D]/40 bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 size={14} className="text-[#EF4444]" />
              <h3 className="text-[14px] font-semibold text-[#F87171]">Eliminar esta base de datos</h3>
            </div>
            <p className="text-[13px] text-[#71717A] mb-4">
              Vas a perder el acceso a esta base y a todo lo que tenga guardado. No se puede deshacer.
            </p>
            {!showDeleteConfirm ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Eliminar base de datos
              </Button>
            ) : (
              <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
                <p className="text-[13px] text-[#F87171] mb-3">
                  ¿Seguro que quieres eliminarla? Esta acción no se puede deshacer.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    loading={deleting}
                    onClick={handleDelete}
                  >
                    Sí, eliminar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <MascotHelpButton tourId="database-detail" steps={DATABASE_DETAIL_TOUR} />
    </div>
  )
}
