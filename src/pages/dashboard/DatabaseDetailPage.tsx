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
 * (`postgresql://` or `mysql://`) and copies it to the clipboard.
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
import { getDatabase, getCredential } from '../../api/dashboard'
import type { DashboardItem, Credencial } from '../../api/types'
import { Skeleton, SkeletonText } from '../../ds/Skeleton'
import { Badge, StatusDot } from '../../ds/Badge'
import { Button } from '../../ds/Button'
import {
  Database, ArrowLeft, Copy, Check, Eye, EyeOff, HardDrive,
  Activity, Clock, Server, User, Shield,
} from 'lucide-react'

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

  const copyConnectionString = useCallback(() => {
    if (!cred) return
    const connStr = `${cred.motor === 'MySQL' ? 'mysql' : 'postgresql'}://${cred.usuarioBD}:${cred.password}@${cred.host}:${cred.puerto}/${cred.nombreBD}`
    navigator.clipboard.writeText(connStr)
    setCopiedConn(true)
    setTimeout(() => setCopiedConn(false), 2000)
  }, [cred])

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
        Back to databases
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
              <span className="text-[12px] text-[#71717A]">{db.estado}</span>
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
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Connection</h3>
            </div>
            <InfoRow label="Host" value={db.host} mono copyable />
            <InfoRow label="Port" value={String(db.puerto)} mono copyable />
            <InfoRow label="Engine" value={db.motor} />
            <InfoRow label="User" value={db.usuarioBD} mono copyable />
          </div>

          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-4">
              <HardDrive size={14} className="text-[#A855F7]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Storage</h3>
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
              <span className="text-[12px] text-[#71717A]">{storagePercent.toFixed(1)}% used</span>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-[#22C55E]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Activity</h3>
            </div>
            <InfoRow label="Created" value={new Date(db.fechaCreacion).toLocaleDateString()} />
            <InfoRow
              label="Last active"
              value={db.ultimaActividad ? new Date(db.ultimaActividad).toLocaleDateString() : 'Never'}
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
                <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Credentials</h3>
              </div>
              {!cred && (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={credLoading}
                  onClick={loadCredential}
                >
                  Reveal credentials
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
                      {copiedConn ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-[#A1A1AA] break-all">
                    <span className="text-[#60A5FA]">{cred.usuarioBD}</span>
                    <span className="text-[#52525B]">@</span>
                    <span className="text-[#A1A1AA]">{cred.host}</span>
                    <span className="text-[#52525B]">:</span>
                    <span className="text-[#A1A1AA]">{cred.puerto}</span>
                    <span className="text-[#52525B]">/</span>
                    <span className="text-[#A1A1AA]">{cred.nombreBD}</span>
                  </p>
                </div>

                <div className="rounded-[10px] border border-[#2B2D31] bg-[#09090B] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] text-[#52525B] uppercase tracking-wider font-mono">Password</span>
                    <button
                      onClick={() => setShowPassword(s => !s)}
                      className="flex items-center gap-1 text-[11px] text-[#71717A] hover:text-[#A1A1AA] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="font-mono text-[13px] text-[#A1A1AA]">
                    {showPassword ? cred.password : '\u2022'.repeat(16)}
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-[#2A2008] border border-[#422006]">
                  <Clock size={12} className="text-[#EAB308] shrink-0" />
                  <span className="text-[11px] text-[#FCD34D]">
                    Rate limit: 5 credential views per hour
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-[10px] border border-dashed border-[#2B2D31] bg-[#09090B] p-8 text-center">
                <User size={20} className="text-[#52525B] mx-auto mb-2" />
                <p className="text-[13px] text-[#71717A]">
                  Click &quot;Reveal credentials&quot; to view connection details
                </p>
                <p className="text-[11px] text-[#52525B] mt-1">Rate limited to 5 views per hour</p>
              </div>
            )}
          </div>

          {/* Database info table */}
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database size={14} className="text-[#3B82F6]" />
              <h3 className="text-[14px] font-semibold text-[#F5F5F5]">Database Details</h3>
            </div>
            <InfoRow label="Name" value={db.nombreBD} mono copyable />
            <InfoRow label="User" value={db.usuarioBD} mono copyable />
            <InfoRow label="Engine" value={db.motor} />
            <InfoRow label="Status" value={db.estado} />
            <InfoRow label="Max Storage" value={`${db.espacioMaximoMB} MB`} />
            <InfoRow label="Used Storage" value={`${db.espacioUtilizadoMB} MB`} />
            <InfoRow label="Created" value={new Date(db.fechaCreacion).toLocaleString()} />
            <InfoRow
              label="Last Activity"
              value={db.ultimaActividad ? new Date(db.ultimaActividad).toLocaleString() : 'N/A'}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
