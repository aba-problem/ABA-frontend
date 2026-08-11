/**
 * @module pages/dashboard/DashboardLayout
 * @description Dashboard shell layout with collapsible sidebar.
 *
 * Wraps all `/dashboard/*` routes via React Router `<Outlet />`.
 * Provides:
 * - Left sidebar (240px expanded, 60px collapsed) with nav items:
 *   - Overview (`/dashboard`)
 *   - Databases (`/dashboard/databases`)
 *   - Settings (`/dashboard/settings`)
 *   - New Database quick-action button
 *   - Sign out
 * - Top bar with user avatar/name and "Main site" external link
 * - Content area with page transition animation (`aba-page-transition`)
 *
 * Sidebar collapse state is stored in local component state (resets
 * on refresh). Uses `NavLink` for active route highlighting.
 *
 * @see contexts/AuthContext.tsx — logout, user
 * @see pages/dashboard/Overview.tsx — Default child route
 */

import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Badge, type BadgeVariant } from '../../ds/Badge'
import {
  Database, LayoutDashboard, Plus, LogOut, ChevronLeft, ChevronRight,
  Settings, ExternalLink, Menu, X, Workflow, KeyRound, Globe, History, Building2,
} from 'lucide-react'

/**
 * Sidebar navigation items.
 *
 * 2026-08-09: Bases de datos ya no lleva badge de mantenimiento — el bug de
 * whitelist de IP en MySQL que motivó la pausa se diagnosticó y arregló (ver
 * NewDatabasePage.tsx y Aba/DIAGNOSTICO-PROXYSQL.md), los dos motores vuelven
 * a estar habilitados para crear. N8N, IA como Servicio y Subdominios DNS
 * tampoco llevan badge — el backend está completo; lo que puede fallar al
 * usarlos todavía son las piezas externas (instancia N8N real, proveedor de
 * IA, token de Cloudflare), no la navegación ni el resto del flujo.
 */
const NAV_ITEMS: {
  to: string
  icon: typeof LayoutDashboard
  label: string
  end?: boolean
  badge?: { text: string; variant: BadgeVariant }
}[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Resumen', end: true },
  { to: '/dashboard/databases', icon: Database, label: 'Bases de datos' },
  { to: '/dashboard/n8n', icon: Workflow, label: 'Automatización N8N' },
  { to: '/dashboard/apikeys', icon: KeyRound, label: 'IA como Servicio' },
  { to: '/dashboard/dns', icon: Globe, label: 'Subdominios DNS' },
  { to: '/dashboard/sesiones', icon: History, label: 'Registros de sesión' },
]

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  // Solo visible en el sidebar para administradores — el backend igual revalida
  // el rol Admin en cada SP (sql/018), esto es puramente cosmético.
  const navItems = user?.esAdmin
    ? [...NAV_ITEMS, { to: '/dashboard/celulas-socias', icon: Building2, label: 'Células socias' }]
    : NAV_ITEMS

  return (
    <div className="min-h-screen bg-[var(--aba-bg)] flex">
      {mobileOpen && (
        <button
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`aba-sidebar fixed lg:sticky top-0 h-screen flex flex-col border-r border-[var(--aba-border)] bg-[var(--aba-bg-secondary)] z-40 transition-transform duration-200 ${
          collapsed ? 'w-[60px]' : 'w-[240px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[var(--aba-border)]">
          <div className="w-7 h-7 rounded-[8px] bg-[var(--aba-accent)] flex items-center justify-center shrink-0">
            <span className="text-white text-[12px] font-bold">A</span>
          </div>
          {!collapsed && <span className="text-[15px] font-semibold text-[var(--aba-text)]">ABA</span>}
          <button
            aria-label="Cerrar navegación"
            onClick={() => setMobileOpen(false)}
            className="ml-auto w-8 h-8 rounded-[8px] text-[var(--aba-text-muted)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card)] lg:hidden flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--aba-accent-muted-bg)] text-[var(--aba-accent-text)] border border-[var(--aba-accent-muted-border)]'
                    : 'text-[var(--aba-text-secondary)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card)] border border-transparent'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon size={16} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <Badge variant={item.badge.variant} size="xs" className="ml-auto shrink-0">
                      {item.badge.text}
                    </Badge>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Quick action */}
        <div className="px-2 pb-2">
          <button
            onClick={() => {
              setMobileOpen(false)
              navigate('/dashboard/new')
            }}
            className={`flex items-center gap-2.5 h-9 rounded-[8px] bg-[var(--aba-accent)] text-[13px] font-medium text-white hover:bg-[var(--aba-accent-hover)] transition-all duration-150 cursor-pointer w-full ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
          >
            <Plus size={15} className="shrink-0" />
            {!collapsed && <span>New Database</span>}
          </button>
        </div>

        {/* Bottom section */}
        <div className="border-t border-[var(--aba-border)] p-2 space-y-0.5">
          <NavLink
            to="/dashboard/settings"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-[var(--aba-card)] text-[var(--aba-text)]'
                  : 'text-[var(--aba-text-muted)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card)]'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Settings size={16} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium text-[var(--aba-text-muted)] hover:text-[#EF4444] hover:bg-[#2A1010] transition-all cursor-pointer w-full ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--aba-card)] border border-[var(--aba-border)] items-center justify-center text-[var(--aba-text-muted)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card-hover)] transition-all cursor-pointer z-50"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 border-b border-[var(--aba-border)] bg-[var(--aba-bg)]/80 backdrop-blur-md flex items-center justify-between px-6">
          <button
            aria-label="Abrir navegación"
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-[9px] border border-[var(--aba-border)] bg-[var(--aba-bg-secondary)] text-[var(--aba-text-secondary)] hover:text-[var(--aba-text)] hover:bg-[var(--aba-card)] lg:hidden flex items-center justify-center"
          >
            <Menu size={17} />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-4">
            <a
              href="https://aba.andrescortes.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] text-[var(--aba-text-muted)] hover:text-[var(--aba-text-secondary)] transition-colors"
            >
              <ExternalLink size={13} />
              Main site
            </a>
            {user && (
              <button
                onClick={() => navigate('/dashboard/settings')}
                className="flex items-center gap-2.5 cursor-pointer group"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[var(--aba-accent-muted-bg)] border border-[var(--aba-accent-muted-border)] flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-[var(--aba-accent-text)]">
                      {user.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <span className="text-[13px] text-[var(--aba-text-secondary)] hidden sm:inline group-hover:text-[var(--aba-text)] transition-colors">{user.nombre}</span>
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="aba-page-transition">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
