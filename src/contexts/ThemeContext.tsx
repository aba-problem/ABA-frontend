/**
 * @module contexts/ThemeContext
 * @description Theme selection for the dashboard shell (sidebar, topbar, page
 * background). Persisted in localStorage, applied via a `data-theme`
 * attribute on `<html>` so plain CSS custom properties (index.css) can react
 * to it without a re-render of the whole tree.
 *
 * Scope: this covers the DASHBOARD app shell (DashboardLayout + anything that
 * opts in via the `--aba-*` CSS variables). The public marketing pages
 * (Landing, Login) intentionally stay on the fixed dark brand look, same as
 * most SaaS products — only the authenticated app surface is themeable.
 *
 * @see index.html — inline script that applies the saved theme before mount
 *      (avoids a flash of the default theme on load)
 * @see index.css — `[data-theme="..."]` variable blocks
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type Theme = 'dark' | 'light' | 'dark-violet' | 'dark-emerald' | 'light-violet' | 'midnight'

export const THEME_OPTIONS: { value: Theme; label: string; swatch: [string, string, string] }[] = [
  { value: 'dark', label: 'Oscuro', swatch: ['#09090B', '#18181B', '#3B82F6'] },
  { value: 'light', label: 'Claro', swatch: ['#FFFFFF', '#F4F4F5', '#3B82F6'] },
  { value: 'dark-violet', label: 'Oscuro violeta', swatch: ['#0B0710', '#1B1428', '#A855F7'] },
  { value: 'dark-emerald', label: 'Oscuro esmeralda', swatch: ['#08110D', '#122019', '#10B981'] },
  { value: 'light-violet', label: 'Claro violeta', swatch: ['#FDFCFF', '#F5F1FB', '#8B5CF6'] },
  { value: 'midnight', label: 'Medianoche', swatch: ['#05070D', '#0D1220', '#22D3EE'] },
]

const STORAGE_KEY = 'aba-theme'
const VALID: readonly Theme[] = ['dark', 'light', 'dark-violet', 'dark-emerald', 'light-violet', 'midnight']

function readInitialTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return (VALID as readonly string[]).includes(stored ?? '') ? (stored as Theme) : 'dark'
  } catch {
    return 'dark'
  }
}

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Almacenamiento no disponible (modo privado, cuota llena) — el tema
      // sigue aplicado en esta sesión, solo no persiste entre recargas.
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
