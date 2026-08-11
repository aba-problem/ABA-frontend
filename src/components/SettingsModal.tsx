/**
 * @module components/SettingsModal
 * @description Settings as a centered floating dialog (category rail on the
 * left, content on the right — same layout family as Claude.ai's own
 * settings panel), opened from the sidebar or the topbar avatar without
 * navigating away from the current page.
 *
 * 2026-08-11: switched from a right-anchored full-height slide-over to a
 * centered dialog with visible backdrop on all sides, per explicit design
 * feedback ("quiero las settings así; no al lado"). Also absorbed session
 * history as a third tab (moved out of the sidebar).
 *
 * Content lives in `SettingsSections.tsx` / `SesionesSection.tsx`, shared
 * with their standalone full-page routes so nothing drifts out of sync.
 *
 * @see components/SettingsSections.tsx — ProfileSection, AppearanceSection
 * @see components/SesionesSection.tsx — Registros de sesión tab
 * @see pages/dashboard/DashboardLayout.tsx — opens this from sidebar/topbar
 */

import { useEffect, useRef, useState } from 'react'
import { User, Palette, History, X } from 'lucide-react'
import { AppearanceSection, ProfileSection } from './SettingsSections'
import { SesionesSection } from './SesionesSection'

type Tab = 'perfil' | 'apariencia' | 'sesiones'

const TABS: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'apariencia', label: 'Apariencia', icon: Palette },
  { id: 'sesiones', label: 'Registros de sesión', icon: History },
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 aba-modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div
        className="w-full max-w-[880px] h-full max-h-[640px] rounded-[16px] bg-[var(--aba-bg-secondary)] border border-[var(--aba-border)] shadow-[0_24px_80px_rgba(0,0,0,0.8)] flex flex-col sm:flex-row overflow-hidden aba-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Configuración"
      >
        {/* Category rail */}
        <div className="shrink-0 sm:w-[220px] border-b sm:border-b-0 sm:border-r border-[var(--aba-border)] p-3 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-visible">
          <div className="hidden sm:flex items-center px-2 py-2 mb-1">
            <span className="text-[13px] font-semibold text-[var(--aba-text)]">Configuración</span>
          </div>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium transition-all cursor-pointer whitespace-nowrap ${
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
          <div className="flex items-center justify-end px-5 h-12 border-b border-[var(--aba-border)] shrink-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-[8px] flex items-center justify-center text-[var(--aba-text-muted)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card)] transition-all cursor-pointer"
              aria-label="Cerrar configuración"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-[560px]">
              {tab === 'apariencia' ? <AppearanceSection /> : tab === 'sesiones' ? <SesionesSection /> : <ProfileSection />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
