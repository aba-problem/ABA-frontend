/**
 * @module lib/avatarStore
 * @description Foto de perfil 100% local — nunca sube a la base de datos ni al
 * backend. Se guarda como Blob en IndexedDB, en este navegador/dispositivo
 * únicamente. Persiste entre sesiones (a diferencia de memoria o de un simple
 * object URL), pero no viaja con la cuenta a otro dispositivo — esa es la
 * contrapartida explícita de no pasar por el servidor.
 */

const DB_NAME = 'aba-avatares'
const STORE_NAME = 'avatares'
const DB_VERSION = 1

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const AVATAR_TIPOS_PERMITIDOS = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function abrirDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Se dispara cada vez que la foto local cambia — así otros componentes (topbar,
 *  Settings) que la muestran en simultáneo se refrescan sin recargar la página. */
export const AVATAR_LOCAL_CHANGED_EVENT = 'aba-avatar-local-changed'

/** Guarda (o reemplaza) la foto local del usuario. La clave es su id de ABA. */
export async function guardarAvatarLocal(usuarioId: number, blob: Blob): Promise<void> {
  const db = await abrirDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(blob, usuarioId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  window.dispatchEvent(new CustomEvent(AVATAR_LOCAL_CHANGED_EVENT, { detail: { usuarioId } }))
}

/** Devuelve la foto local guardada, o null si nunca se subió ninguna. */
export async function obtenerAvatarLocal(usuarioId: number): Promise<Blob | null> {
  const db = await abrirDb()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(usuarioId)
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

/** Borra la foto local — vuelve a mostrarse el avatar de OAuth o las iniciales. */
export async function borrarAvatarLocal(usuarioId: number): Promise<void> {
  const db = await abrirDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(usuarioId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  window.dispatchEvent(new CustomEvent(AVATAR_LOCAL_CHANGED_EVENT, { detail: { usuarioId } }))
}
