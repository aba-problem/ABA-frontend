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

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme, THEME_OPTIONS } from '../contexts/ThemeContext'
import { getProfile, actualizarPerfil } from '../api/dashboard'
import { guardarAvatarLocal, borrarAvatarLocal, AVATAR_MAX_BYTES, AVATAR_TIPOS_PERMITIDOS } from '../lib/avatarStore'
import { useAvatarLocal } from '../hooks/useAvatarLocal'
import { SkeletonCard } from '../ds/Skeleton'
import { Button } from '../ds/Button'
import { User, Mail, Shield, Calendar, Clock, Check, Palette, Pencil, X, ImagePlus, Trash2 } from 'lucide-react'

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
  const [guardando, setGuardando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)

  const [arrastrando, setArrastrando] = useState(false)
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Foto local (IndexedDB, nunca pasó por el backend) — el hook se re-sincroniza
  // solo cuando guardarAvatarLocal/borrarAvatarLocal disparan su evento de cambio.
  const avatarLocalUrl = useAvatarLocal(user?.usuarioId)

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
    // La foto ya no viaja al backend — vive solo en este navegador (IndexedDB).
    const result = await actualizarPerfil(nombre, null)
    setGuardando(false)
    if (result.ok) {
      setUser(result.data)
      setEditando(false)
    } else {
      setErrorGuardar(result.error.error)
    }
  }

  const procesarArchivoFoto = async (file: File) => {
    if (!user) return
    if (!AVATAR_TIPOS_PERMITIDOS.includes(file.type)) {
      setErrorGuardar('Formato no soportado — usá PNG, JPG, WEBP o GIF.')
      return
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setErrorGuardar('La imagen pesa demasiado — máximo 5 MB.')
      return
    }
    setSubiendoFoto(true)
    setErrorGuardar(null)
    try {
      await guardarAvatarLocal(user.usuarioId, file)
    } catch {
      setErrorGuardar('No se pudo guardar la foto en este navegador.')
    } finally {
      setSubiendoFoto(false)
    }
  }

  const quitarFoto = async () => {
    if (!user) return
    await borrarAvatarLocal(user.usuarioId).catch(() => {})
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    const file = e.dataTransfer.files?.[0]
    if (file) procesarArchivoFoto(file)
  }

  const onSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) procesarArchivoFoto(file)
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

  const fotoActual = avatarLocalUrl ?? user.avatarUrl

  return (
    <div className="space-y-6">
      <div className="rounded-[14px] border border-[var(--aba-border)] bg-[var(--aba-card)] p-6">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-5 min-w-0">
            {fotoActual ? (
              <img src={fotoActual} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
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
          <div className="space-y-5">
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
              <label className="block text-[12px] text-[var(--aba-text-disabled)] mb-1.5">Foto de perfil</label>
              <div
                onDragOver={e => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-[10px] border-2 border-dashed p-4 flex items-center gap-3 cursor-pointer transition-all ${
                  arrastrando ? 'border-[#3B82F6] bg-[#1E2D4A]/30' : 'border-[var(--aba-border)] hover:border-[var(--aba-text-muted)]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={AVATAR_TIPOS_PERMITIDOS.join(',')}
                  onChange={onSeleccionarArchivo}
                  className="hidden"
                />
                <div className="w-9 h-9 rounded-[8px] bg-[var(--aba-accent-muted-bg)] border border-[var(--aba-accent-muted-border)] flex items-center justify-center shrink-0">
                  {subiendoFoto
                    ? <div className="w-4 h-4 border-2 border-[#3B82F6] border-t-transparent rounded-full aba-spin" />
                    : <ImagePlus size={16} className="text-[var(--aba-accent-text)]" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--aba-text)]">Arrastrá una imagen acá, o hacé clic para elegirla</p>
                  <p className="text-[11px] text-[var(--aba-text-disabled)] mt-0.5">PNG, JPG, WEBP o GIF · máx 5 MB · solo en este navegador, nunca se sube a ningún servidor</p>
                </div>
              </div>
              {avatarLocalUrl && (
                <button
                  type="button"
                  onClick={quitarFoto}
                  className="mt-2 flex items-center gap-1.5 text-[12px] text-[#F87171] hover:text-[#FCA5A5] transition-colors cursor-pointer"
                >
                  <Trash2 size={12} />
                  Quitar foto local
                </button>
              )}
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
