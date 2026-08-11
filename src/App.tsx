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
 * No hay un apagón total tipo "modo mantenimiento" a nivel de app — el
 * control de qué módulo está disponible se hace por-ruta (`FeatureNotice` en
 * Bases de datos/N8N/IA/DNS más abajo).
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
import SettingsPage from './pages/dashboard/SettingsPage'
import DatabasesPage from './pages/dashboard/DatabasesPage'
import DatabaseDetailPage from './pages/dashboard/DatabaseDetailPage'
import NewDatabasePage from './pages/dashboard/NewDatabasePage'
import SessionsPage from './pages/dashboard/SessionsPage'
import CelulasSociasPage from './pages/dashboard/CelulasSociasPage'
import FeatureNotice from './pages/dashboard/FeatureNotice'
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
 * Redirects authenticated users to the dashboard to prevent viewing the
 * login page while already logged in.
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

            {/* Bases de datos: listado/detalle siguen funcionando (solo lectura de
                metadata en ABA_Control, no toca el bug de whitelist MySQL). La
                creación en sí queda deshabilitada dentro de NewDatabasePage (los
                dos motores se muestran en gris, "En mantenimiento", no seleccionables). */}
            <Route path="databases" element={<DatabasesPage />} />
            <Route path="databases/:id" element={<DatabaseDetailPage />} />
            <Route path="new" element={<NewDatabasePage />} />

            {/* N8N — en mantenimiento (mismo criterio que Bases de datos). */}
            <Route path="n8n" element={<FeatureNotice feature="Automatización N8N" mode="maintenance" />} />

            {/* IA como Servicio y DNS Autoservicio — backend funcional pero sin las
                piezas externas reales conectadas todavía (proveedor de IA / token de
                Cloudflare en el .env de producción). */}
            <Route path="apikeys" element={<FeatureNotice feature="IA como Servicio" mode="soon" detail="La gestión de API keys ya funciona; la llamada real a un proveedor de IA está pendiente." />} />
            <Route path="dns" element={<FeatureNotice feature="Subdominios DNS" mode="soon" detail="Pendiente de cargar el token de Cloudflare en el servidor de producción." />} />

            <Route path="sesiones" element={<SessionsPage />} />
            {/* Admin-only — CelulasSociasPage se autogatea con usuario.esAdmin,
                el backend aparte revalida el rol Admin en cada SP (sql/018). */}
            <Route path="celulas-socias" element={<CelulasSociasPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ─── Catch All ─────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
