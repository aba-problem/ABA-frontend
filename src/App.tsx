/**
 * @module App
 * @description Root application component with routing and auth.
 *
 * Defines the complete route structure and authentication guards:
 *
 * - `/` — Public landing page (no auth required)
 * - `/login` — OAuth login page (redirects to maintenance if already authenticated)
 * - `/auth/success` — OAuth callback handler (confirms session, redirects to maintenance)
 * - `/auth/error` — OAuth failure page (shows error, links back to login)
 * - `/mantenimiento` — Maintenance page (shown after login while MAINTENANCE_MODE is on)
 * - `/dashboard` — Protected dashboard shell (requires authentication; blocked while
 *   maintenance mode is active)
 *   - `/dashboard` — Overview with stats and recent databases
 *   - `/dashboard/databases` — Full database list with search
 *   - `/dashboard/databases/:id` — Database detail with credentials
 *   - `/dashboard/new` — Create new database flow
 * - `*` — Catch-all redirects to landing page
 *
 * ## Auth Guards
 *
 * - `ProtectedRoute`: Redirects unauthenticated users to `/login`
 * - `GuestRoute`: Redirects authenticated users to `/mantenimiento`
 * - `MaintenanceGuard`: Redirects all dashboard routes to `/mantenimiento` while
 *   maintenance mode is active
 *
 * @see contexts/AuthContext.tsx — The auth state provider
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Maintenance from './pages/Maintenance'
import AuthSuccess from './pages/auth/AuthSuccess'
import AuthError from './pages/auth/AuthError'
import DashboardLayout from './pages/dashboard/DashboardLayout'
import DashboardOverview from './pages/dashboard/Overview'
import DatabasesPage from './pages/dashboard/DatabasesPage'
import DatabaseDetailPage from './pages/dashboard/DatabaseDetailPage'
import NewDatabasePage from './pages/dashboard/NewDatabasePage'
import SettingsPage from './pages/dashboard/SettingsPage'
import N8nPage from './pages/dashboard/N8nPage'
import ApiKeysPage from './pages/dashboard/ApiKeysPage'
import DnsPage from './pages/dashboard/DnsPage'
import type { ReactNode } from 'react'

// ─── Maintenance Mode ──────────────────────────────────────────────────────
// Mientras sea `true`, tras el login y en todo el dashboard se muestra la
// página de mantenimiento. Las páginas existentes siguen intactas, solo no
// son accesibles hasta que se desactive (volver a `false`).

const MAINTENANCE_MODE = true

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
 * Redirects authenticated users to the maintenance page to prevent
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
    return <Navigate to="/mantenimiento" replace />
  }
  return <>{children}</>
}

/**
 * Blocks all dashboard routes while maintenance mode is active.
 */
function MaintenanceGuard({ children }: { children: ReactNode }) {
  if (MAINTENANCE_MODE) {
    return <Navigate to="/mantenimiento" replace />
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

          {/* ─── Maintenance ───────────────────────────────────── */}
          <Route path="/mantenimiento" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />

          {/* ─── Protected Dashboard ───────────────────────────── */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MaintenanceGuard>
                  <DashboardLayout />
                </MaintenanceGuard>
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardOverview />} />
            <Route path="databases" element={<DatabasesPage />} />
            <Route path="databases/:id" element={<DatabaseDetailPage />} />
            <Route path="new" element={<NewDatabasePage />} />
            <Route path="n8n" element={<N8nPage />} />
            <Route path="apikeys" element={<ApiKeysPage />} />
            <Route path="dns" element={<DnsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ─── Catch All ─────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
