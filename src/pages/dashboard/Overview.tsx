/**
 * @module pages/dashboard/Overview
 * @description Dashboard overview page — the default `/dashboard` route.
 *
 * Displays:
 * - **Stats row**: total databases, active count, storage used, max quota
 * - **Recent databases**: grid of up to 6 database cards with name, engine,
 *   host, status dot, and storage progress bar
 * - **Empty state**: call-to-action when user has no databases
 *
 * Fetches data via {@link listDatabases} on mount. Uses skeleton loading
 * states during fetch. If the API returns a 401, redirects to login
 * (handled by `ProtectedRoute`).
 *
 * @see api/dashboard.ts — listDatabases
 * @see ds/Skeleton.tsx — SkeletonCard loading placeholder
 * @see ds/Badge.tsx — StatusDot for database state
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { listDatabases } from '../../api/dashboard'
import type { DashboardItem } from '../../api/types'
import { SkeletonCard } from '../../ds/Skeleton'
import { StatusDot } from '../../ds/Badge'
import {
  Database, ArrowRight, HardDrive, Activity, Clock,
} from 'lucide-react'

/** Reusable stat card used in the stats row. */
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string
}) {
  return (
    <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-8 h-8 rounded-[8px] flex items-center justify-center"
          style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
        <span className="text-[12px] text-[#71717A]">{label}</span>
      </div>
      <p className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">{value}</p>
    </div>
  )
}

export default function DashboardOverview() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [databases, setDatabases] = useState<DashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listDatabases()
      if (cancelled) return
      if (result.ok) {
        setDatabases(result.data)
        setError(null)
      } else {
        setError(result.error.error)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // TODO backend: fetch user profile from a dedicated endpoint once available
  useEffect(() => {
    if (!user) {
      setUser({ usuarioId: 0, nombre: 'Developer', correo: '', avatarUrl: null, proveedor: '', fechaCreacion: '', ultimoLogin: null })
    }
  }, [user, setUser])

  const activeDbs = databases.filter(d => d.estado === 'ACTIVA')
  const totalStorage = databases.reduce((sum, d) => sum + d.espacioUtilizadoMB, 0)
  const maxStorage = databases.reduce((sum, d) => sum + d.espacioMaximoMB, 0) || 512

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-semibold text-[#F5F5F5] tracking-tight mb-1">Dashboard</h1>
        <p className="text-[14px] text-[#71717A]">
          Welcome back{user?.nombre ? `, ${user.nombre}` : ''}. Here&apos;s your infrastructure overview.
        </p>
      </div>

      {/* Stats row */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-[14px] border border-[#7F1D1D] bg-[#2A1010] p-5">
          <p className="text-[14px] text-[#F87171]">{error}</p>
          <p className="text-[12px] text-[#71717A] mt-1">Check console for traceId details.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Database} label="Total databases" value={databases.length} color="#3B82F6" />
          <StatCard icon={Activity} label="Active" value={activeDbs.length} color="#22C55E" />
          <StatCard icon={HardDrive} label="Storage used" value={`${totalStorage.toFixed(1)} MB`} color="#A855F7" />
          <StatCard icon={Clock} label="Max quota" value={`${maxStorage} MB`} color="#EAB308" />
        </div>
      )}

      {/* Recent databases */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[18px] font-semibold text-[#F5F5F5]">Your databases</h2>
          <button
            onClick={() => navigate('/dashboard/new')}
            className="text-[13px] text-[#3B82F6] hover:text-[#60A5FA] transition-colors cursor-pointer"
          >
            + Create new
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : databases.length === 0 ? (
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#111217] p-12 text-center">
            <div className="w-12 h-12 rounded-[12px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center mx-auto mb-4">
              <Database size={20} className="text-[#3B82F6]" />
            </div>
            <h3 className="text-[16px] font-semibold text-[#F5F5F5] mb-2">No databases yet</h3>
            <p className="text-[14px] text-[#71717A] mb-6 max-w-sm mx-auto">
              Create your first database in under 30 seconds. PostgreSQL or MySQL — your choice.
            </p>
            <button
              onClick={() => navigate('/dashboard/new')}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-[10px] bg-[#3B82F6] text-[14px] font-medium text-white hover:bg-[#2563EB] transition-all cursor-pointer"
            >
              Create database
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {databases.slice(0, 6).map(db => (
              <button
                key={db.id}
                onClick={() => navigate(`/dashboard/databases/${db.id}`)}
                className="group rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5 text-left hover:border-[#3F4146] hover:bg-[#1C1C1F] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
                      <Database size={14} className="text-[#3B82F6]" />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-[#F5F5F5] group-hover:text-[#60A5FA] transition-colors">
                        {db.nombreBD}
                      </p>
                      <p className="text-[11px] font-mono text-[#52525B]">{db.motor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusDot
                      variant={db.estado === 'ACTIVA' ? 'success' : db.estado === 'PAUSADA' ? 'warning' : 'danger'}
                      pulse={db.estado === 'ACTIVA'}
                    />
                    <span className="text-[11px] text-[#71717A]">{db.estado}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <p className="text-[#52525B] mb-0.5">Host</p>
                    <p className="font-mono text-[#A1A1AA] truncate">{db.host}</p>
                  </div>
                  <div>
                    <p className="text-[#52525B] mb-0.5">Storage</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#1F2024] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#3B82F6] transition-all"
                          style={{
                            width: `${Math.min((db.espacioUtilizadoMB / db.espacioMaximoMB) * 100, 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-[#71717A] shrink-0">
                        {db.espacioUtilizadoMB}/{db.espacioMaximoMB}MB
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
