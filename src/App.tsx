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
 * No hay un apagón total tipo "modo mantenimiento" a nivel de app. Bases de
 * datos sigue con la creación deshabilitada dentro de NewDatabasePage (los
 * motores se muestran en gris); N8N/IA/DNS ya apuntan a sus páginas reales.
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
import N8nPage from './pages/dashboard/N8nPage'
import ApiKeysPage from './pages/dashboard/ApiKeysPage'
import DnsPage from './pages/dashboard/DnsPage'
import DiagramEditorPage from './pages/dashboard/DiagramEditorPage'
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

            {/* N8N, IA como Servicio y DNS Autoservicio — habilitados de vuelta a sus
                páginas reales. Backend funcional (auth/rate-limit/auditoría/SPs), pero
                las piezas externas reales (instancia N8N, proveedor de IA detrás de
                /ai/completar, token de Cloudflare) siguen pendientes de credenciales —
                ver conversación: N8N crea una fila real pero sin servidor N8N detrás
                todavía; DNS devolverá 503 hasta cargar CLOUDFLARE_API_TOKEN en el
                .env de producción. */}
            <Route path="n8n" element={<N8nPage />} />
            <Route path="apikeys" element={<ApiKeysPage />} />
            <Route path="dns" element={<DnsPage />} />

            {/* Diagramador ER — 100% client-side, sin dependencia del backend
                (autoguardado en localStorage, sin endpoint nuevo). */}
            <Route path="diagramador" element={<DiagramEditorPage />} />

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
