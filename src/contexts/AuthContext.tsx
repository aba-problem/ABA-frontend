/**
 * @module contexts/AuthContext
 * @description Global authentication state management.
 *
 * Provides a React Context that tracks the user's authentication status
 * and exposes methods for session management. This is the single source
 * of truth for whether the user is logged in.
 *
 * ## How It Works
 *
 * 1. On mount, `AuthProvider` attempts to confirm the session by calling
 *    `POST /auth/refresh`. If successful, the user is authenticated.
 * 2. If refresh fails, the user is marked as unauthenticated.
 * 3. The `confirmSession()` method can be called after OAuth redirect to
 *    verify the new session.
 * 4. `logout()` calls the backend's logout endpoint and clears CSRF state.
 *
 * ## Security Notes
 *
 * - The JWT is HttpOnly — we never read it, store it, or pass it around
 * - `user` state is populated client-side from the API response, not from the JWT
 * - CSRF tokens are initialized after successful session confirmation
 *
 * @see message.txt — Section 1 (El modelo de sesión)
 * @see api/auth.ts — The underlying API calls
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Usuario } from '../api/types'
import { refreshSession, logout as apiLogout, initCsrf } from '../api/auth'
import { resetCsrf } from '../api/client'

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Authentication state tracked by the context.
 *
 * `status` is a three-state value:
 * - `'loading'` — Initial state, session check in progress
 * - `'authenticated'` — User has a valid session
 * - `'unauthenticated'` — No valid session (or refresh failed)
 */
interface AuthState {
  status: 'loading' | 'authenticated' | 'unauthenticated'
  /** User profile data, or null if not yet fetched. */
  user: Usuario | null
}

/**
 * Full auth context value exposed to consuming components.
 *
 * @see useAuth() — The hook to access this context
 */
interface AuthContextValue extends AuthState {
  /**
   * Confirms the current session by attempting a token refresh.
   * Returns `true` if the session is valid, `false` otherwise.
   * Also initializes CSRF tokens on success.
   */
  confirmSession: () => Promise<boolean>
  /** Logs out the user and clears all session state. */
  logout: () => Promise<void>
  /** Sets the user profile data (used after fetching from API). */
  setUser: (user: Usuario) => void
}

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null)

// ─── Provider Component ────────────────────────────────────────────────────

/**
 * Authentication provider that wraps the entire app.
 *
 * Manages the authentication lifecycle:
 * - Session confirmation on mount
 * - CSRF token initialization
 * - User state management
 * - Logout cleanup
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    user: null,
  })

  /**
   * Confirms the current session by calling `POST /auth/refresh`.
   *
   * If the refresh token cookie is valid, the backend rotates both tokens
   * and returns 204. We then initialize CSRF tokens for subsequent mutations.
   *
   * This is called:
   * - On app mount (to check if user is already logged in)
   * - After OAuth redirect (to verify the new session)
   */
  const confirmSession = useCallback(async (): Promise<boolean> => {
    // IMPORTANT: Fetch CSRF cookie FIRST. The backend requires X-CSRF-TOKEN header
    // on POST /auth/refresh. Without fetching the CSRF cookie first, the header
    // is never sent and the backend rejects the request.
    await initCsrf()

    const result = await refreshSession()
    if (result.ok) {
      setState({ status: 'authenticated', user: null })
      return true
    }
    setState({ status: 'unauthenticated', user: null })
    return false
  }, [])

  /**
   * Logs out the user by calling `POST /auth/logout` and clearing local state.
   *
   * The backend clears all session cookies (access_token, refresh_token, __CSRF).
   * We also reset the CSRF tracking flag so the next session gets fresh tokens.
   */
  const logout = useCallback(async () => {
    await apiLogout()
    resetCsrf()
    setState({ status: 'unauthenticated', user: null })
  }, [])

  /**
   * Sets the user profile data in context.
   *
   * Used by components that fetch user data from the API and want to
   * share it across the app (e.g., showing the user's name in the sidebar).
   */
  const setUser = useCallback((user: Usuario) => {
    setState(prev => ({ ...prev, user }))
  }, [])

  // Attempt session confirmation on mount
  useEffect(() => {
    confirmSession()
  }, [confirmSession])

  return (
    <AuthContext.Provider value={{ ...state, confirmSession, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Hook to access the authentication context.
 *
 * Must be used within an `<AuthProvider>`. Throws if used outside.
 *
 * @returns Authentication state and methods
 * @throws Error if used outside AuthProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { status, user, logout } = useAuth()
 *   if (status === 'loading') return <Spinner />
 *   if (status === 'unauthenticated') return <Redirect to="/login" />
 *   return <Dashboard user={user} onLogout={logout} />
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
