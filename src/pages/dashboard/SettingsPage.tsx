import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getProfile } from '../../api/dashboard'
import { SkeletonCard } from '../../ds/Skeleton'
import { User, Mail, Shield, Calendar, Clock } from 'lucide-react'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function ProfileRow({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string
}) {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-[#1F2024] last:border-0">
      <div
        className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-[#52525B] mb-0.5">{label}</p>
        <p className="text-[14px] text-[#F5F5F5] truncate">{value}</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(!user)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await getProfile()
      if (cancelled) return
      if (result.ok) {
        setUser(result.data)
        setError(null)
      } else {
        setError(result.error.error)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [setUser])

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold text-[#F5F5F5] tracking-tight mb-1">Settings</h1>
        <p className="text-[14px] text-[#71717A]">Manage your account and profile information.</p>
      </div>

      {loading ? (
        <div className="max-w-xl"><SkeletonCard /></div>
      ) : error ? (
        <div className="max-w-xl rounded-[14px] border border-[#7F1D1D] bg-[#2A1010] p-5">
          <p className="text-[14px] text-[#F87171]">{error}</p>
        </div>
      ) : user && (
        <div className="max-w-xl space-y-6">
          {/* Avatar + Name card */}
          <div className="rounded-[14px] border border-[#2B2D31] bg-[#18181B] p-6">
            <div className="flex items-center gap-5 mb-6">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
                  <span className="text-[24px] font-semibold text-[#60A5FA]">
                    {user.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-[20px] font-semibold text-[#F5F5F5]">{user.nombre}</h2>
                <p className="text-[13px] text-[#71717A]">{user.correo}</p>
              </div>
            </div>

            <ProfileRow icon={User} label="Name" value={user.nombre} color="#3B82F6" />
            <ProfileRow icon={Mail} label="Email" value={user.correo} color="#22C55E" />
            <ProfileRow icon={Shield} label="Provider" value={user.proveedor} color="#A855F7" />
            <ProfileRow icon={Calendar} label="Account created" value={formatDate(user.fechaCreacion)} color="#EAB308" />
            <ProfileRow icon={Clock} label="Last login" value={formatDate(user.ultimoLogin)} color="#F97316" />
          </div>
        </div>
      )}
    </div>
  )
}
