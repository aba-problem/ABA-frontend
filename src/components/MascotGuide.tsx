/**
 * @module components/MascotGuide
 * @description Botón flotante de ayuda con la mascota de ABA. Explica, paso a
 * paso, qué hace la vista actual — se muestra automáticamente la primera vez
 * que el usuario entra a cada vista (una vez por vista, vía localStorage) y
 * queda disponible después con el botón flotante, en cualquier momento.
 *
 * Uso: <MascotHelpButton tourId="overview" steps={[{title, body}, ...]} />
 * en cada página que deba tener su propio recorrido.
 */

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import mascotImg from '../assets/mascot.png'

export interface MascotTourStep {
  title: string
  body: string
}

const SEEN_KEY_PREFIX = 'aba_mascot_seen_'

function hasSeenTour(tourId: string): boolean {
  try {
    return localStorage.getItem(SEEN_KEY_PREFIX + tourId) === '1'
  } catch {
    return true // si localStorage no está disponible, no molestar con el tour
  }
}

function markTourSeen(tourId: string) {
  try {
    localStorage.setItem(SEEN_KEY_PREFIX + tourId, '1')
  } catch {
    // almacenamiento no disponible (modo privado, cuota llena, etc.) — no es crítico
  }
}

interface MascotHelpButtonProps {
  /** Clave única de esta vista/recorrido — controla el "visto" por localStorage. */
  tourId: string
  steps: MascotTourStep[]
  /** Si es true (default), se abre solo la primera vez que se visita esta vista. */
  autoShowOnce?: boolean
}

export function MascotHelpButton({ tourId, steps, autoShowOnce = true }: MascotHelpButtonProps) {
  const [open, setOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    setStepIndex(0)
    if (autoShowOnce && !hasSeenTour(tourId)) {
      setOpen(true)
      markTourSeen(tourId)
    } else {
      setOpen(false)
    }
  }, [tourId, autoShowOnce])

  const close = () => setOpen(false)

  if (steps.length === 0) return null

  return (
    <>
      <button
        onClick={() => { setStepIndex(0); setOpen(true) }}
        aria-label="Ayuda de esta sección"
        title="¿Cómo funciona esto?"
        className="fixed bottom-5 right-5 z-[105] w-[52px] h-[52px] rounded-full bg-[#18181B] border border-[#2B2D31] shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex items-center justify-center hover:border-[#3B82F6] hover:bg-[#1C1C1F] transition-all cursor-pointer group p-1.5"
      >
        <img src={mascotImg} alt="" className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-200" />
      </button>

      {open && (
        <MascotTourDialog
          steps={steps}
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          onClose={close}
        />
      )}
    </>
  )
}

function MascotTourDialog({ steps, stepIndex, onStepChange, onClose }: {
  steps: MascotTourStep[]
  stepIndex: number
  onStepChange: (i: number) => void
  onClose: () => void
}) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 aba-modal-backdrop"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="w-full max-w-[420px] rounded-[16px] border border-[#2B2D31] bg-[#111217] shadow-[0_24px_80px_rgba(0,0,0,0.8)] aba-modal-panel overflow-hidden">
        <div className="flex items-start gap-3 p-5 pb-0">
          <img src={mascotImg} alt="Mascota de ABA" className="w-16 h-16 object-contain shrink-0 -mt-1" />
          <div className="flex-1 min-w-0 rounded-[12px] rounded-tl-none bg-[#18181B] border border-[#2B2D31] p-3.5">
            <h3 className="text-[13px] font-semibold text-[#F5F5F5] mb-1">{step.title}</h3>
            <p className="text-[12.5px] text-[#A1A1AA] leading-relaxed">{step.body}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#18181B] transition-all cursor-pointer shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex items-center justify-between px-5 py-4 mt-3">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === stepIndex ? 'bg-[#3B82F6]' : 'bg-[#2B2D31]'}`} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => onStepChange(stepIndex - 1)}
                className="h-8 px-3 rounded-[8px] text-[12px] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#18181B] transition-all cursor-pointer"
              >
                Atrás
              </button>
            )}
            <button
              onClick={() => isLast ? onClose() : onStepChange(stepIndex + 1)}
              className="h-8 px-4 rounded-[8px] bg-[#3B82F6] text-[12px] font-medium text-white hover:bg-[#2563EB] transition-all cursor-pointer"
            >
              {isLast ? 'Entendido' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
