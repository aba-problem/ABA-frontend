/**
 * @module pages/dashboard/NewDatabasePage
 * @description Database creation page — `/dashboard/new`.
 *
 * Two-step flow:
 * 1. **Engine selection**: Choose between MySQL 8.0 and SQL Server
 *    (rendered as selectable cards with radio-style indicator)
 * 2. **Provisioning**: POST to `POST /api/provisioning/create`. On
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
import { Modal } from '../../ds/Modal'
import {
  Database, ArrowLeft, Copy, Check, Terminal,
} from 'lucide-react'

/** Supported database engine types. */
type Motor = 'MySQL' | 'SQLServer'

const ENGINES: { value: Motor; label: string; desc: string; color: string }[] = [
  {
    value: 'MySQL',
    label: 'MySQL 8.0',
    desc: 'World\'s most popular open-source database. Great for web apps.',
    color: '#3B82F6',
  },
  {
    value: 'SQLServer',
    label: 'SQL Server',
    desc: 'Microsoft\'s enterprise-grade relational database engine.',
    color: '#A855F7',
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
        <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight mb-1">Create Database</h1>
        <p className="text-[14px] text-[#71717A]">Choose an engine. Your database will be ready in seconds.</p>
      </div>

      {/* Engine selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {ENGINES.map(engine => (
          <button
            key={engine.value}
            onClick={() => setSelected(engine.value)}
            className={`group rounded-[14px] border p-6 text-left transition-all duration-200 cursor-pointer ${
              selected === engine.value
                ? 'border-[#3B82F6] bg-[#1E2D4A]/50 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                : 'border-[#2B2D31] bg-[#18181B] hover:border-[#3F4146] hover:bg-[#1C1C1F]'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                style={{ backgroundColor: `${engine.color}18`, border: `1px solid ${engine.color}30` }}
              >
                <Database size={18} style={{ color: engine.color }} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#F5F5F5]">{engine.label}</p>
              </div>
            </div>
            <p className="text-[13px] text-[#71717A]">{engine.desc}</p>

            {selected === engine.value && (
              <div className="mt-3 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="text-[11px] text-[#3B82F6] font-medium">Selected</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Rate limit info */}
      <div className="rounded-[10px] border border-[#2B2D31] bg-[#111217] p-4 flex items-center gap-3">
        <Terminal size={14} className="text-[#71717A] shrink-0" />
        <p className="text-[12px] text-[#71717A]">
          Rate limit: 1 database creation every 10 minutes.
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
          Create database
        </Button>
        <Button variant="ghost" size="lg" onClick={() => navigate(-1)}>
          Cancel
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
        title="Database created"
      >
        {result?.ok && (
          <div className="space-y-4">
            <div className="rounded-[10px] bg-[#14291E] border border-[#14522D] p-3 flex items-center gap-2">
              <Check size={14} className="text-[#22C55E] shrink-0" />
              <span className="text-[13px] text-[#4ADE80]">
                Your database is ready. Copy the password below — it won&apos;t be shown again.
              </span>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Name', value: result.data.nombreBD, key: 'name' },
                { label: 'Host', value: result.data.host, key: 'host' },
                { label: 'Port', value: String(result.data.puerto), key: 'port' },
                { label: 'User', value: result.data.usuarioBD, key: 'user' },
                { label: 'Password', value: result.data.passwordTemporal, key: 'pass' },
                { label: 'Engine', value: result.data.motor, key: 'engine' },
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
              Go to database
            </Button>
          </div>
        )}
      </Modal>
    </div>
  )
}
