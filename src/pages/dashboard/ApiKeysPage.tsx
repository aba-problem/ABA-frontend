/**
 * @module pages/dashboard/ApiKeysPage
 * @description API key management — `/dashboard/apikeys`.
 *
 * Manages the user's API keys for the "IA como Servicio" module:
 * - Create key: one-time `keyCompleta` modal with copy + warning
 * - List keys (only the `prefijo` is ever shown)
 * - Expandable daily consumption (last 30 days)
 * - Revoke with inline confirmation
 *
 * Rate limit: 5 creations per hour (backend enforced).
 *
 * @see api/apikeys.ts — crearApiKey, listarApiKeys, revocarApiKey, obtenerConsumoApiKey
 * @see api/types.ts — ApiKey, ApiKeyCreada, ApiKeyConsumoDia
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  crearApiKey, listarApiKeys, revocarApiKey, obtenerConsumoApiKey,
} from '../../api/apikeys'
import type { ApiKey, ApiKeyCreada, ApiKeyConsumoDia } from '../../api/types'
import { Button } from '../../ds/Button'
import { Modal } from '../../ds/Modal'
import { Badge } from '../../ds/Badge'
import { SkeletonCard } from '../../ds/Skeleton'
import {
  KeyRound, ArrowLeft, Copy, Check, AlertTriangle, Trash2, ChevronDown, ChevronUp,
  BookOpen, HelpCircle,
} from 'lucide-react'

function formatDate(iso: string | null): string {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function ApiKeysPage() {
  const navigate = useNavigate()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<ApiKeyCreada | null>(null)
  const [showCreated, setShowCreated] = useState(false)
  const [copied, setCopied] = useState(false)

  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [confirmRevokeId, setConfirmRevokeId] = useState<number | null>(null)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [consumo, setConsumo] = useState<Record<number, ApiKeyConsumoDia[]>>({})
  const [consumoLoading, setConsumoLoading] = useState<number | null>(null)

  const [showTutorial, setShowTutorial] = useState(true)
  const [copiedCurl, setCopiedCurl] = useState(false)
  const curlEjemplo = 'curl -X POST https://api.aba.andrescortes.dev/ai/completar \\\n' +
    '  -H "X-API-Key: TU_KEY_AQUI" \\\n' +
    '  -H "Content-Type: application/json" \\\n' +
    '  -d \'{"prompt": "Explica qué es una API REST", "maxTokens": 256}\''
  const copyCurl = async () => {
    await navigator.clipboard.writeText(curlEjemplo)
    setCopiedCurl(true)
    setTimeout(() => setCopiedCurl(false), 2000)
  }

  const loadKeys = async () => {
    setLoading(true)
    setError(null)
    const result = await listarApiKeys()
    if (result.ok) {
      setKeys(result.data)
    } else {
      setError(result.error.error)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadKeys()
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    const result = await crearApiKey()
    setCreating(false)
    if (result.ok) {
      setCreated(result.data)
      setShowCreated(true)
      loadKeys()
    } else {
      setError(result.error.error)
    }
  }

  const handleRevoke = async (id: number) => {
    setRevokingId(id)
    setError(null)
    const result = await revocarApiKey(id)
    setRevokingId(null)
    setConfirmRevokeId(null)
    if (result.ok) {
      loadKeys()
    } else {
      setError(result.error.error)
    }
  }

  const toggleConsumo = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (!consumo[id]) {
      setConsumoLoading(id)
      const result = await obtenerConsumoApiKey(id)
      setConsumoLoading(null)
      if (result.ok) {
        setConsumo(prev => ({ ...prev, [id]: result.data }))
      } else {
        setError(result.error.error)
      }
    }
  }

  const copyKey = async () => {
    if (!created) return
    await navigator.clipboard.writeText(created.keyCompleta)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[10px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
            <KeyRound size={18} className="text-[#3B82F6]" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">IA como Servicio</h1>
            <p className="text-[13px] text-[#71717A]">
              Claves de acceso para que tus programas usen IA en tu nombre. Tienes {keys.length}{keys.length === 1 ? ' clave' : ' claves'} · hasta 5 nuevas por hora.
            </p>
          </div>
        </div>
        <Button variant="primary" size="md" loading={creating} onClick={handleCreate} iconLeft={<KeyRound size={14} />}>
          Crear API key
        </Button>
      </div>

      {/* Tutorial breve — cómo generar, usar y recuperar el acceso si se pierde la key */}
      <div className="rounded-[14px] border border-[#2B2D31] bg-[#111217] overflow-hidden">
        <button
          onClick={() => setShowTutorial(s => !s)}
          className="w-full flex items-center justify-between gap-3 p-4 cursor-pointer hover:bg-[#18181B] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <BookOpen size={15} className="text-[#3B82F6]" />
            <span className="text-[14px] font-semibold text-[#F5F5F5]">Cómo usarla</span>
          </div>
          {showTutorial ? <ChevronUp size={14} className="text-[#71717A]" /> : <ChevronDown size={14} className="text-[#71717A]" />}
        </button>

        {showTutorial && (
          <div className="px-4 pb-5 space-y-4">
            <ol className="space-y-3">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[#1E2D4A] border border-[#1E3A6E] text-[#60A5FA] text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">1</span>
                <p className="text-[13px] text-[#A1A1AA]">
                  Creá una key con el botón <span className="text-[#F5F5F5] font-medium">&quot;Crear API key&quot;</span> de arriba.
                  Te va a mostrar el valor completo <span className="text-[#F5F5F5]">una única vez</span>.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[#1E2D4A] border border-[#1E3A6E] text-[#60A5FA] text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">2</span>
                <p className="text-[13px] text-[#A1A1AA]">
                  Copiala y guardala en un lugar seguro (variable de entorno, gestor de secretos). Después de cerrar
                  ese modal, ABA ya no puede volver a mostrártela — solo guarda un hash, no el valor real (igual que GitHub o Stripe).
                </p>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[#1E2D4A] border border-[#1E3A6E] text-[#60A5FA] text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">3</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#A1A1AA] mb-2">
                    Usala en el header <span className="font-mono text-[#F5F5F5]">X-API-Key</span> de tus llamadas a{' '}
                    <span className="font-mono text-[#F5F5F5]">POST /ai/completar</span>:
                  </p>
                  <div className="rounded-[10px] border border-[#2B2D31] bg-[#09090B] p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-[#52525B] uppercase tracking-wider">Ejemplo</span>
                      <button
                        onClick={copyCurl}
                        className="flex items-center gap-1 text-[11px] text-[#3B82F6] hover:text-[#60A5FA] transition-colors cursor-pointer"
                      >
                        {copiedCurl ? <Check size={11} /> : <Copy size={11} />}
                        {copiedCurl ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <pre className="text-[11.5px] font-mono text-[#A1A1AA] whitespace-pre-wrap break-all">{curlEjemplo}</pre>
                  </div>
                  <p className="text-[11px] text-[#52525B] mt-1.5">
                    Límite compartido: hasta 8 solicitudes/min entre todos los usuarios de ABA. Si te toca un 503, esperá un momento y reintentá.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-[#2A1010] border border-[#7F1D1D] text-[#F87171] text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle size={12} />
                </span>
                <p className="text-[13px] text-[#A1A1AA]">
                  <span className="text-[#F5F5F5] font-medium">¿Perdiste la key o se filtró?</span> No hay forma de volver
                  a verla — revocala con el ícono de basurero en la lista de abajo y creá una nueva. Es instantáneo y no
                  afecta tus otras keys activas.
                </p>
              </li>
            </ol>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-[14px] border border-[#2B2D31] bg-[#111217] p-12 text-center">
          <KeyRound size={24} className="text-[#52525B] mx-auto mb-3" />
          <p className="text-[14px] text-[#71717A]">
            Aún no tienes API keys. Crea una para consumir los servicios de IA.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => (
            <div key={key.id} className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[8px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center shrink-0">
                      <KeyRound size={14} className="text-[#3B82F6]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-mono font-semibold text-[#F5F5F5] truncate">{key.prefijo}••••••••</p>
                      <p className="text-[11px] text-[#71717A]">Creada {formatDate(key.fechaCreacion)} · Último uso {formatDate(key.ultimoUso)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={key.activa ? 'success' : 'danger'} dot>
                      {key.activa ? 'Activa' : 'Revocada'}
                    </Badge>
                    <button
                      onClick={() => toggleConsumo(key.id)}
                      className="flex items-center gap-1 h-7 px-2.5 rounded-[6px] text-[11px] text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#1C1C1F] transition-all cursor-pointer"
                    >
                      {expandedId === key.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      Consumo
                    </button>
                    {key.activa && (
                      !confirmRevokeId || confirmRevokeId !== key.id ? (
                        <button
                          onClick={() => setConfirmRevokeId(key.id)}
                          className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#71717A] hover:text-[#EF4444] hover:bg-[#2A1010] transition-all cursor-pointer"
                          title="Revocar key"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-[#F87171]">¿Revocar?</span>
                          <Button variant="danger" size="xs" loading={revokingId === key.id} onClick={() => handleRevoke(key.id)}>
                            Sí
                          </Button>
                          <Button variant="secondary" size="xs" onClick={() => setConfirmRevokeId(null)} disabled={revokingId === key.id}>
                            No
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {expandedId === key.id && (
                  <div className="mt-4 pt-4 border-t border-[#2B2D31]">
                    <p className="text-[11px] text-[#52525B] uppercase tracking-wider mb-2">Consumo últimos 30 días</p>
                    {consumoLoading === key.id ? (
                      <div className="flex items-center gap-2 text-[12px] text-[#71717A]">
                        <div className="w-3.5 h-3.5 border-2 border-[#3B82F6] border-t-transparent rounded-full aba-spin" />
                        Cargando consumo...
                      </div>
                    ) : (consumo[key.id]?.length ?? 0) === 0 ? (
                      <p className="text-[12px] text-[#71717A]">Sin llamadas en los últimos 30 días.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {consumo[key.id]?.map(d => (
                          <div key={d.dia} className="rounded-[8px] border border-[#2B2D31] bg-[#09090B] p-3">
                            <p className="text-[11px] text-[#71717A] mb-1">{formatDate(d.dia)}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-mono text-[#A1A1AA]">{d.llamadas} llamadas</span>
                              <span className="text-[11px] font-mono text-[#52525B]">{d.tokensTotales} tokens</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Created key modal — one-time full key */}
      <Modal
        open={showCreated}
        onClose={() => setShowCreated(false)}
        title="API key creada"
      >
        {created && (
          <div className="space-y-4">
            <div className="rounded-[10px] bg-[#2A2008] border border-[#422006] p-3 flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#EAB308] shrink-0 mt-0.5" />
              <span className="text-[13px] text-[#FCD34D]">
                Esta es la única vez que verás la key completa. Cópiala ahora; no se podrá volver a consultar.
              </span>
            </div>

            <div className="rounded-[10px] border border-[#2B2D31] bg-[#09090B] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#52525B] uppercase tracking-wider font-mono">Key completa</span>
                <button
                  onClick={copyKey}
                  className="flex items-center gap-1 text-[11px] text-[#3B82F6] hover:text-[#60A5FA] transition-colors cursor-pointer"
                >
                  {copied ? <Check size={11} /> : <Copy size={11} />}
                  {copied ? 'Copiada' : 'Copiar'}
                </button>
              </div>
              <p className="font-mono text-[13px] text-[#A1A1AA] break-all">{created.keyCompleta}</p>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-[#2B2D31]">
              <span className="text-[12px] text-[#52525B] uppercase">Prefijo</span>
              <span className="text-[13px] font-mono text-[#A1A1AA]">{created.prefijo}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#2A2008] border border-[#422006]">
              <AlertTriangle size={12} className="text-[#EAB308] shrink-0" />
              <span className="text-[11px] text-[#FCD34D]">
                Úsala con el header <span className="font-mono">X-API-Key</span> en <span className="font-mono">POST /ai/completar</span>.
              </span>
            </div>

            <Button variant="primary" fullWidth onClick={() => setShowCreated(false)}>
              Entendido
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
