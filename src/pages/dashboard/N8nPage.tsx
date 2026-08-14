/**
 * @module pages/dashboard/N8nPage
 * @description N8N workspace self-service — `/dashboard/n8n`.
 *
 * Manages the user's N8N workspace lifecycle:
 * - Empty state with "Create workspace" CTA when none exists
 * - Workspace details (name, limits, status, creation date)
 * - Create flow: one-time `passwordTemporal` modal with copy + warning
 * - Delete flow with inline confirmation
 *
 * Rate limit: 1 creation per 10 minutes (backend enforced).
 *
 * @see api/n8n.ts — crearWorkspaceN8n, obtenerMiWorkspaceN8n, eliminarWorkspaceN8n
 * @see api/types.ts — N8nWorkspace, N8nWorkspaceCreado
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  crearWorkspaceN8n, obtenerMiWorkspaceN8n, eliminarWorkspaceN8n,
} from '../../api/n8n'
import type { N8nWorkspace, N8nWorkspaceCreado } from '../../api/types'
import { Button } from '../../ds/Button'
import { Modal } from '../../ds/Modal'
import { Badge } from '../../ds/Badge'
import { SkeletonCard } from '../../ds/Skeleton'
import { MascotHelpButton } from '../../components/MascotGuide'
import {
  Workflow, ArrowLeft, Copy, Check, AlertTriangle, Trash2,
} from 'lucide-react'

const N8N_TOUR = [
  {
    title: '¿Qué es esto?',
    body: 'N8N es una herramienta de automatización — conectá servicios entre sí para que se ejecuten solos, sin que tengas que estar mirando. Acá te damos tu propio workspace.',
  },
  {
    title: 'Solo uno por usuario',
    body: 'Cada cuenta tiene un único workspace activo. El nombre y la contraseña se generan automáticamente al crearlo — no hay nada que configurar a mano.',
  },
  {
    title: 'Guardá la contraseña ya',
    body: 'A diferencia de las bases de datos, acá no hay forma de volver a consultarla después — se muestra una única vez en el modal de creación. Si la perdés, tenés que eliminar el workspace y crear uno nuevo.',
  },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function N8nPage() {
  const navigate = useNavigate()
  const [workspace, setWorkspace] = useState<N8nWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [noWorkspace, setNoWorkspace] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<N8nWorkspaceCreado | null>(null)
  const [showCreated, setShowCreated] = useState(false)
  const [copied, setCopied] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadWorkspace = async () => {
    setLoading(true)
    setError(null)
    const result = await obtenerMiWorkspaceN8n()
    if (result.ok) {
      setWorkspace(result.data)
      setNoWorkspace(false)
    } else if (result.status === 404) {
      setWorkspace(null)
      setNoWorkspace(true)
    } else {
      setError(result.error.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadWorkspace()
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    const result = await crearWorkspaceN8n()
    setCreating(false)
    if (result.ok) {
      setCreated(result.data)
      setShowCreated(true)
      setNoWorkspace(false)
    } else {
      setError(result.error.error)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    const result = await eliminarWorkspaceN8n()
    setDeleting(false)
    if (result.ok) {
      setConfirmDelete(false)
      setWorkspace(null)
      setNoWorkspace(true)
    } else {
      setError(result.error.error)
      setConfirmDelete(false)
    }
  }

  const copyPassword = async () => {
    if (!created) return
    await navigator.clipboard.writeText(created.passwordTemporal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1000px] mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-[10px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
          <Workflow size={18} className="text-[#3B82F6]" />
        </div>
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">Automatización (N8N)</h1>
          <p className="text-[13px] text-[#71717A]">Crea tareas automáticas que se ejecutan solas — por ejemplo, avisarte por correo cuando pase algo en una de tus bases.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="max-w-xl"><SkeletonCard /></div>
      ) : noWorkspace ? (
        <div className="rounded-[14px] border border-[#2B2D31] bg-[#111217] p-12 text-center max-w-xl">
          <div className="w-12 h-12 rounded-[12px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center mx-auto mb-4">
            <Workflow size={20} className="text-[#3B82F6]" />
          </div>
          <h3 className="text-[16px] font-semibold text-[#F5F5F5] mb-2">Aún no tienes un workspace N8N</h3>
          <p className="text-[14px] text-[#71717A] mb-6 max-w-sm mx-auto">
            Crea tu workspace para empezar a automatizar. El nombre y la contraseña se generan automáticamente.
          </p>
          <Button variant="primary" size="md" loading={creating} onClick={handleCreate}>
            Crear workspace
          </Button>
          <div className="mt-6 flex items-center gap-2 justify-center text-[12px] text-[#71717A]">
            <AlertTriangle size={12} className="text-[#EAB308] shrink-0" />
            Límite: 1 workspace cada 10 minutos.
          </div>
        </div>
      ) : workspace && (
        <div className="max-w-xl space-y-6">
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[9px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
                  <Workflow size={15} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-[15px] font-semibold text-[#F5F5F5] font-mono">{workspace.nombreWorkspace}</p>
                  <p className="text-[11px] text-[#71717A]">Creado el {formatDate(workspace.fechaCreacion)}</p>
                </div>
              </div>
              <Badge variant={workspace.estado === 'ACTIVO' ? 'success' : 'default'} dot>
                {workspace.estado}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {[
                { label: 'Límite de workflows', value: String(workspace.limiteWorkflows) },
                { label: 'Ejecuciones al mes', value: String(workspace.limiteEjecucionesMes) },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-[#2B2D31] last:border-0">
                  <span className="text-[12px] text-[#52525B] uppercase tracking-wider">{row.label}</span>
                  <span className="text-[13px] font-mono text-[#A1A1AA]">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {!confirmDelete ? (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)} iconLeft={<Trash2 size={13} />}>
              Eliminar workspace
            </Button>
          ) : (
            <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4 max-w-xl">
              <p className="text-[13px] text-[#F87171] mb-3">
                ¿Seguro que quieres eliminar tu workspace N8N? Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
                  Sí, eliminar
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Created workspace modal — one-time password */}
      <Modal
        open={showCreated}
        onClose={() => {
          setShowCreated(false)
          loadWorkspace()
        }}
        title="Workspace N8N creado"
      >
        {created && (
          <div className="space-y-4">
            <div className="rounded-[10px] bg-[#2A2008] border border-[#422006] p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#EAB308] shrink-0 mt-0.5" />
              <span className="text-[13px] text-[#FCD34D]">
                Esta es la única vez que verás la contraseña. Cópiala ahora; no se podrá volver a consultar.
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-[#2B2D31]">
                <span className="text-[12px] text-[#52525B] uppercase">Workspace</span>
                <span className="text-[13px] font-mono text-[#A1A1AA]">{created.nombreWorkspace}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#2B2D31]">
                <span className="text-[12px] text-[#52525B] uppercase">Contraseña</span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-mono text-[#A1A1AA]">{created.passwordTemporal}</span>
                  <button
                    onClick={copyPassword}
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#18181B] transition-all cursor-pointer"
                  >
                    {copied ? <Check size={11} className="text-[#22C55E]" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#2B2D31]">
                <span className="text-[12px] text-[#52525B] uppercase">Workflows</span>
                <span className="text-[13px] font-mono text-[#A1A1AA]">{created.limiteWorkflows}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[12px] text-[#52525B] uppercase">Ejecuciones/mes</span>
                <span className="text-[13px] font-mono text-[#A1A1AA]">{created.limiteEjecucionesMes}</span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setShowCreated(false)
                loadWorkspace()
              }}
            >
              Entendido
            </Button>
          </div>
        )}
      </Modal>

      <MascotHelpButton tourId="n8n" steps={N8N_TOUR} />
    </div>
  )
}
