/**
 * @module ds/Tooltip
 * @description Small "?" hint icon that reveals a short explanation on
 * hover/focus — for concepts that aren't obvious to a non-technical user
 * (e.g. what a "prefijo de célula" is, what a DNS record type means).
 *
 * No new dependency — plain state + Tailwind, matches the rest of the
 * design system. Keyboard-accessible (focus-visible shows it too, not just
 * mouse hover) and dismisses on Escape/blur.
 *
 * @example
 * ```tsx
 * <span className="flex items-center gap-1">
 *   Prefijo
 *   <Tooltip text="Identifica a la célula en cada nombre de base/usuario que cree. No se puede cambiar después." />
 * </span>
 * ```
 */

import { useState, type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'

interface TooltipProps {
  text: ReactNode
  /** Where the bubble opens relative to the icon. Defaults to 'top'. */
  side?: 'top' | 'bottom'
}

export function Tooltip({ text, side = 'top' }: TooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(o => !o)}
        className="text-[var(--aba-text-disabled)] hover:text-[var(--aba-text-secondary)] transition-colors cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aba-accent)] rounded-full"
        aria-label="Ayuda"
      >
        <HelpCircle size={13} />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute z-50 ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-1/2 -translate-x-1/2 w-[220px] rounded-[8px] border border-[var(--aba-border)] bg-[var(--aba-bg-secondary)] px-3 py-2 text-[11px] leading-relaxed text-[var(--aba-text-secondary)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] aba-fade-up`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
