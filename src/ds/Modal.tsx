/**
 * @module ds/Modal
 * @description ABA Design System modal dialog component.
 *
 * A controlled modal with:
 * - Backdrop blur overlay (click to close)
 * - Escape key to close
 * - Body scroll lock when open
 * - Title bar with close button
 * - Smooth enter/exit animations (`aba-modal-backdrop`, `aba-modal-panel`)
 * - Responsive width (configurable via `width` prop)
 *
 * Uses the `aba-modal-backdrop` and `aba-modal-panel` CSS classes
 * for entrance animations defined in `index.css`.
 *
 * @example
 * ```tsx
 * <Modal
 *   open={showModal}
 *   onClose={() => setShowModal(false)}
 *   title="Confirm action"
 * >
 *   <p>Are you sure?</p>
 * </Modal>
 * ```
 *
 * @see index.css — Modal animation keyframes
 * @see pages/dashboard/NewDatabasePage.tsx — Usage example
 */

import { useRef, useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Props for the Modal component. */
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, children, width = 'max-w-[480px]' }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 aba-modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className={`w-full ${width} rounded-[16px] border border-[#2B2D31] bg-[#111217] shadow-[0_24px_80px_rgba(0,0,0,0.8)] aba-modal-panel`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2B2D31]">
          <h2 className="text-[16px] font-semibold text-[#F5F5F5]">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#18181B] transition-all cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
