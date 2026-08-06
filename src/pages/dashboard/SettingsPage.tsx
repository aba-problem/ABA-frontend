import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme, THEME_OPTIONS } from '../../contexts/ThemeContext'
import { getProfile } from '../../api/dashboard'
import { SkeletonCard } from '../../ds/Skeleton'
import { User, Mail, Shield, Calendar, Clock, Check, Palette } from 'lucide-react'

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
    <div className="flex items-center gap-4 py-4 border-b border-[var(--aba-border-subtle)] last:border-0">
      <div
        className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] text-[var(--aba-text-disabled)] mb-0.5">{label}</p>
        <p className="text-[14px] text-[var(--aba-text)] truncate">{value}</p>
      </div>
    </div>
  )
}

/** Appearance section — switches the dashboard shell's theme (sidebar, topbar, cards). */
function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="rounded-[14px] border border-[var(--aba-border)] bg-[var(--aba-card)] p-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0" style={{ backgroundColor: '#A855F718', border: '1px solid #A855F730' }}>
          <Palette size={15} style={{ color: '#A855F7' }} />
        </div>
        <div>
          <h2 className="text-[16px] font-semibold text-[var(--aba-text)]">Apariencia</h2>
          <p className="text-[12px] text-[var(--aba-text-muted)]">Elige el tema del panel. Se guarda en este navegador.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
        {THEME_OPTIONS.map(opt => {
          const active = theme === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className={`rounded-[10px] border p-3 text-left transition-all cursor-pointer ${
                active
                  ? 'border-[var(--aba-accent)] ring-1 ring-[var(--aba-accent)]/40'
                  : 'border-[var(--aba-border)] hover:border-[var(--aba-text-muted)]'
              }`}
              style={{ backgroundColor: opt.swatch[0] }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: opt.swatch[1] }} />
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ backgroundColor: opt.swatch[2] }} />
                </div>
                {active && <Check size={14} style={{ color: opt.swatch[2] }} />}
              </div>
              <span className="text-[12px] font-medium" style={{ color: opt.value === 'light' ? '#18181B' : '#F5F5F5' }}>
                {opt.label}
              </span>
            </button>
          )
        })}
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
        <h1 className="text-[28px] font-semibold text-[var(--aba-text)] tracking-tight mb-1">Settings</h1>
        <p className="text-[14px] text-[var(--aba-text-muted)]">Manage your account and profile information.</p>
      </div>

      <div className="max-w-xl">
        <AppearanceSection />
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
          <div className="rounded-[14px] border border-[var(--aba-border)] bg-[var(--aba-card)] p-6">
            <div className="flex items-center gap-5 mb-6">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--aba-accent-muted-bg)] border border-[var(--aba-accent-muted-border)] flex items-center justify-center">
                  <span className="text-[24px] font-semibold text-[var(--aba-accent-text)]">
                    {user.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
              )}
              <div>
                <h2 className="text-[20px] font-semibold text-[var(--aba-text)]">{user.nombre}</h2>
                <p className="text-[13px] text-[var(--aba-text-muted)]">{user.correo}</p>
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
