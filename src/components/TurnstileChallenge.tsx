/**
 * @module components/TurnstileChallenge
 * @description Cloudflare Turnstile CAPTCHA challenge overlay.
 *
 * Rendered when the backend returns `400 CAPTCHA_REQUERIDO` during login.
 * Displays a Turnstile widget inside a modal-like overlay. On successful
 * verification, calls `onToken(token)` so the parent can retry the login
 * with the solved token.
 *
 * The Turnstile script is loaded asynchronously from `index.html`.
 * This component waits for `window.turnstile` to be available before
 * rendering the widget (handles slow connections / ad blockers).
 *
 * @see api/auth.ts — probeLogin() returns CAPTCHA_REQUERIDO
 * @see pages/Login.tsx — Renders this component when captchaRequired is true
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

/** Global Turnstile object injected by the Cloudflare script. */
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'error-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
        appearance?: 'always' | 'execute' | 'interaction-only'
      }) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

interface TurnstileChallengeProps {
  /** Called with the solved Turnstile token when verification succeeds. */
  onToken: (token: string) => void
  /** Called when the user dismisses the challenge or it fails. */
  onDismiss: () => void
}

/**
 * Public Cloudflare Turnstile site key.
 *
 * This key is public by design — it's used by anyone to render the widget.
 * The Secret Key lives only on the backend (never exposed to the frontend).
 *
 * Can be overridden via VITE_TURNSTILE_SITE_KEY env var for different environments.
 */
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAD8RIgtzOJKpuzKI'

export default function TurnstileChallenge({ onToken, onDismiss }: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [scriptError, setScriptError] = useState(false)

  // Wait for the Turnstile script to load (it's loaded async in index.html)
  useEffect(() => {
    // Check if already loaded
    if (window.turnstile) {
      setScriptLoaded(true)
      return
    }

    // Poll for script availability (handles async loading)
    let attempts = 0
    const maxAttempts = 50 // 5 seconds max wait
    const interval = setInterval(() => {
      attempts++
      if (window.turnstile) {
        setScriptLoaded(true)
        clearInterval(interval)
      } else if (attempts >= maxAttempts) {
        setScriptError(true)
        clearInterval(interval)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Render the Turnstile widget once the script is loaded and container is ready
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || widgetIdRef.current) return

    widgetIdRef.current = window.turnstile!.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      callback: (token) => onToken(token),
      'error-callback': () => onDismiss(),
      theme: 'dark',
      appearance: 'always',
    })

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current) } catch { /* ignore */ }
        widgetIdRef.current = null
      }
    }
  }, [scriptLoaded, onToken, onDismiss])

  // Retry button — re-renders the widget
  const handleRetry = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [])

  // Script failed to load (ad blocker, network issue, etc.)
  if (scriptError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="rounded-[16px] border border-[#2B2D31] bg-[#111217] p-8 max-w-[400px] w-full text-center">
          <p className="text-[14px] text-[#EF4444] mb-4">
            Could not load verification widget. Check your connection or disable ad blockers.
          </p>
          <button
            onClick={onDismiss}
            className="text-[14px] text-[#3B82F6] hover:text-[#60A5FA] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="rounded-[16px] border border-[#2B2D31] bg-[#111217] p-8 max-w-[420px] w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-[10px] bg-[#2A1C0A] border border-[#78350F] flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-[#F59E0B]" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-[#F5F5F5]">Verification required</h2>
            <p className="text-[13px] text-[#71717A]">Too many login attempts from your network</p>
          </div>
        </div>

        <p className="text-[13px] text-[#71717A] mb-5">
          Complete the verification below to continue signing in.
        </p>

        <div className="flex justify-center mb-5 min-h-[65px]">
          {scriptLoaded ? (
            <div ref={containerRef} />
          ) : (
            <div className="w-8 h-8 border-2 border-[#3B82F6] border-t-transparent rounded-full aba-spin" />
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 h-10 rounded-[10px] bg-[#18181B] border border-[#2B2D31] text-[14px] font-medium text-[#F5F5F5] hover:bg-[#1C1C1F] transition-all duration-150 cursor-pointer"
          >
            Retry
          </button>
          <button
            onClick={onDismiss}
            className="flex-1 h-10 rounded-[10px] text-[14px] font-medium text-[#71717A] hover:text-[#A1A1AA] transition-all duration-150 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
