/**
 * @module pages/auth/AuthError
 * @description OAuth failure landing page.
 *
 * Rendered at `/auth/error` when the backend encounters an error
 * during the OAuth flow and redirects here with a `?reason=` query
 * parameter. Currently handles:
 * - `auth_failed` — identity verification failed
 * - Unknown — generic fallback message
 *
 * Renders a red warning card with a "Try again" link back to `/login`.
 *
 * @see pages/Login.tsx — The login page this links back to
 */

import { useSearchParams, Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

export default function AuthError() {
  const [params] = useSearchParams()
  const reason = params.get('reason') || 'unknown'

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

      <div className="relative w-full max-w-[420px]">
        <div className="rounded-[16px] border border-[#2B2D31] bg-[#111217] p-8 text-center">
          <div className="w-12 h-12 rounded-[12px] bg-[#2A1010] border border-[#7F1D1D] flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={20} className="text-[#EF4444]" />
          </div>
          <h1 className="text-[20px] font-semibold text-[#F5F5F5] mb-2">Authentication failed</h1>
          <p className="text-[14px] text-[#71717A] mb-6">
            {reason === 'auth_failed'
              ? 'We could not verify your identity. Please try again.'
              : 'Something went wrong during sign in. Please try again.'}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center h-10 px-5 rounded-[10px] bg-[#3B82F6] text-[14px] font-medium text-white hover:bg-[#2563EB] transition-all duration-150"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  )
}
