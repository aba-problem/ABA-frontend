/**
 * @module pages/dashboard/NewDatabasePage
 * @description Database creation page — `/dashboard/new`.
 *
 * Two-step flow:
 * 1. **Engine selection**: Choose between MySQL 8.0 and SQL Server
 *    (rendered as selectable cards with radio-style indicator)
 * 2. **Provisioning**: POST to `POST /provisioning/crear`. On
 *    success, a modal shows the new database credentials including
 *    the one-time `passwordTemporal`.
 *
 * Rate limit: 1 creation per 10 minutes (backend enforced).
 * The success modal warns the user to copy the password as it won't
 * be shown again. Closing the modal navigates to the new database's
 * detail page.
 *
 * @see api/provisioning.ts — createDatabase
 * @see ds/Modal.tsx — Success result modal
 * @see ds/Button.tsx — Button with loading state
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createDatabase } from '../../api/provisioning'
import { Button } from '../../ds/Button'
import { Badge } from '../../ds/Badge'
import { Modal } from '../../ds/Modal'
import {
  Database, ArrowLeft, Copy, Check, Terminal,
} from 'lucide-react'

/** Supported database engine types. */
type Motor = 'MySQL' | 'SQLServer'

// Ambos motores en mantenimiento temporal (bug de whitelist de IP en MySQL
// bajo diagnóstico; SQL Server se pausa junto con MySQL por consistencia del
// mensaje al usuario, no porque tenga el mismo bug). Para reactivar un motor,
// cambia su `disabled` a `false` — el resto del flujo de creación ya funciona.
const ENGINES: { value: Motor; label: string; desc: string; color: string; disabled: boolean }[] = [
  {
    value: 'MySQL',
    label: 'MySQL 8.0',
    desc: 'World\'s most popular open-source database. Great for web apps.',
    color: '#3B82F6',
    disabled: true,
  },
  {
    value: 'SQLServer',
    label: 'SQL Server',
    desc: 'Microsoft\'s enterprise-grade relational database engine.',
    color: '#A855F7',
    disabled: true,
  },
]

export default function NewDatabasePage() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Motor | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Awaited<ReturnType<typeof createDatabase>> | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!selected) return
    setLoading(true)
    setError(null)
    const res = await createDatabase(selected)
    setLoading(false)

    if (res.ok) {
      setResult(res)
      setShowResult(true)
    } else {
      setError(res.error.error)
    }
  }

  const copyValue = async (field: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  return (
    <div className="p-6 lg:p-8 max-w-[800px] mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Back
      </button>

      <div>
        <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight mb-1">Crear base de datos</h1>
        <p className="text-[14px] text-[#71717A]">Elige un motor compatible. La base quedará lista en segundos.</p>
      </div>

      {/* Engine selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ENGINES.map(engine => (
          <button
            key={engine.value}
            disabled={engine.disabled}
            onClick={() => !engine.disabled && setSelected(engine.value)}
            className={`group rounded-[14px] border p-6 text-left transition-all duration-200 ${
              engine.disabled
                ? 'border-[#2B2D31] bg-[#18181B] opacity-50 grayscale cursor-not-allowed'
                : selected === engine.value
                  ? 'border-[#3B82F6] bg-[#1E2D4A]/50 shadow-[0_0_30px_rgba(59,130,246,0.1)] cursor-pointer'
                  : 'border-[#2B2D31] bg-[#18181B] hover:border-[#3F4146] hover:bg-[#1C1C1F] cursor-pointer'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                  style={{ backgroundColor: engine.disabled ? '#27272A' : `${engine.color}18`, border: `1px solid ${engine.disabled ? '#2B2D31' : `${engine.color}30`}` }}
                >
                  <Database size={18} style={{ color: engine.disabled ? '#71717A' : engine.color }} />
                </div>
                <div>
                  <p className={`text-[15px] font-semibold ${engine.disabled ? 'text-[#71717A]' : 'text-[#F5F5F5]'}`}>{engine.label}</p>
                </div>
              </div>
              {engine.disabled && <Badge variant="warning" size="xs">En mantenimiento</Badge>}
            </div>
            <p className="text-[13px] text-[#71717A]">{engine.desc}</p>

            {!engine.disabled && selected === engine.value && (
              <div className="mt-3 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="text-[11px] text-[#3B82F6] font-medium">Selected</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Maintenance notice — both engines disabled */}
      <div className="rounded-[10px] border border-[#422006] bg-[#2A2008] p-4 flex items-center gap-3">
        <Terminal size={14} className="text-[#EAB308] shrink-0" />
        <p className="text-[12px] text-[#FCD34D]">
          La creación de bases de datos está temporalmente en mantenimiento para ambos motores. Vuelve a intentarlo más tarde.
        </p>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-4">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!selected}
          onClick={handleCreate}
        >
          Crear base de datos
        </Button>
        <Button variant="ghost" size="lg" onClick={() => navigate(-1)}>
          Cancelar
        </Button>
      </div>

      {/* Success modal */}
      <Modal
        open={showResult}
        onClose={() => {
          setShowResult(false)
          if (result?.ok) {
            navigate(`/dashboard/databases/${result.data.baseDeDatosId}`)
          }
        }}
        title="Base de datos creada"
      >
        {result?.ok && (
          <div className="space-y-4">
            <div className="rounded-[10px] bg-[#14291E] border border-[#14522D] p-3 flex items-center gap-2">
              <Check size={14} className="text-[#22C55E] shrink-0" />
              <span className="text-[13px] text-[#4ADE80]">
                 Tu base está lista. Copia la contraseña ahora; no se volverá a mostrar.
              </span>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Nombre', value: result.data.nombreBD, key: 'name' },
                { label: 'Host', value: result.data.host, key: 'host' },
                { label: 'Port', value: String(result.data.puerto), key: 'port' },
                { label: 'Usuario', value: result.data.usuarioBD, key: 'user' },
                { label: 'Contraseña', value: result.data.passwordTemporal, key: 'pass' },
                { label: 'Motor', value: result.data.motor, key: 'engine' },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2 border-b border-[#2B2D31] last:border-0">
                  <span className="text-[12px] text-[#52525B] uppercase">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-mono text-[#A1A1AA]">{item.value}</span>
                    <button
                      onClick={() => copyValue(item.key, item.value)}
                      className="w-6 h-6 rounded-[4px] flex items-center justify-center text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#18181B] transition-all cursor-pointer"
                    >
                      {copiedField === item.key ? <Check size={11} className="text-[#22C55E]" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setShowResult(false)
                navigate(`/dashboard/databases/${result.data.baseDeDatosId}`)
              }}
            >
               Ir a la base
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
