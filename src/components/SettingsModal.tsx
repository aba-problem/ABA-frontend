/**
 * @module components/SettingsModal
 * @description Settings as a dynamic overlay panel — opened from the sidebar
 * or the topbar avatar without navigating away from the current page (so
 * whatever you were looking at stays mounted behind it).
 *
 * Right-side slide-over with a category rail (Perfil / Apariencia) on the
 * left and the matching content on the right — same idea as Claude.ai's own
 * settings panel. Content itself lives in `SettingsSections.tsx`, shared
 * with the full-page `/dashboard/settings` route so both stay in sync.
 *
 * @see components/SettingsSections.tsx — ProfileSection, AppearanceSection
 * @see pages/dashboard/DashboardLayout.tsx — opens this from sidebar/topbar
 */

import { useEffect, useRef, useState } from 'react'
import { User, Palette, X } from 'lucide-react'
import { AppearanceSection, ProfileSection } from './SettingsSections'

type Tab = 'perfil' | 'apariencia'

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'apariencia', label: 'Apariencia', icon: Palette },
]

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>('perfil')
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-stretch justify-end aba-modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className="w-full max-w-[820px] h-full bg-[var(--aba-bg-secondary)] border-l border-[var(--aba-border)] shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row aba-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-label="Configuración"
      >
        {/* Category rail */}
        <div className="shrink-0 sm:w-[200px] border-b sm:border-b-0 sm:border-r border-[var(--aba-border)] p-3 flex sm:flex-col gap-1">
          <div className="hidden sm:flex items-center justify-between px-2 py-2 mb-1">
            <span className="text-[13px] font-semibold text-[var(--aba-text)]">Configuración</span>
          </div>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium transition-all cursor-pointer ${
                tab === t.id
                  ? 'bg-[var(--aba-accent-muted-bg)] text-[var(--aba-accent-text)] border border-[var(--aba-accent-muted-border)]'
                  : 'text-[var(--aba-text-secondary)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card)] border border-transparent'
              }`}
            >
              <t.icon size={15} className="shrink-0" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--aba-border)] shrink-0">
            <span className="text-[15px] font-semibold text-[var(--aba-text)] sm:hidden">
              {TABS.find(t => t.id === tab)?.label}
            </span>
            <span className="hidden sm:block" />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--aba-text-muted)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card)] transition-all cursor-pointer"
              aria-label="Cerrar configuración"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 max-w-[560px]">
            {tab === 'apariencia' ? <AppearanceSection /> : <ProfileSection onNavigate={onClose} />}
          </div>
        </div>
      </div>
    </div>
  )
}
