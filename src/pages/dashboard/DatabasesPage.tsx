/**
 * @module pages/dashboard/DatabasesPage
 * @description Full database list page — `/dashboard/databases`.
 *
 * Displays all user databases in a responsive grid (1–3 columns) with
 * a search filter that matches against database name, engine, and host.
 *
 * Features:
 * - Client-side search (filters the already-fetched list)
 * - New database button in the header
 * - Empty state for no databases / no search matches
 * - Storage progress bar with red color when >80% full
 *
 * @see api/dashboard.ts — listDatabases
 * @see pages/dashboard/DatabaseDetailPage.tsx — Detail page for each DB
 * @see pages/dashboard/NewDatabasePage.tsx — Create new database
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listDatabases } from '../../api/dashboard'
import type { DashboardItem } from '../../api/types'
import { SkeletonCard } from '../../ds/Skeleton'
import { StatusDot } from '../../ds/Badge'
import { Database, Search } from 'lucide-react'

export default function DatabasesPage() {
  const navigate = useNavigate()
  const [databases, setDatabases] = useState<DashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const result = await listDatabases()
      if (cancelled) return
      if (result.ok) {
        setDatabases(result.data)
      } else {
        setError(result.error.error)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = databases.filter(
    d => d.nombreBD.toLowerCase().includes(search.toLowerCase()) ||
         d.motor.toLowerCase().includes(search.toLowerCase()) ||
         d.host.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">Databases</h1>
          <p className="text-[13px] text-[#71717A] mt-1">{databases.length} total</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/new')}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-[10px] bg-[#3B82F6] text-[13px] font-medium text-white hover:bg-[#2563EB] transition-all cursor-pointer"
        >
          + New database
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#52525B]" />
        <input
          type="text"
          placeholder="Search databases..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-3 rounded-[10px] border border-[#2B2D31] bg-[#111217] text-[13px] text-[#F5F5F5] placeholder-[#52525B] focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 outline-none transition-all"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : error ? (
        <div className="rounded-[14px] border border-[#7F1D1D] bg-[#2A1010] p-5">
          <p className="text-[14px] text-[#F87171]">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[14px] border border-[#2B2D31] bg-[#111217] p-12 text-center">
          <Database size={24} className="text-[#52525B] mx-auto mb-3" />
          <p className="text-[14px] text-[#71717A]">
            {search ? 'No databases match your search.' : 'No databases created yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(db => (
            <button
              key={db.id}
              onClick={() => navigate(`/dashboard/databases/${db.id}`)}
              className="group rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-5 text-left hover:border-[#3F4146] hover:bg-[#1C1C1F] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[8px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
                    <Database size={14} className="text-[#3B82F6]" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#F5F5F5] group-hover:text-[#60A5FA] transition-colors truncate max-w-[160px]">
                      {db.nombreBD}
                    </p>
                    <p className="text-[11px] font-mono text-[#52525B]">{db.motor}</p>
                  </div>
                </div>
                <StatusDot
                  variant={db.estado === 'ACTIVA' ? 'success' : db.estado === 'PAUSADA' ? 'warning' : 'danger'}
                />
              </div>

              <div className="space-y-2 text-[12px]">
                <div className="flex justify-between">
                  <span className="text-[#52525B]">Host</span>
                  <span className="font-mono text-[#A1A1AA] truncate ml-2 max-w-[140px]">{db.host}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52525B]">Port</span>
                  <span className="font-mono text-[#A1A1AA]">{db.puerto}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#52525B]">Storage</span>
                  <span className="text-[#A1A1AA]">{db.espacioUtilizadoMB}/{db.espacioMaximoMB} MB</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1F2024] overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((db.espacioUtilizadoMB / db.espacioMaximoMB) * 100, 100)}%`,
                      backgroundColor: (db.espacioUtilizadoMB / db.espacioMaximoMB) > 0.8 ? '#EF4444' : '#3B82F6',
                    }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
