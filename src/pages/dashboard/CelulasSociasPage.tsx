/**
 * @module pages/dashboard/CelulasSociasPage
 * @description Partner cell administration — `/dashboard/celulas-socias`.
 *
 * Admin-only (gated on `usuario.esAdmin`, backend enforces the real check
 * via the `Admin` JWT role regardless of what this page shows). Replaces
 * the fully manual process documented in `Aba/ALTA-CELULA-SOCIA.md`:
 *
 * - Create a cell (name + prefix) — the backend generates the API key and
 *   returns it in plaintext exactly once, mirroring `passwordTemporal` when
 *   provisioning a database.
 * - List all cells with their status.
 * - Activate/deactivate a cell (soft toggle, never deletes the row).
 * - Rotate a cell's API key (e.g. after it leaked) — same one-time reveal.
 *
 * @see api/celulasSocias.ts — listarCelulasSocias, altaCelulaSocia, cambiarEstadoCelulaSocia, rotarApiKeyCelulaSocia
 * @see api/types.ts — CelulaSocia, CelulaSociaCreada
 * @see ds/Modal.tsx — One-time API key reveal
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  listarCelulasSocias, altaCelulaSocia, cambiarEstadoCelulaSocia, rotarApiKeyCelulaSocia,
} from '../../api/celulasSocias'
import type { CelulaSocia, CelulaSociaCreada } from '../../api/types'
import { Button } from '../../ds/Button'
import { Badge } from '../../ds/Badge'
import { Modal } from '../../ds/Modal'
import { SkeletonCard } from '../../ds/Skeleton'
import {
  ArrowLeft, Building2, Plus, Check, Copy, ShieldOff, ShieldCheck, KeyRound,
} from 'lucide-react'

const PREFIJO_REGEX = /^[a-z0-9_]{2,20}$/

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function CelulasSociasPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [celulas, setCelulas] = useState<CelulaSocia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [nombreCelula, setNombreCelula] = useState('')
  const [prefijo, setPrefijo] = useState('')
  const [creating, setCreating] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  const [keyReveal, setKeyReveal] = useState<CelulaSociaCreada | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await listarCelulasSocias()
    if (result.ok) {
      setCelulas(result.data)
    } else {
      setError(result.error.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (user?.esAdmin) load()
  }, [user?.esAdmin, load])

  const handleCreate = async () => {
    setFieldError(null)
    setError(null)

    const nombre = nombreCelula.trim().toLowerCase().replace(/\s+/g, '_')
    const pfx = prefijo.trim().toLowerCase()
    if (!nombre) {
      setFieldError('El nombre de la célula es obligatorio.')
      return
    }
    if (!PREFIJO_REGEX.test(pfx)) {
      setFieldError('Prefijo inválido: solo minúsculas, dígitos y guion bajo, entre 2 y 20 caracteres.')
      return
    }

    setCreating(true)
    const result = await altaCelulaSocia({ nombreCelula: nombre, prefijo: pfx })
    setCreating(false)
    if (result.ok) {
      setNombreCelula('')
      setPrefijo('')
      setKeyReveal(result.data)
      load()
    } else {
      setError(result.error.error)
    }
  }

  const handleToggleEstado = async (celula: CelulaSocia) => {
    setBusyId(celula.id)
    setError(null)
    const result = await cambiarEstadoCelulaSocia(celula.id, !celula.activo)
    setBusyId(null)
    setConfirmId(null)
    if (result.ok) {
      load()
    } else {
      setError(result.error.error)
    }
  }

  const handleRotate = async (celula: CelulaSocia) => {
    setBusyId(celula.id)
    setError(null)
    const result = await rotarApiKeyCelulaSocia(celula.id)
    setBusyId(null)
    setConfirmId(null)
    if (result.ok) {
      setKeyReveal(result.data)
    } else {
      setError(result.error.error)
    }
  }

  const copyKey = async () => {
    if (!keyReveal) return
    await navigator.clipboard.writeText(keyReveal.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputClass = 'h-9 px-3 rounded-[10px] border border-[#2B2D31] bg-[#111217] text-[13px] text-[#F5F5F5] placeholder-[#52525B] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 outline-none transition-all'

  if (user && !user.esAdmin) {
    return (
      <div className="p-6 lg:p-8 max-w-[600px] mx-auto text-center space-y-3">
        <ShieldOff size={24} className="text-[#71717A] mx-auto" />
        <p className="text-[14px] text-[#A1A1AA]">Esta sección es solo para administradores.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard')}>Volver al dashboard</Button>
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
          <Building2 size={18} className="text-[#3B82F6]" />
        </div>
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">Células socias</h1>
          <p className="text-[13px] text-[#71717A]">Alta y gestión de equipos que consumen /partners/databases con su propia API key.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      {/* Create form */}
      <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={14} className="text-[#3B82F6]" />
          <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Nueva célula</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3">
          <div>
            <label className="block text-[11px] text-[#52525B] uppercase tracking-wider mb-1.5">Nombre</label>
            <input
              type="text"
              value={nombreCelula}
              onChange={e => setNombreCelula(e.target.value)}
              placeholder="Beta Devs"
              className={`${inputClass} w-full`}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#52525B] uppercase tracking-wider mb-1.5">Prefijo</label>
            <input
              type="text"
              value={prefijo}
              onChange={e => setPrefijo(e.target.value)}
              placeholder="beta"
              className={`${inputClass} w-full font-mono`}
            />
          </div>
          <div className="flex items-end">
            <Button variant="primary" size="md" loading={creating} onClick={handleCreate}>
              Crear
            </Button>
          </div>
        </div>
        {fieldError && <p className="mt-3 text-[12px] text-[#F87171]">{fieldError}</p>}
        <p className="mt-3 text-[11px] text-[#71717A]">
          El prefijo fuerza el aislamiento de nombres de bases/usuarios entre células — no se puede cambiar después. Solo minúsculas, dígitos y guion bajo.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="max-w-xl"><SkeletonCard /></div>
      ) : (
        <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2B2D31]">
            <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Todas las células</h3>
            <p className="text-[11px] text-[#71717A] mt-0.5">{celulas.length} total</p>
          </div>
          {celulas.length === 0 ? (
            <div className="p-10 text-center">
              <Building2 size={20} className="text-[#52525B] mx-auto mb-2" />
              <p className="text-[13px] text-[#71717A]">Todavía no hay células socias dadas de alta.</p>
            </div>
          ) : (
            celulas.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-4 p-4 border-b border-[#2B2D31] last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <p className="text-[14px] font-semibold text-[#F5F5F5]">{c.nombreCelula}</p>
                    <Badge variant="info" size="xs" className="font-mono">{c.prefijo}</Badge>
                    <Badge variant={c.activo ? 'success' : 'danger'} size="xs" dot>
                      {c.activo ? 'ACTIVA' : 'DESACTIVADA'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#52525B] mt-0.5">Alta: {formatDate(c.fechaCreacion)}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {confirmId === `estado-${c.id}` ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#F87171]">
                        {c.activo ? '¿Desactivar?' : '¿Reactivar?'}
                      </span>
                      <Button variant="danger" size="xs" loading={busyId === c.id} onClick={() => handleToggleEstado(c)}>Sí</Button>
                      <Button variant="secondary" size="xs" onClick={() => setConfirmId(null)} disabled={busyId === c.id}>No</Button>
                    </div>
                  ) : confirmId === `rotar-${c.id}` ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#F87171]">¿Rotar key? La vieja deja de servir al toque.</span>
                      <Button variant="danger" size="xs" loading={busyId === c.id} onClick={() => handleRotate(c)}>Sí</Button>
                      <Button variant="secondary" size="xs" onClick={() => setConfirmId(null)} disabled={busyId === c.id}>No</Button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmId(`rotar-${c.id}`)}
                        className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#71717A] hover:text-[#3B82F6] hover:bg-[#1E2D4A] transition-all cursor-pointer"
                        title="Rotar API key"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmId(`estado-${c.id}`)}
                        className={`w-7 h-7 rounded-[6px] flex items-center justify-center transition-all cursor-pointer ${
                          c.activo
                            ? 'text-[#71717A] hover:text-[#EF4444] hover:bg-[#2A1010]'
                            : 'text-[#71717A] hover:text-[#22C55E] hover:bg-[#14291E]'
                        }`}
                        title={c.activo ? 'Desactivar célula' : 'Reactivar célula'}
                      >
                        {c.activo ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* One-time API key reveal */}
      <Modal
        open={keyReveal !== null}
        onClose={() => setKeyReveal(null)}
        title={keyReveal ? `API key — ${keyReveal.nombreCelula}` : ''}
      >
        {keyReveal && (
          <div className="space-y-4">
            <div className="rounded-[10px] bg-[#14291E] border border-[#14522D] p-3 flex items-center gap-2">
              <Check size={14} className="text-[#22C55E] shrink-0" />
              <span className="text-[13px] text-[#4ADE80]">
                Copiá esta key ahora — no se va a volver a mostrar. Entregala a la célula por un canal cifrado, nunca por acá.
              </span>
            </div>

            <div className="rounded-[10px] border border-[#2B2D31] bg-[#09090B] p-4 font-mono text-[13px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#52525B] uppercase tracking-wider">API key</span>
                <button
                  onClick={copyKey}
                  className="flex items-center gap-1 text-[11px] text-[#3B82F6] hover:text-[#60A5FA] transition-colors cursor-pointer"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-[#A1A1AA] break-all">{keyReveal.apiKey}</p>
            </div>

            <Button variant="primary" fullWidth onClick={() => setKeyReveal(null)}>
              Ya la copié
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
