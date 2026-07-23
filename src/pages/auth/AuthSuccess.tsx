/**
 * @module pages/auth/AuthSuccess
 * @description Post-OAuth redirect handler.
 *
 * Rendered at `/auth/success` after the backend completes the OAuth
 * flow and redirects the browser here. The HttpOnly session cookie is
 * already set by the backend at this point.
 *
 * Calls {@link confirmSession} to hit `GET /api/auth/me`, which
 * populates the user in `AuthContext`. On success, navigates to
 * `/dashboard`. On failure, shows an error with a retry link.
 *
 * Uses a cleanup ref to prevent state updates on unmounted components
 * (race condition between the async call and navigation).
 *
 * @see contexts/AuthContext.tsx — confirmSession implementation
 * @see api/auth.ts — getMe call
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function AuthSuccess() {
  const { confirmSession } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ok = await confirmSession()
      if (cancelled) return
      if (ok) {
        navigate('/dashboard', { replace: true })
      } else {
        setError(true)
      }
    })()
    return () => { cancelled = true }
  }, [confirmSession, navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[16px] text-[#EF4444] mb-4">Authentication failed</p>
          <button
            onClick={() => navigate('/login')}
            className="text-[14px] text-[#3B82F6] hover:text-[#60A5FA] transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full aba-spin" />
        <p className="text-[14px] text-[#71717A]">Confirming session...</p>
      </div>
    </div>
  )
}
