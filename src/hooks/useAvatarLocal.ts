/**
 * @module hooks/useAvatarLocal
 * @description Lee la foto de perfil local (IndexedDB, ver lib/avatarStore) para un
 * usuario y devuelve un object URL listo para <img src>. Maneja su propio ciclo de
 * vida (revoca el URL anterior al cambiar de usuario o desmontar) — cualquier
 * componente que necesite mostrar el avatar (topbar, Settings, etc.) usa este mismo
 * hook para no duplicar la lógica de IndexedDB ni fugar object URLs.
 */

import { useEffect, useRef, useState } from 'react'
import { obtenerAvatarLocal, AVATAR_LOCAL_CHANGED_EVENT } from '../lib/avatarStore'

export function useAvatarLocal(usuarioId: number | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!usuarioId) return
    let cancelled = false

    const cargar = async () => {
      const blob = await obtenerAvatarLocal(usuarioId).catch(() => null)
      if (cancelled) return
      const anterior = urlRef.current
      if (blob) {
        const objectUrl = URL.createObjectURL(blob)
        urlRef.current = objectUrl
        setUrl(objectUrl)
      } else {
        urlRef.current = null
        setUrl(null)
      }
      if (anterior) URL.revokeObjectURL(anterior)
    }

    cargar()
    // Otro componente (ej. el formulario de edición) pudo subir/borrar la foto en
    // simultáneo — sin esto, la topbar quedaría con la imagen vieja hasta recargar.
    window.addEventListener(AVATAR_LOCAL_CHANGED_EVENT, cargar)
    return () => {
      cancelled = true
      window.removeEventListener(AVATAR_LOCAL_CHANGED_EVENT, cargar)
    }
  }, [usuarioId])

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  return url
}
