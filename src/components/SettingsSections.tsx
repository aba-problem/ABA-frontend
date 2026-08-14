/**
 * @module components/SettingsSections
 * @description Shared settings content — used by both the full-page
 * `/dashboard/settings` route and the `SettingsModal` overlay, so the two
 * never drift apart.
 *
 * - {@link ProfileSection} — fetches and displays the user's profile, plus a
 *   link to the session/access history view.
 * - {@link AppearanceSection} — theme picker (reads/writes `ThemeContext`).
 *
 * @see pages/dashboard/SettingsPage.tsx — full-page version
 * @see components/SettingsModal.tsx — overlay version
 */

import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme, THEME_OPTIONS } from '../contexts/ThemeContext'
import { getProfile, actualizarPerfil } from '../api/dashboard'
import { SkeletonCard } from '../ds/Skeleton'
import { Button } from '../ds/Button'
import { User, Mail, Shield, Calendar, Clock, Check, Palette, Pencil, X, RotateCcw } from 'lucide-react'

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
export function AppearanceSection() {
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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
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
              <span className="text-[12px] font-medium" style={{ color: opt.value.startsWith('light') ? '#18181B' : '#F5F5F5' }}>
                {opt.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Profile section — fetches, displays, and lets the user edit their identity. */
export function ProfileSection() {
  const { user, setUser } = useAuth()
  const [loading, setLoading] = useState(!user)
  const [error, setError] = useState<string | null>(null)

  const [editando, setEditando] = useState(false)
  const [nombreForm, setNombreForm] = useState('')
  const [avatarForm, setAvatarForm] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

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

  const empezarEdicion = () => {
    if (!user) return
    setNombreForm(user.nombre)
    setAvatarForm(user.avatarUrl ?? '')
    setErrorGuardar(null)
    setEditando(true)
  }

  const cancelarEdicion = () => {
    setEditando(false)
    setErrorGuardar(null)
  }

  const guardarPerfil = async () => {
    const nombre = nombreForm.trim()
    if (!nombre) {
      setErrorGuardar('El nombre no puede estar vacío.')
      return
    }
    setGuardando(true)
    setErrorGuardar(null)
    const result = await actualizarPerfil(nombre, avatarForm.trim() || null)
    setGuardando(false)
    if (result.ok) {
      setUser(result.data)
      setEditando(false)
    } else {
      setErrorGuardar(result.error.error)
    }
  }

  if (loading) return <SkeletonCard />
  if (error) {
    return (
      <div className="rounded-[14px] border border-[#7F1D1D] bg-[#2A1010] p-5">
        <p className="text-[14px] text-[#F87171]">{error}</p>
      </div>
    )
  }
  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-[var(--aba-border)] bg-[var(--aba-card)] p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-5 min-w-0">
            {(editando ? avatarForm : user.avatarUrl) ? (
              <img src={editando ? avatarForm : user.avatarUrl!} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" onError={e => { e.currentTarget.style.display = 'none' }} />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[var(--aba-accent-muted-bg)] border border-[var(--aba-accent-muted-border)] flex items-center justify-center shrink-0">
                <span className="text-[24px] font-semibold text-[var(--aba-accent-text)]">
                  {(editando ? nombreForm : user.nombre)?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            {!editando && (
              <div className="min-w-0">
                <h2 className="text-[20px] font-semibold text-[var(--aba-text)] truncate">{user.nombre}</h2>
                <p className="text-[13px] text-[var(--aba-text-muted)] truncate">{user.correo}</p>
              </div>
            )}
          </div>
          {!editando && (
            <Button variant="secondary" size="sm" iconLeft={<Pencil size={13} />} onClick={empezarEdicion}>
              Editar
            </Button>
          )}
        </div>

        {editando ? (
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] text-[var(--aba-text-disabled)] mb-1.5">Nombre</label>
              <input
                type="text"
                value={nombreForm}
                onChange={e => setNombreForm(e.target.value)}
                maxLength={150}
                className="w-full h-9 px-3 rounded-[10px] border border-[var(--aba-border)] bg-[var(--aba-bg)] text-[14px] text-[var(--aba-text)] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[var(--aba-text-disabled)] mb-1.5">URL de foto de perfil</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={avatarForm}
                  onChange={e => setAvatarForm(e.target.value)}
                  placeholder="https://..."
                  maxLength={500}
                  className="flex-1 min-w-0 h-9 px-3 rounded-[10px] border border-[var(--aba-border)] bg-[var(--aba-bg)] text-[13px] font-mono text-[var(--aba-text)] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/30 transition-all"
                />
                {avatarForm && (
                  <button
                    type="button"
                    onClick={() => setAvatarForm('')}
                    title="Volver a usar la foto de Google/GitHub"
                    className="w-9 h-9 rounded-[10px] border border-[var(--aba-border)] flex items-center justify-center text-[var(--aba-text-muted)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card-hover)] transition-all cursor-pointer shrink-0"
                  >
                    <RotateCcw size={13} />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--aba-text-disabled)] mt-1.5">
                Pegá el link a una imagen. Dejalo vacío para volver a usar tu foto de {user.proveedor === 'GOOGLE' ? 'Google' : 'GitHub'}.
              </p>
            </div>

            {errorGuardar && <p className="text-[12px] text-[#F87171]">{errorGuardar}</p>}

            <div className="flex items-center gap-2 pt-1">
              <Button variant="primary" size="sm" loading={guardando} onClick={guardarPerfil}>
                Guardar cambios
              </Button>
              <Button variant="ghost" size="sm" iconLeft={<X size={13} />} onClick={cancelarEdicion} disabled={guardando}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ProfileRow icon={User} label="Name" value={user.nombre} color="#3B82F6" />
            <ProfileRow icon={Mail} label="Email" value={user.correo} color="#22C55E" />
            <ProfileRow icon={Shield} label="Provider" value={user.proveedor} color="#A855F7" />
            <ProfileRow icon={Calendar} label="Account created" value={formatDate(user.fechaCreacion)} color="#EAB308" />
            <ProfileRow icon={Clock} label="Last login" value={formatDate(user.ultimoLogin)} color="#F97316" />
          </>
        )}
      </div>
    </div>
  )
}
