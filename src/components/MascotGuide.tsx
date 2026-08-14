/**
 * @module components/MascotGuide
 * @description Tour guiado tipo "spotlight" con la mascota de ABA. A pedido
 * explícito: NO es un diálogo flotando encima de todo — recorre elemento por
 * elemento REAL de la pantalla, uno a la vez, oscureciendo el resto y
 * dibujando un aro de color alrededor de la opción que está explicando. El
 * color del aro cambia según el tipo de acción (eliminar = rojo, editar =
 * azul, crear = verde, estado/indicador = ámbar, informativo = violeta) para
 * que de un vistazo se entienda qué tan "peligrosa" es cada cosa.
 *
 * Se muestra automáticamente la primera vez que el usuario entra a cada
 * vista (una vez por vista, vía localStorage) y queda disponible después con
 * el botón flotante de la mascota, en cualquier momento.
 *
 * Cada paso apunta a un elemento real vía `data-tour="<id>"` en el DOM — si
 * ese elemento no existe en el estado actual de la página (p. ej. un botón
 * que solo aparece en modo edición), el paso se salta solo en vez de romper
 * el tour.
 *
 * Uso: <MascotHelpButton tourId="overview" steps={[{title, body, selector, tipo}, ...]} />
 */

import { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { X } from 'lucide-react'
import mascotImg from '../assets/mascot.png'

export type MascotTourTipo = 'eliminar' | 'editar' | 'crear' | 'estado' | 'info'

export interface MascotTourStep {
  title: string
  body: string
  /** Selector CSS del elemento real a resaltar (`data-tour="..."` en el DOM). Si no
   *  se encuentra (o se omite), el paso se muestra centrado, sin recorte de foco. */
  selector?: string
  /** Colorea el aro de foco según qué tan sensible es la acción. Default: 'info'. */
  tipo?: MascotTourTipo
}

const COLOR_TIPO: Record<MascotTourTipo, string> = {
  eliminar: '#EF4444',
  editar: '#3B82F6',
  crear: '#22C55E',
  estado: '#EAB308',
  info: '#A855F7',
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
      // Pequeño delay: le da tiempo al resto de la vista a terminar de montar/pintar
      // sus datos (listas cargadas, etc.) antes de buscar los elementos del tour.
      const t = setTimeout(() => {
        setOpen(true)
        markTourSeen(tourId)
      }, 400)
      return () => clearTimeout(t)
    }
    setOpen(false)
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
        <MascotSpotlightTour
          steps={steps}
          stepIndex={stepIndex}
          onStepChange={setStepIndex}
          onClose={close}
        />
      )}
    </>
  )
}

interface Rect { top: number; left: number; width: number; height: number }

function medirElemento(selector?: string): Rect | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null // elemento oculto (display:none, etc.)
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function MascotSpotlightTour({ steps, stepIndex, onStepChange, onClose }: {
  steps: MascotTourStep[]
  stepIndex: number
  onStepChange: (i: number) => void
  onClose: () => void
}) {
  const step = steps[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1
  const color = COLOR_TIPO[step.tipo ?? 'info']

  const [rect, setRect] = useState<Rect | null>(null)

  const recalcular = useCallback(() => {
    setRect(medirElemento(step.selector))
  }, [step.selector])

  useLayoutEffect(() => {
    recalcular()
  }, [recalcular])

  useEffect(() => {
    window.addEventListener('resize', recalcular)
    window.addEventListener('scroll', recalcular, true)
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && !isLast) onStepChange(stepIndex + 1)
      if (e.key === 'ArrowLeft' && !isFirst) onStepChange(stepIndex - 1)
    }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('resize', recalcular)
      window.removeEventListener('scroll', recalcular, true)
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [recalcular, onClose, onStepChange, stepIndex, isFirst, isLast])

  // Si el elemento apuntado no existe en el estado actual de la vista (p. ej. un
  // botón que solo aparece al editar), el paso se salta solo en vez de mostrar un
  // resaltado roto en (0,0) o bloquear el tour.
  useEffect(() => {
    if (step.selector && !rect) {
      if (isLast) { onClose(); return }
      const t = setTimeout(() => onStepChange(stepIndex + 1), 0)
      return () => clearTimeout(t)
    }
  }, [step.selector, rect, isLast, onClose, onStepChange, stepIndex])

  if (step.selector && !rect) return null // paso transitorio, se salta en el efecto de arriba

  const PADDING = 6
  const posicion = calcularPosicionTooltip(rect)

  return (
    <>
      {/* Capa que bloquea interacción con el resto de la página durante el tour. */}
      <div className="fixed inset-0 z-[200]" onClick={e => e.stopPropagation()} />

      {/* Recorte de foco — box-shadow gigante oscurece todo salvo el elemento. */}
      {rect && (
        <div
          style={{
            position: 'fixed',
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            borderRadius: 10,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 2px ${color}, 0 0 16px ${color}80`,
            pointerEvents: 'none',
            zIndex: 201,
            transition: 'top 0.2s ease, left 0.2s ease, width 0.2s ease, height 0.2s ease',
          }}
        />
      )}
      {!rect && (
        <div className="fixed inset-0 z-[201]" style={{ backgroundColor: 'rgba(0,0,0,0.78)' }} />
      )}

      {/* Tarjeta con la mascota + explicación del paso actual. */}
      <div
        style={{ top: posicion.top, left: posicion.left, borderColor: color }}
        className="fixed z-[202] w-[340px] max-w-[calc(100vw-32px)] rounded-[16px] border bg-[#111217] shadow-[0_24px_80px_rgba(0,0,0,0.8)] overflow-hidden aba-modal-panel"
      >
        <div className="flex items-start gap-3 p-4 pb-0">
          <img src={mascotImg} alt="Mascota de ABA" className="w-12 h-12 object-contain shrink-0 -mt-1" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <h3 className="text-[13px] font-semibold text-[#F5F5F5]">{step.title}</h3>
            </div>
            <p className="text-[12px] text-[#A1A1AA] leading-relaxed">{step.body}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="w-6 h-6 rounded-[6px] flex items-center justify-center text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#18181B] transition-all cursor-pointer shrink-0"
          >
            <X size={13} />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3 mt-2">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full transition-colors" style={{ backgroundColor: i === stepIndex ? color : '#2B2D31' }} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={() => onStepChange(stepIndex - 1)}
                className="h-7 px-2.5 rounded-[8px] text-[11.5px] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#18181B] transition-all cursor-pointer"
              >
                Atrás
              </button>
            )}
            <button
              onClick={() => isLast ? onClose() : onStepChange(stepIndex + 1)}
              style={{ backgroundColor: color }}
              className="h-7 px-3 rounded-[8px] text-[11.5px] font-medium text-white hover:opacity-90 transition-all cursor-pointer"
            >
              {isLast ? 'Entendido' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/** Ubica la tarjeta cerca del elemento resaltado, con margen de 12px, prefiriendo
 *  abajo — si no entra, arriba — y siempre clampeada dentro del viewport. */
function calcularPosicionTooltip(rect: Rect | null): { top: number; left: number } {
  const TOOLTIP_W = 340
  const TOOLTIP_H_EST = 170
  const GAP = 12
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (!rect) {
    return { top: Math.max(16, vh / 2 - TOOLTIP_H_EST / 2), left: Math.max(16, vw / 2 - TOOLTIP_W / 2) }
  }

  let top = rect.top + rect.height + GAP
  if (top + TOOLTIP_H_EST > vh - 16) {
    const arriba = rect.top - TOOLTIP_H_EST - GAP
    top = arriba > 16 ? arriba : Math.max(16, vh - TOOLTIP_H_EST - 16)
  }

  let left = rect.left
  if (left + TOOLTIP_W > vw - 16) left = vw - TOOLTIP_W - 16
  if (left < 16) left = 16

  return { top, left }
}
