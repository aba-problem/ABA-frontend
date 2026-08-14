/**
 * @module pages/dashboard/DiagramEditorPage
 * @description Mini editor de diagramas ER — `/dashboard/diagramador`.
 *
 * Feature 100% client-side (sin dependencia del backend): el usuario crea
 * tablas, columnas y relaciones para planear la estructura de una base de
 * datos antes (o después) de crearla de verdad, y puede descargar el
 * resultado como PNG o como script de creación (MySQL, SQL Server o
 * MongoDB). El script es best-effort para revisar antes de ejecutar — no
 * se corre ni se manda a ningún SP, es texto generado en el navegador.
 *
 * Alcance deliberadamente acotado (v1): sin undo/redo, sin persistencia en
 * backend (se autoguarda en localStorage) — mover/crear/conectar/borrar/
 * redimensionar/exportar-SQL/importar-JSON es todo lo que hace, a propósito.
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
import { toBlob } from 'html-to-image'
import { MascotHelpButton } from '../../components/MascotGuide'
import { Badge } from '../../ds/Badge'
import {
  ArrowLeft, Table2, Trash2, KeyRound, Link2, X, Download, Upload, Plus, Eraser, Network, GripVertical, FileCode2,
} from 'lucide-react'

// ─── Modelo de datos ────────────────────────────────────────────────────────

type TipoColumna =
  | 'INT' | 'BIGINT' | 'SMALLINT' | 'VARCHAR' | 'CHAR' | 'TEXT'
  | 'DATE' | 'DATETIME' | 'TIMESTAMP' | 'TIME'
  | 'BOOLEAN' | 'DECIMAL' | 'FLOAT' | 'JSON' | 'UUID' | 'BLOB'
type TipoRelacion = '1-1' | '1-N' | 'N-N'
type MotorExportSql = 'mysql' | 'sqlserver' | 'mongo'

interface ColumnaDiagrama {
  id: string
  nombre: string
  tipo: TipoColumna
  esPrimaryKey: boolean
  esForeignKey: boolean
}

interface TablaDiagrama {
  id: string
  nombre: string
  x: number
  y: number
  ancho: number
  color: string
  columnas: ColumnaDiagrama[]
}

interface TablaDiagramaJson {
  id?: string
  nombre?: string
  x?: number
  y?: number
  ancho?: number
  color?: string
  columnas?: { id?: string; nombre?: string; tipo?: string; esPrimaryKey?: boolean; esForeignKey?: boolean }[]
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

const TIPOS: TipoColumna[] = [
  'INT', 'BIGINT', 'SMALLINT', 'VARCHAR', 'CHAR', 'TEXT',
  'DATE', 'DATETIME', 'TIMESTAMP', 'TIME',
  'BOOLEAN', 'DECIMAL', 'FLOAT', 'JSON', 'UUID', 'BLOB',
]
const TIPOS_RELACION: TipoRelacion[] = ['1-1', '1-N', 'N-N']

// Paleta curada (no un hue 100% aleatorio) — así el color siempre queda legible
// sobre el fondo oscuro, en vez de arriesgarse a un tono apagado o ilegible.
const PALETA_COLORES = [
  '#3B82F6', '#22C55E', '#A855F7', '#EAB308', '#EF4444', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4', '#F43F5E',
]

function colorAleatorio(): string {
  return PALETA_COLORES[Math.floor(Math.random() * PALETA_COLORES.length)]
}

// ─── Generación de scripts SQL / Mongo (best-effort) ────────────────────────
// Traduce el modelo visual a un script de creación real. No es un motor SQL
// completo: usa longitudes/precisión por defecto razonables y asume que el
// usuario va a revisar el resultado antes de ejecutarlo — el diagrama no
// valida cosas como nombres reservados o límites reales del motor destino.

const TIPO_MYSQL: Record<TipoColumna, string> = {
  INT: 'INT', BIGINT: 'BIGINT', SMALLINT: 'SMALLINT',
  VARCHAR: 'VARCHAR(255)', CHAR: 'CHAR(10)', TEXT: 'TEXT',
  DATE: 'DATE', DATETIME: 'DATETIME', TIMESTAMP: 'TIMESTAMP', TIME: 'TIME',
  BOOLEAN: 'BOOLEAN', DECIMAL: 'DECIMAL(10,2)', FLOAT: 'FLOAT',
  JSON: 'JSON', UUID: 'CHAR(36)', BLOB: 'BLOB',
}

const TIPO_SQLSERVER: Record<TipoColumna, string> = {
  INT: 'INT', BIGINT: 'BIGINT', SMALLINT: 'SMALLINT',
  VARCHAR: 'NVARCHAR(255)', CHAR: 'NCHAR(10)', TEXT: 'NVARCHAR(MAX)',
  DATE: 'DATE', DATETIME: 'DATETIME2', TIMESTAMP: 'DATETIME2', TIME: 'TIME',
  BOOLEAN: 'BIT', DECIMAL: 'DECIMAL(10,2)', FLOAT: 'FLOAT',
  JSON: 'NVARCHAR(MAX)', UUID: 'UNIQUEIDENTIFIER', BLOB: 'VARBINARY(MAX)',
}

const TIPO_MONGO_BSON: Record<TipoColumna, string> = {
  INT: 'int', BIGINT: 'long', SMALLINT: 'int',
  VARCHAR: 'string', CHAR: 'string', TEXT: 'string',
  DATE: 'date', DATETIME: 'date', TIMESTAMP: 'date', TIME: 'string',
  BOOLEAN: 'bool', DECIMAL: 'decimal', FLOAT: 'double',
  JSON: 'object', UUID: 'string', BLOB: 'binData',
}

function nombreValido(nombre: string, fallback: string): string {
  return nombre.trim() || fallback
}

function generarSqlMySql(tablas: TablaDiagrama[], relaciones: RelacionDiagrama[]): string {
  const lineas = [
    '-- Generado por el Diagramador de ABA — revisá tipos, longitudes y constraints antes de ejecutar.',
    '-- Motor: MySQL 8.0',
    '',
  ]
  for (const t of tablas) {
    const nombreTabla = nombreValido(t.nombre, 'tabla_sin_nombre')
    const columnas = t.columnas.map(c => {
      const tipo = TIPO_MYSQL[c.tipo]
      const autoIncrement = c.esPrimaryKey && (c.tipo === 'INT' || c.tipo === 'BIGINT') ? ' AUTO_INCREMENT' : ''
      const pk = c.esPrimaryKey ? ' PRIMARY KEY' : ''
      return `  \`${nombreValido(c.nombre, 'columna')}\` ${tipo}${autoIncrement}${pk} NOT NULL`
    })
    const fks = relaciones
      .filter(r => r.tablaDestinoId === t.id)
      .map(r => {
        const origen = tablas.find(o => o.id === r.tablaOrigenId)
        const colDestino = t.columnas.find(c => c.id === r.columnaDestinoId)
        const colOrigen = origen?.columnas.find(c => c.id === r.columnaOrigenId)
        if (!origen || !colDestino || !colOrigen) return null
        const comentario = r.tipo === 'N-N'
          ? `  -- Relación N-N: considerá una tabla intermedia (join table) en vez de esta FK directa.\n`
          : ''
        return `${comentario}  FOREIGN KEY (\`${nombreValido(colDestino.nombre, 'columna')}\`) REFERENCES \`${nombreValido(origen.nombre, 'tabla_sin_nombre')}\` (\`${nombreValido(colOrigen.nombre, 'columna')}\`)`
      })
      .filter((x): x is string => x !== null)
    lineas.push(`CREATE TABLE \`${nombreTabla}\` (`)
    lineas.push([...columnas, ...fks].join(',\n'))
    lineas.push(');', '')
  }
  return lineas.join('\n')
}

function generarSqlServer(tablas: TablaDiagrama[], relaciones: RelacionDiagrama[]): string {
  const lineas = [
    '-- Generado por el Diagramador de ABA — revisá tipos, longitudes y constraints antes de ejecutar.',
    '-- Motor: SQL Server',
    '-- Nota: el tipo "TIMESTAMP" del diagrama se mapea a DATETIME2 — el ROWVERSION real de',
    '-- SQL Server no es una fecha, se autogenera y no se puede fijar a mano.',
    '',
  ]
  for (const t of tablas) {
    const nombreTabla = nombreValido(t.nombre, 'tabla_sin_nombre')
    const columnas = t.columnas.map(c => {
      const tipo = TIPO_SQLSERVER[c.tipo]
      const identity = c.esPrimaryKey && (c.tipo === 'INT' || c.tipo === 'BIGINT') ? ' IDENTITY(1,1)' : ''
      const pk = c.esPrimaryKey ? ' PRIMARY KEY' : ''
      return `  [${nombreValido(c.nombre, 'columna')}] ${tipo}${identity}${pk} NOT NULL`
    })
    const fks = relaciones
      .filter(r => r.tablaDestinoId === t.id)
      .map(r => {
        const origen = tablas.find(o => o.id === r.tablaOrigenId)
        const colDestino = t.columnas.find(c => c.id === r.columnaDestinoId)
        const colOrigen = origen?.columnas.find(c => c.id === r.columnaOrigenId)
        if (!origen || !colDestino || !colOrigen) return null
        const comentario = r.tipo === 'N-N'
          ? `  -- Relación N-N: considerá una tabla intermedia (join table) en vez de esta FK directa.\n`
          : ''
        return `${comentario}  FOREIGN KEY ([${nombreValido(colDestino.nombre, 'columna')}]) REFERENCES [dbo].[${nombreValido(origen.nombre, 'tabla_sin_nombre')}] ([${nombreValido(colOrigen.nombre, 'columna')}])`
      })
      .filter((x): x is string => x !== null)
    lineas.push(`CREATE TABLE [dbo].[${nombreTabla}] (`)
    lineas.push([...columnas, ...fks].join(',\n'))
    lineas.push(');', '')
  }
  return lineas.join('\n')
}

function generarScriptMongo(tablas: TablaDiagrama[], relaciones: RelacionDiagrama[]): string {
  const lineas = [
    '// Generado por el Diagramador de ABA — revisá tipos y validaciones antes de ejecutar en mongosh.',
    '// MongoDB no tiene Foreign Keys reales: las relaciones se modelan como referencias',
    '// (guardando el _id de un documento dentro de otro), quedan anotadas como comentario,',
    '// no como una restricción que la base fuerce.',
    '',
  ]
  for (const t of tablas) {
    const nombreTabla = nombreValido(t.nombre, 'tabla_sin_nombre')
    const campoMongo = (nombre: string) => (nombreValido(nombre, 'campo') === 'id' ? '_id' : nombreValido(nombre, 'campo'))
    const requeridos = t.columnas.map(c => `"${campoMongo(c.nombre)}"`).join(', ')
    const propiedades = t.columnas
      .map(c => `        ${campoMongo(c.nombre)}: { bsonType: "${TIPO_MONGO_BSON[c.tipo]}" }`)
      .join(',\n')

    lineas.push(`db.createCollection("${nombreTabla}", {`)
    lineas.push('  validator: {')
    lineas.push('    $jsonSchema: {')
    lineas.push('      bsonType: "object",')
    lineas.push(`      required: [${requeridos}],`)
    lineas.push('      properties: {')
    lineas.push(propiedades)
    lineas.push('      },')
    lineas.push('    },')
    lineas.push('  },')
    lineas.push('});')

    for (const r of relaciones.filter(rel => rel.tablaDestinoId === t.id)) {
      const origen = tablas.find(o => o.id === r.tablaOrigenId)
      const colDestino = t.columnas.find(c => c.id === r.columnaDestinoId)
      if (!origen || !colDestino) continue
      lineas.push(`// Relación (${r.tipo}): "${campoMongo(colDestino.nombre)}" en "${nombreTabla}" referencia un documento de "${nombreValido(origen.nombre, 'tabla_sin_nombre')}".`)
    }
    lineas.push('')
  }
  return lineas.join('\n')
}

function generarScriptExport(motor: MotorExportSql, tablas: TablaDiagrama[], relaciones: RelacionDiagrama[]): { contenido: string; extension: string } {
  if (motor === 'mysql') return { contenido: generarSqlMySql(tablas, relaciones), extension: 'sql' }
  if (motor === 'sqlserver') return { contenido: generarSqlServer(tablas, relaciones), extension: 'sql' }
  return { contenido: generarScriptMongo(tablas, relaciones), extension: 'js' }
}

const TABLE_WIDTH = 210
const TABLE_MIN_WIDTH = 160
const HEADER_HEIGHT = 38
const ROW_HEIGHT = 28
const FOOTER_HEIGHT = 26
const CANVAS_WIDTH = 2600
const CANVAS_HEIGHT = 1600
const STORAGE_KEY = 'aba-diagrama-actual'
const ZOOMS = [25, 50, 75, 100] as const

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
    tipo: 'info' as const,
  },
  {
    title: 'Nueva tabla',
    body: 'Cada tabla nace con un color aleatorio y una columna "id" — la clave primaria, fija.',
    selector: '[data-tour="diagrama-nueva-tabla"]',
    tipo: 'crear' as const,
  },
  {
    title: 'La primera columna es siempre la clave',
    body: '"id" nace como Primary Key y no se puede desmarcar — así ninguna tabla se queda sin identificador. El resto de las columnas sí podés marcarlas como Foreign Key, a mano o automáticamente al conectar dos tablas.',
    tipo: 'estado' as const,
  },
  {
    title: 'Conectá arrastrando',
    body: 'Cada columna tiene un puntito a la derecha. Arrastrá desde ahí hasta otra columna (de otra tabla) para crear una relación — la columna de destino se marca FK sola. Hacé clic en la etiqueta de la línea para cambiar el tipo (1-1, 1-N, N-N), o en la "x" para borrarla.',
    tipo: 'editar' as const,
  },
  {
    title: 'Redimensioná y hacé zoom',
    body: 'Arrastrá el borde derecho de cualquier tabla para agrandarla o achicarla. Con estos botones alejás o acercás la vista completa.',
    selector: '[data-tour="diagrama-zoom"]',
    tipo: 'editar' as const,
  },
  {
    title: 'Limpiar todo',
    body: 'Borra todas las tablas y relaciones de una — pide confirmación porque no se puede deshacer.',
    selector: '[data-tour="diagrama-limpiar"]',
    tipo: 'eliminar' as const,
  },
  {
    title: 'Exportar, importar y descargar',
    body: 'Tu diagrama se autoguarda en este navegador. "Exportar SQL" te da un script de creación real (MySQL, SQL Server o MongoDB, a elección) listo para revisar y ejecutar; "Importar JSON" recupera un modelo guardado antes; "Descargar PNG" te da una imagen lista para compartir.',
    selector: '[data-tour="diagrama-exportar-png"]',
    tipo: 'info' as const,
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
  const [zoom, setZoom] = useState<typeof ZOOMS[number]>(100)
  const [menuExportAbierto, setMenuExportAbierto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        ancho: TABLE_WIDTH,
        color: colorAleatorio(),
        columnas: [{ id: generarId(), nombre: 'id', tipo: 'INT', esPrimaryKey: true, esForeignKey: false }],
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
      ? { ...t, columnas: [...t.columnas, { id: generarId(), nombre: `columna_${t.columnas.length + 1}`, tipo: 'VARCHAR', esPrimaryKey: false, esForeignKey: false }] }
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

  // La Primary Key ya NO es editable a mano — "id" nace marcada y queda así
  // siempre. Evita el estado inválido de una tabla sin ninguna PK, y saca
  // ambigüedad: la clave es estructural, no una opción que se pueda apagar.
  const toggleFk = useCallback((tablaId: string, columnaId: string) => {
    setTablas(prev => prev.map(t => (t.id === tablaId
      ? { ...t, columnas: t.columnas.map(c => (c.id === columnaId ? { ...c, esForeignKey: !c.esForeignKey } : c)) }
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

  // ─── Redimensionado de tablas (solo ancho) ─────────────────────────────────

  const resizeRef = useRef<{ tablaId: string; startX: number; anchoInicial: number } | null>(null)

  const onRedimensionar = useCallback((e: PointerEvent) => {
    const estado = resizeRef.current
    if (!estado) return
    const delta = e.clientX - estado.startX
    setTablas(prev => prev.map(t => (t.id === estado.tablaId
      ? { ...t, ancho: Math.max(TABLE_MIN_WIDTH, estado.anchoInicial + delta) }
      : t)))
  }, [])

  const onSoltarRedimension = useCallback(() => {
    resizeRef.current = null
    window.removeEventListener('pointermove', onRedimensionar)
    window.removeEventListener('pointerup', onSoltarRedimension)
  }, [onRedimensionar])

  const iniciarRedimension = useCallback((e: React.PointerEvent, tabla: TablaDiagrama) => {
    e.preventDefault()
    e.stopPropagation()
    resizeRef.current = { tablaId: tabla.id, startX: e.clientX, anchoInicial: tabla.ancho }
    window.addEventListener('pointermove', onRedimensionar)
    window.addEventListener('pointerup', onSoltarRedimension)
  }, [onRedimensionar, onSoltarRedimension])

  // ─── Relaciones ────────────────────────────────────────────────────────────

  function anclaColumna(tabla: TablaDiagrama, indice: number, lado: 'left' | 'right') {
    return {
      x: lado === 'right' ? tabla.x + tabla.ancho : tabla.x,
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
    const centroO = tablaO.x + tablaO.ancho / 2
    const centroD = tablaD.x + tablaD.ancho / 2
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

    // Más claro con las FK: la columna del lado "destino" de la conexión se marca
    // Foreign Key automáticamente — no depende de que el usuario se acuerde de
    // tocar el ícono a mano después de conectar.
    setTablas(prev => prev.map(t => (t.id === tablaDestinoId
      ? { ...t, columnas: t.columnas.map(c => (c.id === columnaDestinoId ? { ...c, esForeignKey: true } : c)) }
      : t)))

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
      const maxX = Math.max(...tablas.map(t => t.x + t.ancho)) + PAD
      const maxY = Math.max(...tablas.map(t => t.y + alturaTabla(t))) + PAD

      // toBlob (no toPng/data-URI) — algunos navegadores (Safari en particular) no
      // disparan la descarga de un <a download> con un href data: gigante, o lo abren
      // en una pestaña nueva en vez de guardarlo. Un blob: URL es mucho más confiable
      // para forzar la descarga real en todos los navegadores modernos.
      const blob = await toBlob(canvasRef.current, {
        backgroundColor: '#09090B',
        pixelRatio: 2,
        width: maxX - minX,
        height: maxY - minY,
        style: { transform: `translate(${-minX}px, ${-minY}px)`, transformOrigin: 'top left' },
      })
      if (!blob) throw new Error('toBlob devolvió null')

      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `diagrama-${Date.now()}.png`
      link.href = blobUrl
      // Algunos navegadores solo disparan el click sintético si el elemento está
      // realmente en el DOM — se agrega y se saca enseguida, no queda visible.
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000)
    } catch {
      setError('No se pudo generar la imagen. Revisa que tu navegador permita descargas y volvé a intentar.')
    } finally {
      setExportando(false)
    }
  }, [tablas])

  // ─── Exportar script (SQL/Mongo) / importar modelo (JSON) ───────────────

  const exportarSql = useCallback((motor: MotorExportSql) => {
    if (tablas.length === 0) return
    const { contenido, extension } = generarScriptExport(motor, tablas, relaciones)
    const blob = new Blob([contenido], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.download = `diagrama-${motor}-${Date.now()}.${extension}`
    link.href = url
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    setMenuExportAbierto(false)
  }, [tablas, relaciones])

  const abrirSelectorImportar = useCallback(() => fileInputRef.current?.click(), [])

  const onImportarArchivo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // permite volver a importar el mismo archivo dos veces seguidas
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const datos = JSON.parse(String(reader.result)) as { tablas?: TablaDiagramaJson[]; relaciones?: RelacionDiagrama[] }
        if (!Array.isArray(datos.tablas)) throw new Error('Formato inválido')

        // Sanea campos por si el JSON viene de una versión vieja del editor (sin
        // "ancho", por ejemplo) o fue editado a mano — nunca confía ciegamente
        // en un archivo externo.
        const idsValidos = new Set<string>()
        const tablasSaneadas: TablaDiagrama[] = datos.tablas.map(t => {
          const id = typeof t.id === 'string' ? t.id : generarId()
          idsValidos.add(id)
          return {
            id,
            nombre: typeof t.nombre === 'string' && t.nombre ? t.nombre : 'Tabla',
            x: Number.isFinite(t.x) ? Number(t.x) : 0,
            y: Number.isFinite(t.y) ? Number(t.y) : 0,
            ancho: Number.isFinite(t.ancho) ? Math.max(TABLE_MIN_WIDTH, Number(t.ancho)) : TABLE_WIDTH,
            color: typeof t.color === 'string' ? t.color : colorAleatorio(),
            columnas: Array.isArray(t.columnas) ? t.columnas.map(c => ({
              id: typeof c.id === 'string' ? c.id : generarId(),
              nombre: typeof c.nombre === 'string' && c.nombre ? c.nombre : 'columna',
              tipo: (TIPOS as string[]).includes(c.tipo ?? '') ? (c.tipo as TipoColumna) : 'VARCHAR',
              esPrimaryKey: Boolean(c.esPrimaryKey),
              esForeignKey: Boolean(c.esForeignKey),
            })) : [],
          }
        })

        const relacionesSaneadas: RelacionDiagrama[] = Array.isArray(datos.relaciones)
          ? datos.relaciones.filter(r =>
              r && idsValidos.has(r.tablaOrigenId) && idsValidos.has(r.tablaDestinoId))
          : []

        setTablas(tablasSaneadas)
        setRelaciones(relacionesSaneadas)
        setError(null)
      } catch {
        setError('El archivo no es un diagrama válido de ABA (JSON exportado desde acá).')
      }
    }
    reader.readAsText(file)
  }, [])

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
            <div className="flex items-center gap-2">
              <h1 className="text-[24px] font-semibold text-[#F5F5F5] tracking-tight">Diagramador</h1>
              <Badge variant="info" size="xs">Beta</Badge>
            </div>
            <p className="text-[13px] text-[#71717A]">Planeá la estructura de tu base con tablas y relaciones, sin escribir SQL.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button dataTour="diagrama-nueva-tabla" onClick={nuevaTabla} icon={<Plus size={13} />} label="Nueva tabla" primary />
          <Button dataTour="diagrama-limpiar" onClick={limpiarTodo} icon={<Eraser size={13} />} label="Limpiar todo" />
          <div className="relative">
            <Button
              onClick={() => setMenuExportAbierto(v => !v)}
              icon={<FileCode2 size={13} />}
              label="Exportar SQL"
              disabled={tablas.length === 0}
            />
            {menuExportAbierto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuExportAbierto(false)} />
                <div className="absolute right-0 mt-1.5 z-20 w-40 rounded-[10px] border border-[#2B2D31] bg-[#18181B] shadow-[0_8px_24px_rgba(0,0,0,0.5)] overflow-hidden">
                  <button
                    onClick={() => exportarSql('mysql')}
                    className="w-full text-left px-3 py-2 text-[12.5px] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1F] transition-colors cursor-pointer"
                  >
                    MySQL
                  </button>
                  <button
                    onClick={() => exportarSql('sqlserver')}
                    className="w-full text-left px-3 py-2 text-[12.5px] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1F] transition-colors cursor-pointer border-t border-[#2B2D31]"
                  >
                    SQL Server
                  </button>
                  <button
                    onClick={() => exportarSql('mongo')}
                    className="w-full text-left px-3 py-2 text-[12.5px] text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1F] transition-colors cursor-pointer border-t border-[#2B2D31]"
                  >
                    MongoDB
                  </button>
                </div>
              </>
            )}
          </div>
          <Button onClick={abrirSelectorImportar} icon={<Upload size={13} />} label="Importar JSON" />
          <input ref={fileInputRef} type="file" accept="application/json" onChange={onImportarArchivo} className="hidden" />
          <Button dataTour="diagrama-exportar-png" onClick={descargarComoPng} icon={<Download size={13} />} label="Descargar PNG" loading={exportando} disabled={tablas.length === 0} />
        </div>
      </div>

      {error && (
        <div className="rounded-[10px] border border-[#7F1D1D] bg-[#2A1010] p-3">
          <p className="text-[13px] text-[#F87171]">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-end gap-1.5">
        <span className="text-[11px] text-[#52525B] mr-1">Zoom</span>
        <div data-tour="diagrama-zoom" className="flex items-center gap-0.5 border border-[#2B2D31] rounded-[10px] p-0.5 bg-[#18181B]">
          {ZOOMS.map(z => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`h-7 px-2.5 rounded-[7px] text-[11.5px] font-medium transition-all cursor-pointer ${
                zoom === z ? 'bg-[#3B82F6] text-white' : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#1C1C1F]'
              }`}
            >
              {z}%
            </button>
          ))}
        </div>
      </div>

      <div className="relative rounded-[14px] border border-[#2B2D31] overflow-hidden">
        <div className="h-[620px] overflow-auto bg-[#09090B]">
          <div
            ref={canvasRef}
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
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
                onResizeStart={iniciarRedimension}
                onRename={renombrarTabla}
                onDelete={eliminarTabla}
                onAddColumn={agregarColumna}
                onRenameColumn={renombrarColumna}
                onChangeTipo={cambiarTipoColumna}
                onToggleFk={toggleFk}
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

function Button({ onClick, icon, label, primary, loading, disabled, dataTour }: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  primary?: boolean
  loading?: boolean
  disabled?: boolean
  dataTour?: string
}) {
  return (
    <button
      data-tour={dataTour}
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
  tabla, onDragStart, onResizeStart, onRename, onDelete, onAddColumn, onRenameColumn, onChangeTipo, onToggleFk, onDeleteColumn, onStartConnection,
}: {
  tabla: TablaDiagrama
  onDragStart: (e: React.PointerEvent, tabla: TablaDiagrama) => void
  onResizeStart: (e: React.PointerEvent, tabla: TablaDiagrama) => void
  onRename: (tablaId: string, nombre: string) => void
  onDelete: (tablaId: string) => void
  onAddColumn: (tablaId: string) => void
  onRenameColumn: (tablaId: string, columnaId: string, nombre: string) => void
  onChangeTipo: (tablaId: string, columnaId: string, tipo: TipoColumna) => void
  onToggleFk: (tablaId: string, columnaId: string) => void
  onDeleteColumn: (tablaId: string, columnaId: string) => void
  onStartConnection: (e: React.PointerEvent, tabla: TablaDiagrama, columna: ColumnaDiagrama, indice: number) => void
}) {
  return (
    <div
      style={{ left: tabla.x, top: tabla.y, width: tabla.ancho, borderLeft: `3px solid ${tabla.color}` }}
      className="absolute rounded-[10px] border-y border-r border-[#2B2D31] bg-[#18181B] shadow-[0_8px_24px_rgba(0,0,0,0.4)] select-none"
    >
      <div
        onPointerDown={e => onDragStart(e, tabla)}
        style={{ height: HEADER_HEIGHT, backgroundColor: `${tabla.color}1F` }}
        className="flex items-center gap-1.5 px-1.5 rounded-tr-[9px] border-b border-[#2B2D31] cursor-move"
      >
        {/* Handle dedicado: el input de nombre ocupa casi todo el header (flex-1), así
            que sin esto casi no queda superficie de header "vacía" para agarrar y arrastrar. */}
        <div className="w-5 h-5 flex items-center justify-center text-[#52525B] shrink-0 cursor-grab">
          <GripVertical size={13} />
        </div>
        <Table2 size={13} className="shrink-0" style={{ color: tabla.color }} />
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
            style={{ height: ROW_HEIGHT, backgroundColor: c.esForeignKey ? 'rgba(59,130,246,0.10)' : undefined }}
            className="flex items-center gap-1 px-2 border-b border-[#2B2D31] last:border-0 text-[11px]"
          >
            {/* PK ya no es editable: nace en "id" y no se puede tocar — evita el
                estado inválido de una tabla sin ninguna clave. Solo informativo. */}
            <span title={c.esPrimaryKey ? 'Primary key' : undefined} className={`shrink-0 ${c.esPrimaryKey ? 'text-[#EAB308]' : 'text-[#27272A]'}`}>
              <KeyRound size={11} />
            </span>
            <button
              onClick={() => onToggleFk(tabla.id, c.id)}
              title={c.esForeignKey ? 'Es Foreign Key — clic para quitar' : 'Marcar como Foreign Key'}
              className={`shrink-0 flex items-center gap-0.5 cursor-pointer ${c.esForeignKey ? 'text-[#3B82F6]' : 'text-[#3F3F46] hover:text-[#71717A]'}`}
            >
              <Link2 size={11} />
              {c.esForeignKey && <span className="text-[8.5px] font-bold leading-none">FK</span>}
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

      {/* Redimensionado — solo ancho, arrastrando el borde derecho. */}
      <div
        onPointerDown={e => onResizeStart(e, tabla)}
        className="absolute top-0 bottom-0 -right-1 w-2 cursor-ew-resize hover:bg-[#3B82F6]/25 transition-colors"
        title="Arrastrá para cambiar el ancho de la tabla"
      />
    </div>
  )
}
