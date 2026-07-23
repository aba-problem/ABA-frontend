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
import {
  Database, LayoutDashboard, Plus, LogOut, ChevronLeft, ChevronRight,
  Settings, ExternalLink,
} from 'lucide-react'

/** Sidebar navigation items. */
const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview', end: true },
  { to: '/dashboard/databases', icon: Database, label: 'Databases' },
]

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#09090B] flex">
      {/* Sidebar */}
      <aside
        className={`aba-sidebar sticky top-0 h-screen flex flex-col border-r border-[#2B2D31] bg-[#111217] z-40 ${
          collapsed ? 'w-[60px]' : 'w-[240px]'
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#2B2D31]">
          <div className="w-7 h-7 rounded-[8px] bg-[#3B82F6] flex items-center justify-center shrink-0">
            <span className="text-white text-[12px] font-bold">A</span>
          </div>
          {!collapsed && <span className="text-[15px] font-semibold text-[#F5F5F5]">ABA</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1E2D4A] text-[#60A5FA] border border-[#1E3A6E]'
                    : 'text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#18181B] border border-transparent'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <item.icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Quick action */}
        <div className="px-2 pb-2">
          <button
            onClick={() => navigate('/dashboard/new')}
            className={`flex items-center gap-2.5 h-9 rounded-[8px] bg-[#3B82F6] text-[13px] font-medium text-white hover:bg-[#2563EB] transition-all duration-150 cursor-pointer w-full ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
          >
            <Plus size={15} className="shrink-0" />
            {!collapsed && <span>New Database</span>}
          </button>
        </div>

        {/* Bottom section */}
        <div className="border-t border-[#2B2D31] p-2 space-y-0.5">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-[#18181B] text-[#F5F5F5]'
                  : 'text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#18181B]'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <Settings size={16} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-2.5 h-9 px-2.5 rounded-[8px] text-[13px] font-medium text-[#71717A] hover:text-[#EF4444] hover:bg-[#2A1010] transition-all cursor-pointer w-full ${
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
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#18181B] border border-[#2B2D31] flex items-center justify-center text-[#71717A] hover:text-[#F5F5F5] hover:bg-[#1C1C1F] transition-all cursor-pointer z-50"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 border-b border-[#2B2D31] bg-[#09090B]/80 backdrop-blur-md flex items-center justify-between px-6">
          <div />
          <div className="flex items-center gap-4">
            <a
              href="https://aba.andrescortes.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[13px] text-[#71717A] hover:text-[#A1A1AA] transition-colors"
            >
              <ExternalLink size={13} />
              Main site
            </a>
            {user && (
              <div className="flex items-center gap-2.5">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1E2D4A] border border-[#1E3A6E] flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-[#60A5FA]">
                      {user.nombre?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <span className="text-[13px] text-[#A1A1AA] hidden sm:inline">{user.nombre}</span>
              </div>
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
