/**
 * @module App
 * @description Root application component with routing and auth.
 *
 * Defines the complete route structure and authentication guards:
 *
 * - `/` — Public landing page (no auth required)
 * - `/login` — OAuth login page (redirects to dashboard if already authenticated)
 * - `/auth/success` — OAuth callback handler (confirms session, redirects to dashboard)
 * - `/auth/error` — OAuth failure page (shows error, links back to login)
 * - `/dashboard` — Protected dashboard shell (requires authentication)
 *   - `/dashboard` — Overview with stats and recent databases
 *   - `/dashboard/databases` — Full database list with search
 *   - `/dashboard/databases/:id` — Database detail with credentials
 *   - `/dashboard/new` — Create new database flow
 * - `*` — Catch-all redirects to landing page
 *
 * ## Auth Guards
 *
 * - `ProtectedRoute`: Redirects unauthenticated users to `/login`
 * - `GuestRoute`: Redirects authenticated users to `/dashboard`
 *
 * @see contexts/AuthContext.tsx — The auth state provider
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AuthSuccess from './pages/auth/AuthSuccess'
import AuthError from './pages/auth/AuthError'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardOverview from './pages/dashboard/Overview'
import DatabasesPage from './pages/dashboard/DatabasesPage'
import DatabaseDetailPage from './pages/dashboard/DatabaseDetailPage'
import NewDatabasePage from './pages/dashboard/NewDatabasePage'
import type { ReactNode } from 'react'

// ─── Route Guards ──────────────────────────────────────────────────────────

/**
 * Protects routes that require authentication.
 *
 * Shows a loading spinner while checking auth status, redirects to `/login`
 * if unauthenticated, or renders children if authenticated.
 */
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full aba-spin" />
      </div>
    )
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

/**
 * Restricts routes to guests only (e.g., login page).
 *
 * Redirects authenticated users to `/dashboard` to prevent
 * viewing the login page while already logged in.
 */
function GuestRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full aba-spin" />
      </div>
    )
  }
  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}

// ─── App Component ─────────────────────────────────────────────────────────

/**
 * Root application component.
 *
 * Sets up:
 * 1. `BrowserRouter` for client-side routing
 * 2. `AuthProvider` for global auth state
 * 3. Route definitions with auth guards
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ─── Public Routes ─────────────────────────────────── */}
          <Route path="/" element={<Landing />} />

          {/* ─── Auth Routes ───────────────────────────────────── */}
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/auth/error" element={<AuthError />} />

          {/* ─── Protected Dashboard ───────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="databases" element={<DatabasesPage />} />
            <Route path="databases/:id" element={<DatabaseDetailPage />} />
            <Route path="new" element={<NewDatabasePage />} />
          </Route>

          {/* ─── Catch All ─────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
