/**
 * @module pages/dashboard/N8nPage
 * @description N8N workspace self-service — `/dashboard/n8n`.
 *
 * Real n8n accounts, provisioned via the Snapshot external API (not a local
 * placeholder). Snapshot doesn't support setting a password via API, so the
 * one-time credential is an **invite link** the user opens to set their own
 * password — not a password itself.
 *
 * Manages the user's N8N workspace lifecycle:
 * - Empty state with "Create workspace" CTA when none exists
 * - Workspace details (email, limits, status, creation date)
 * - Create flow: one-time invite-link modal with copy/open + warning
 * - Delete flow with inline confirmation — LOCAL only, see warning copy below
 *   (Snapshot exposes no deprovisioning endpoint, so the real account survives)
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
  Workflow, ArrowLeft, Copy, Check, AlertTriangle, Trash2, ExternalLink,
} from 'lucide-react'

const N8N_TOUR = [
  {
    title: '¿Qué es esto?',
    body: 'N8N es una herramienta de automatización — conectá servicios entre sí para que se ejecuten solos, sin que tengas que estar mirando. Esta es una cuenta real, no una simulación.',
    tipo: 'info' as const,
  },
  {
    title: 'Crear tu cuenta',
    body: 'Solo una por cuenta de ABA, ligada a tu correo. Vas a recibir un enlace de invitación para definir tu propia contraseña.',
    selector: '[data-tour="n8n-crear"]',
    tipo: 'crear' as const,
  },
  {
    title: 'Guardá el enlace ya',
    body: 'El proveedor de N8N no permite fijar contraseña por API, así que la credencial es un enlace de invitación de un solo uso — se muestra una única vez en el modal de creación.',
    tipo: 'estado' as const,
  },
  {
    title: 'Eliminar workspace',
    body: 'Solo borra el registro acá en ABA — el proveedor externo no tiene forma de borrar la cuenta real, así que sigue existiendo del otro lado.',
    selector: '[data-tour="n8n-eliminar"]',
    tipo: 'eliminar' as const,
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

  const copyInviteLink = async () => {
    if (!created) return
    await navigator.clipboard.writeText(created.credencialUrl)
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
            Crea tu cuenta real de N8N, ligada a tu correo. Vas a recibir un enlace de invitación para definir tu propia contraseña.
          </p>
          <Button data-tour="n8n-crear" variant="primary" size="md" loading={creating} onClick={handleCreate}>
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
                  <p className="text-[11px] text-[#71717A]">Cuenta real de N8N · creada el {formatDate(workspace.fechaCreacion)}</p>
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
            <Button data-tour="n8n-eliminar" variant="danger" size="sm" onClick={() => setConfirmDelete(true)} iconLeft={<Trash2 size={13} />}>
              Eliminar workspace
            </Button>
          ) : (
            <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4 max-w-xl">
              <p className="text-[13px] text-[#F87171] mb-2">
                ¿Seguro que quieres eliminar tu workspace N8N? Esta acción no se puede deshacer.
              </p>
              <p className="text-[12px] text-[#FCA5A5] mb-3">
                Ojo: esto solo borra el registro acá en ABA. El proveedor externo (Snapshot) no
                tiene un endpoint para borrar la cuenta real — sigue existiendo del otro lado. Si
                creás una nueva más adelante, es esperable que te diga que ya tenés una cuenta.
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

      {/* Created workspace modal — one-time invite link (not a password: Snapshot
          doesn't support setting one via API, the user defines it after opening the link) */}
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
                Esta es la única vez que verás el enlace de invitación. Guárdalo o ábrelo ahora; no se podrá volver a consultar.
              </span>
            </div>

            <div className="rounded-[10px] border border-[#2B2D31] bg-[#09090B] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#52525B] uppercase tracking-wider">Enlace de invitación</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={copyInviteLink}
                    title="Copiar enlace"
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#18181B] transition-all cursor-pointer"
                  >
                    {copied ? <Check size={11} className="text-[#22C55E]" /> : <Copy size={11} />}
                  </button>
                  <a
                    href={created.credencialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir enlace"
                    className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#18181B] transition-all cursor-pointer"
                  >
                    <ExternalLink size={11} />
                  </a>
                </div>
              </div>
              <p className="text-[12px] font-mono text-[#A1A1AA] break-all">{created.credencialUrl}</p>
            </div>

            <p className="text-[12px] text-[#71717A]">
              Al abrirlo vas a poder definir tu propia contraseña y entrar a tu espacio de trabajo.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-[#2B2D31]">
                <span className="text-[12px] text-[#52525B] uppercase">Correo</span>
                <span className="text-[13px] font-mono text-[#A1A1AA]">{created.nombreWorkspace}</span>
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
