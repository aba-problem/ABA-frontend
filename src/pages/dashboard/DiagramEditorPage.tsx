/**
 * @module pages/dashboard/DiagramEditorPage
 * @description Mini editor de diagramas ER — `/dashboard/diagramador`.
 *
 * Feature 100% client-side (sin dependencia del backend): el usuario crea
 * tablas, columnas y relaciones para planear la estructura de una base de
 * datos antes (o después) de crearla de verdad, y puede descargar el
 * resultado como PNG. No genera SQL real ni toca ningún SP — es solo visual.
 *
 * Alcance deliberadamente acotado (v1): sin undo/redo, sin persistencia en
 * backend (se autoguarda en localStorage), sin zoom — mover/crear/conectar/
 * borrar y exportar es todo lo que hace, a propósito.
 *
 * Arquitectura: tablas como <div> con posición absoluta dentro de un lienzo
 * con position:relative; drag con pointer events nativos actualizando x/y en
 * estado; relaciones dibujadas con un <svg> superpuesto cuyas coordenadas se
 * recalculan en cada render a partir de la posición actual de las tablas.
 * Exportación a PNG vía `html-to-image` recortada al contenido real (no al
 * lienzo completo, que es mucho más grande que lo dibujado).
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { MascotHelpButton } from '../../components/MascotGuide'
import {
  ArrowLeft, Table2, Trash2, KeyRound, X, Download, Plus, Eraser, Network, GripVertical,
} from 'lucide-react'

// ─── Modelo de datos ────────────────────────────────────────────────────────

type TipoColumna = 'INT' | 'VARCHAR' | 'TEXT' | 'DATE' | 'BOOLEAN' | 'DECIMAL'
type TipoRelacion = '1-1' | '1-N' | 'N-N'

interface ColumnaDiagrama {
  id: string
  nombre: string
  tipo: TipoColumna
  esPrimaryKey: boolean
}

interface TablaDiagrama {
  id: string
  nombre: string
  x: number
  y: number
  columnas: ColumnaDiagrama[]
}

interface RelacionDiagrama {
  id: string
  tablaOrigenId: string
  columnaOrigenId: string
  tablaDestinoId: string
  columnaDestinoId: string
  tipo: TipoRelacion
}

interface ConexionEnProgreso {
  tablaId: string
  columnaId: string
  x: number
  y: number
  mouseX: number
  mouseY: number
}

const TIPOS: TipoColumna[] = ['INT', 'VARCHAR', 'TEXT', 'DATE', 'BOOLEAN', 'DECIMAL']
const TIPOS_RELACION: TipoRelacion[] = ['1-1', '1-N', 'N-N']

const TABLE_WIDTH = 210
const HEADER_HEIGHT = 38
const ROW_HEIGHT = 28
const FOOTER_HEIGHT = 26
const CANVAS_WIDTH = 2600
const CANVAS_HEIGHT = 1600
const STORAGE_KEY = 'aba-diagrama-actual'

function generarId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function alturaTabla(t: TablaDiagrama): number {
  return HEADER_HEIGHT + t.columnas.length * ROW_HEIGHT + FOOTER_HEIGHT
}

const DIAGRAMADOR_TOUR = [
  {
    title: 'Diagramá antes de crear',
    body: 'Armá la estructura de tu base — tablas, columnas y relaciones — antes (o después) de aprovisionarla de verdad. Es puramente visual: no genera SQL ni toca ninguna base real.',
  },
  {
    title: 'Conectá arrastrando',
    body: 'Cada columna tiene un puntito a la derecha. Arrastrá desde ahí hasta otra columna (de otra tabla) para crear una relación. Hacé clic en la etiqueta de la línea para cambiar el tipo (1-1, 1-N, N-N), o en la "x" para borrarla.',
  },
  {
    title: 'Se guarda solo, exportá cuando quieras',
    body: 'Tu diagrama se autoguarda en este navegador (no en el servidor) — si cerrás y volvés, seguís donde quedaste. Con "Descargar PNG" te llevás una imagen lista para compartir.',
  },
]

export default function DiagramEditorPage() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLDivElement>(null)

  const [tablas, setTablas] = useState<TablaDiagrama[]>([])
  const [relaciones, setRelaciones] = useState<RelacionDiagrama[]>([])
  const [conectando, setConectandoState] = useState<ConexionEnProgreso | null>(null)
  const [exportando, setExportando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cargado, setCargado] = useState(false)

  const conectandoRef = useRef<ConexionEnProgreso | null>(null)
  const setConectando = useCallback((v: ConexionEnProgreso | null) => {
    conectandoRef.current = v
    setConectandoState(v)
  }, [])

  const dragRef = useRef<{ tablaId: string; offsetX: number; offsetY: number } | null>(null)

  // ─── Carga inicial desde localStorage ────────────────────────────────────
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY)
      if (guardado) {
        const datos = JSON.parse(guardado)
        if (Array.isArray(datos.tablas)) setTablas(datos.tablas)
        if (Array.isArray(datos.relaciones)) setRelaciones(datos.relaciones)
      }
    } catch {
      // localStorage no disponible o datos corruptos — se empieza vacío, no es crítico
    }
    setCargado(true)
  }, [])

  // ─── Autoguardado ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cargado) return // evita pisar lo guardado con el estado inicial vacío antes de cargar
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tablas, relaciones }))
    } catch {
      // cuota llena / modo privado — se pierde el autoguardado, no rompe la edición en curso
    }
  }, [tablas, relaciones, cargado])

  const puntoEnCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  // ─── Tablas ────────────────────────────────────────────────────────────────

  const nuevaTabla = useCallback(() => {
    setTablas(prev => {
      // Grilla (4 por fila) en vez de una diagonal de 36px — con TABLE_WIDTH=210,
      // un offset chico dejaba las tablas nuevas casi tapando a la anterior.
      const col = prev.length % 4
      const fila = Math.floor(prev.length / 4)
      const t: TablaDiagrama = {
        id: generarId(),
        nombre: `Tabla_${prev.length + 1}`,
        x: 60 + col * 260,
        y: 60 + fila * 220,
        columnas: [{ id: generarId(), nombre: 'id', tipo: 'INT', esPrimaryKey: true }],
      }
      return [...prev, t]
    })
  }, [])

  const renombrarTabla = useCallback((tablaId: string, nombre: string) => {
    setTablas(prev => prev.map(t => (t.id === tablaId ? { ...t, nombre } : t)))
  }, [])

  const eliminarTabla = useCallback((tablaId: string) => {
    if (!window.confirm('¿Eliminar esta tabla? También se van a borrar sus relaciones.')) return
    setTablas(prev => prev.filter(t => t.id !== tablaId))
    setRelaciones(prev => prev.filter(r => r.tablaOrigenId !== tablaId && r.tablaDestinoId !== tablaId))
  }, [])

  const limpiarTodo = useCallback(() => {
    setTablas(prev => {
      if (prev.length === 0) return prev
      if (!window.confirm('¿Borrar todo el diagrama? Esta acción no se puede deshacer.')) return prev
      setRelaciones([])
      return []
    })
  }, [])

  // ─── Columnas ──────────────────────────────────────────────────────────────

  const agregarColumna = useCallback((tablaId: string) => {
    setTablas(prev => prev.map(t => (t.id === tablaId
      ? { ...t, columnas: [...t.columnas, { id: generarId(), nombre: `columna_${t.columnas.length + 1}`, tipo: 'VARCHAR', esPrimaryKey: false }] }
      : t)))
  }, [])

  const renombrarColumna = useCallback((tablaId: string, columnaId: string, nombre: string) => {
    setTablas(prev => prev.map(t => (t.id === tablaId
      ? { ...t, columnas: t.columnas.map(c => (c.id === columnaId ? { ...c, nombre } : c)) }
      : t)))
  }, [])

  const cambiarTipoColumna = useCallback((tablaId: string, columnaId: string, tipo: TipoColumna) => {
    setTablas(prev => prev.map(t => (t.id === tablaId
      ? { ...t, columnas: t.columnas.map(c => (c.id === columnaId ? { ...c, tipo } : c)) }
      : t)))
  }, [])

  const togglePk = useCallback((tablaId: string, columnaId: string) => {
    setTablas(prev => prev.map(t => (t.id === tablaId
      ? { ...t, columnas: t.columnas.map(c => (c.id === columnaId ? { ...c, esPrimaryKey: !c.esPrimaryKey } : c)) }
      : t)))
  }, [])

  const eliminarColumna = useCallback((tablaId: string, columnaId: string) => {
    setTablas(prev => prev.map(t => (t.id === tablaId
      ? { ...t, columnas: t.columnas.filter(c => c.id !== columnaId) }
      : t)))
    setRelaciones(prev => prev.filter(r => r.columnaOrigenId !== columnaId && r.columnaDestinoId !== columnaId))
  }, [])

  // ─── Arrastre de tablas ──────────────────────────────────────────────────

  const onArrastrarTabla = useCallback((e: PointerEvent) => {
    const estado = dragRef.current
    if (!estado) return
    const punto = puntoEnCanvas(e.clientX, e.clientY)
    setTablas(prev => prev.map(t => (t.id === estado.tablaId
      ? { ...t, x: Math.max(0, punto.x - estado.offsetX), y: Math.max(0, punto.y - estado.offsetY) }
      : t)))
  }, [puntoEnCanvas])

  const onSoltarTabla = useCallback(() => {
    dragRef.current = null
    window.removeEventListener('pointermove', onArrastrarTabla)
    window.removeEventListener('pointerup', onSoltarTabla)
  }, [onArrastrarTabla])

  const iniciarArrastreTabla = useCallback((e: React.PointerEvent, tabla: TablaDiagrama) => {
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT') return
    e.preventDefault()
    const punto = puntoEnCanvas(e.clientX, e.clientY)
    dragRef.current = { tablaId: tabla.id, offsetX: punto.x - tabla.x, offsetY: punto.y - tabla.y }
    window.addEventListener('pointermove', onArrastrarTabla)
    window.addEventListener('pointerup', onSoltarTabla)
  }, [puntoEnCanvas, onArrastrarTabla, onSoltarTabla])

  // ─── Relaciones ────────────────────────────────────────────────────────────

  function anclaColumna(tabla: TablaDiagrama, indice: number, lado: 'left' | 'right') {
    return {
      x: lado === 'right' ? tabla.x + TABLE_WIDTH : tabla.x,
      y: tabla.y + HEADER_HEIGHT + indice * ROW_HEIGHT + ROW_HEIGHT / 2,
    }
  }

  function datosRelacion(r: RelacionDiagrama) {
    const tablaO = tablas.find(t => t.id === r.tablaOrigenId)
    const tablaD = tablas.find(t => t.id === r.tablaDestinoId)
    if (!tablaO || !tablaD) return null
    const idxO = tablaO.columnas.findIndex(c => c.id === r.columnaOrigenId)
    const idxD = tablaD.columnas.findIndex(c => c.id === r.columnaDestinoId)
    if (idxO === -1 || idxD === -1) return null
    const centroO = tablaO.x + TABLE_WIDTH / 2
    const centroD = tablaD.x + TABLE_WIDTH / 2
    const ladoO: 'left' | 'right' = centroD > centroO ? 'right' : 'left'
    const ladoD: 'left' | 'right' = centroD > centroO ? 'left' : 'right'
    const p1 = anclaColumna(tablaO, idxO, ladoO)
    const p2 = anclaColumna(tablaD, idxD, ladoD)
    return { p1, p2, midX: (p1.x + p2.x) / 2, midY: (p1.y + p2.y) / 2 }
  }

  const onMoverConexion = useCallback((e: PointerEvent) => {
    const punto = puntoEnCanvas(e.clientX, e.clientY)
    setConectando(conectandoRef.current ? { ...conectandoRef.current, mouseX: punto.x, mouseY: punto.y } : null)
  }, [puntoEnCanvas, setConectando])

  const onSoltarConexion = useCallback((e: PointerEvent) => {
    window.removeEventListener('pointermove', onMoverConexion)
    window.removeEventListener('pointerup', onSoltarConexion)

    const origen = conectandoRef.current
    setConectando(null)
    if (!origen) return

    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null
    const fila = el?.closest('[data-tabla-id][data-columna-id]') as HTMLElement | null
    if (!fila) return

    const tablaDestinoId = fila.dataset.tablaId!
    const columnaDestinoId = fila.dataset.columnaId!
    if (tablaDestinoId === origen.tablaId && columnaDestinoId === origen.columnaId) return // no auto-conexión a sí misma

    setRelaciones(prev => {
      const yaExiste = prev.some(r =>
        (r.tablaOrigenId === origen.tablaId && r.columnaOrigenId === origen.columnaId &&
          r.tablaDestinoId === tablaDestinoId && r.columnaDestinoId === columnaDestinoId) ||
        (r.tablaOrigenId === tablaDestinoId && r.columnaOrigenId === columnaDestinoId &&
          r.tablaDestinoId === origen.tablaId && r.columnaDestinoId === origen.columnaId)
      )
      if (yaExiste) return prev
      return [...prev, {
        id: generarId(),
        tablaOrigenId: origen.tablaId,
        columnaOrigenId: origen.columnaId,
        tablaDestinoId,
        columnaDestinoId,
        tipo: '1-N',
      }]
    })
  }, [onMoverConexion, setConectando])

  const iniciarConexion = useCallback((e: React.PointerEvent, tabla: TablaDiagrama, columna: ColumnaDiagrama, indice: number) => {
    e.preventDefault()
    e.stopPropagation()
    const origen = anclaColumna(tabla, indice, 'right')
    setConectando({ tablaId: tabla.id, columnaId: columna.id, x: origen.x, y: origen.y, mouseX: origen.x, mouseY: origen.y })
    window.addEventListener('pointermove', onMoverConexion)
    window.addEventListener('pointerup', onSoltarConexion)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMoverConexion, onSoltarConexion, setConectando])

  const cambiarTipoRelacion = useCallback((relacionId: string) => {
    setRelaciones(prev => prev.map(r => (r.id === relacionId
      ? { ...r, tipo: TIPOS_RELACION[(TIPOS_RELACION.indexOf(r.tipo) + 1) % TIPOS_RELACION.length] }
      : r)))
  }, [])

  const eliminarRelacion = useCallback((relacionId: string) => {
    setRelaciones(prev => prev.filter(r => r.id !== relacionId))
  }, [])

  // ─── Exportar PNG ────────────────────────────────────────────────────────

  const descargarComoPng = useCallback(async () => {
    if (!canvasRef.current || tablas.length === 0) return
    setError(null)
    setExportando(true)
    try {
      const PAD = 40
      const minX = Math.max(0, Math.min(...tablas.map(t => t.x)) - PAD)
      const minY = Math.max(0, Math.min(...tablas.map(t => t.y)) - PAD)
      const maxX = Math.max(...tablas.map(t => t.x + TABLE_WIDTH)) + PAD
      const maxY = Math.max(...tablas.map(t => t.y + alturaTabla(t))) + PAD

      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#09090B',
        pixelRatio: 2,
        width: maxX - minX,
        height: maxY - minY,
        style: { transform: `translate(${-minX}px, ${-minY}px)`, transformOrigin: 'top left' },
      })
      const link = document.createElement('a')
      link.download = `diagrama-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } catch {
      setError('No se pudo generar la imagen. Intenta de nuevo.')
    } finally {
      setExportando(false)
    }
  }, [tablas])

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#F5F5F5] transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        Volver
      </button>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-[10px] bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
            <Network size={18} className="text-[#3B82F6]" />
          </div>
          <div>
            <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">Diagramador</h1>
            <p className="text-[13px] text-[#71717A]">Planeá la estructura de tu base con tablas y relaciones, sin escribir SQL.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={nuevaTabla} icon={<Plus size={13} />} label="Nueva tabla" primary />
          <Button onClick={limpiarTodo} icon={<Eraser size={13} />} label="Limpiar todo" />
          <Button onClick={descargarComoPng} icon={<Download size={13} />} label="Descargar PNG" loading={exportando} disabled={tablas.length === 0} />
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-3">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      <div className="relative rounded-[14px] border border-[#2B2D31] overflow-hidden">
        <div className="h-[620px] overflow-auto bg-[#09090B]">
          <div
            ref={canvasRef}
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            className="relative"
          >
            <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 pointer-events-none">
              <defs>
                <marker id="aba-diagrama-flecha" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
                </marker>
              </defs>
              {relaciones.map(r => {
                const datos = datosRelacion(r)
                if (!datos) return null
                const { p1, p2 } = datos
                const midX = (p1.x + p2.x) / 2
                return (
                  <path
                    key={r.id}
                    d={`M ${p1.x} ${p1.y} C ${midX} ${p1.y}, ${midX} ${p2.y}, ${p2.x} ${p2.y}`}
                    stroke="#3B82F6"
                    strokeWidth={1.5}
                    fill="none"
                    markerEnd="url(#aba-diagrama-flecha)"
                  />
                )
              })}
              {conectando && (
                <line
                  x1={conectando.x} y1={conectando.y}
                  x2={conectando.mouseX} y2={conectando.mouseY}
                  stroke="#3B82F6" strokeWidth={1.5} strokeDasharray="4 3"
                />
              )}
            </svg>

            {relaciones.map(r => {
              const datos = datosRelacion(r)
              if (!datos) return null
              return (
                <div
                  key={r.id}
                  style={{ left: datos.midX, top: datos.midY }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 h-5 rounded-full bg-[#111217] border border-[#2B2D31] text-[10px] font-mono text-[#71717A] hover:border-[#3B82F6] hover:text-[#F5F5F5] transition-all cursor-pointer"
                  onClick={() => cambiarTipoRelacion(r.id)}
                  title="Clic para cambiar el tipo de relación"
                >
                  {r.tipo}
                  <button
                    onClick={e => { e.stopPropagation(); eliminarRelacion(r.id) }}
                    className="hover:text-[#EF4444]"
                    title="Eliminar relación"
                  >
                    <X size={9} />
                  </button>
                </div>
              )
            })}

            {tablas.map(tabla => (
              <TablaBox
                key={tabla.id}
                tabla={tabla}
                onDragStart={iniciarArrastreTabla}
                onRename={renombrarTabla}
                onDelete={eliminarTabla}
                onAddColumn={agregarColumna}
                onRenameColumn={renombrarColumna}
                onChangeTipo={cambiarTipoColumna}
                onTogglePk={togglePk}
                onDeleteColumn={eliminarColumna}
                onStartConnection={iniciarConexion}
              />
            ))}
          </div>
        </div>

        {tablas.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Table2 size={24} className="text-[#3F3F46] mx-auto mb-3" />
              <p className="text-[14px] text-[#71717A]">Todavía no hay ninguna tabla.</p>
              <p className="text-[12px] text-[#52525B] mt-1">Usá &quot;Nueva tabla&quot; para empezar a diagramar.</p>
            </div>
          </div>
        )}
      </div>

      <MascotHelpButton tourId="diagramador" steps={DIAGRAMADOR_TOUR} />
    </div>
  )
}

// ─── Botón de la barra de herramientas ──────────────────────────────────────

function Button({ onClick, icon, label, primary, loading, disabled }: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  primary?: boolean
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-[13px] font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        primary
          ? 'bg-[#3B82F6] text-white hover:bg-[#2563EB]'
          : 'border border-[#2B2D31] bg-[#18181B] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1F]'
      }`}
    >
      {loading ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full aba-spin" /> : icon}
      {label}
    </button>
  )
}

// ─── Caja de tabla ──────────────────────────────────────────────────────────

function TablaBox({
  tabla, onDragStart, onRename, onDelete, onAddColumn, onRenameColumn, onChangeTipo, onTogglePk, onDeleteColumn, onStartConnection,
}: {
  tabla: TablaDiagrama
  onDragStart: (e: React.PointerEvent, tabla: TablaDiagrama) => void
  onRename: (tablaId: string, nombre: string) => void
  onDelete: (tablaId: string) => void
  onAddColumn: (tablaId: string) => void
  onRenameColumn: (tablaId: string, columnaId: string, nombre: string) => void
  onChangeTipo: (tablaId: string, columnaId: string, tipo: TipoColumna) => void
  onTogglePk: (tablaId: string, columnaId: string) => void
  onDeleteColumn: (tablaId: string, columnaId: string) => void
  onStartConnection: (e: React.PointerEvent, tabla: TablaDiagrama, columna: ColumnaDiagrama, indice: number) => void
}) {
  return (
    <div
      style={{ left: tabla.x, top: tabla.y, width: TABLE_WIDTH }}
      className="absolute rounded-[10px] border border-[#2B2D31] bg-[#18181B] shadow-[0_8px_24px_rgba(0,0,0,0.4)] select-none"
    >
      <div
        onPointerDown={e => onDragStart(e, tabla)}
        style={{ height: HEADER_HEIGHT }}
        className="flex items-center gap-1.5 px-1.5 rounded-t-[10px] bg-[#1C1C1F] border-b border-[#2B2D31] cursor-move"
      >
        {/* Handle dedicado: el input de nombre ocupa casi todo el header (flex-1), así
            que sin esto casi no queda superficie de header "vacía" para agarrar y arrastrar. */}
        <div className="w-5 h-5 flex items-center justify-center text-[#52525B] shrink-0 cursor-grab">
          <GripVertical size={13} />
        </div>
        <Table2 size={13} className="text-[#3B82F6] shrink-0" />
        <input
          value={tabla.nombre}
          onChange={e => onRename(tabla.id, e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-[#F5F5F5] outline-none"
        />
        <button
          onClick={() => onDelete(tabla.id)}
          className="w-5 h-5 rounded-[4px] flex items-center justify-center text-[#52525B] hover:text-[#EF4444] hover:bg-[#2A1010] transition-all cursor-pointer shrink-0"
          title="Eliminar tabla"
        >
          <Trash2 size={11} />
        </button>
      </div>

      <div>
        {tabla.columnas.map((c, i) => (
          <div
            key={c.id}
            data-tabla-id={tabla.id}
            data-columna-id={c.id}
            style={{ height: ROW_HEIGHT }}
            className="flex items-center gap-1 px-2 border-b border-[#2B2D31] last:border-0 text-[11px]"
          >
            <button
              onClick={() => onTogglePk(tabla.id, c.id)}
              title="Primary key"
              className={`shrink-0 cursor-pointer ${c.esPrimaryKey ? 'text-[#EAB308]' : 'text-[#3F3F46] hover:text-[#71717A]'}`}
            >
              <KeyRound size={11} />
            </button>
            <input
              value={c.nombre}
              onChange={e => onRenameColumn(tabla.id, c.id, e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-[#A1A1AA] outline-none font-mono"
            />
            <select
              value={c.tipo}
              onChange={e => onChangeTipo(tabla.id, c.id, e.target.value as TipoColumna)}
              className="bg-transparent text-[#52525B] outline-none text-[9.5px] cursor-pointer shrink-0"
            >
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={() => onDeleteColumn(tabla.id, c.id)}
              className="shrink-0 text-[#3F3F46] hover:text-[#EF4444] cursor-pointer"
              title="Eliminar columna"
            >
              <X size={10} />
            </button>
            <div
              onPointerDown={e => onStartConnection(e, tabla, c, i)}
              className="w-3 h-3 rounded-full border border-[#3B82F6] bg-[#18181B] hover:bg-[#3B82F6] cursor-crosshair shrink-0"
              title="Arrastrá para conectar con otra columna"
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => onAddColumn(tabla.id)}
        style={{ height: FOOTER_HEIGHT }}
        className="w-full text-[11px] text-[#3B82F6] hover:bg-[#1E2D4A]/40 rounded-b-[10px] cursor-pointer transition-colors"
      >
        + columna
      </button>
    </div>
  )
}
