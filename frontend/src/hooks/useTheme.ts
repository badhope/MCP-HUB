import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'mcp-hub-theme'

function readStored(): Theme {
  if (typeof window === 'undefined') return 'system'
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  return 'system'
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = theme === 'dark' || (theme === 'system' && prefersDark)
  root.classList.toggle('dark', dark)
}

/**
 * Theme controller.
 * - `theme` is the user-chosen preference (persisted in localStorage).
 * - `resolved` is the effective theme actually applied to the DOM.
 * - `setTheme()` updates state, persists, and re-applies immediately.
 *
 * The FOUC-prevention script in index.html applies the initial class on
 * first paint, so this hook only needs to keep state in sync afterwards.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => readStored())

  // Apply on mount + whenever theme changes.
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // If user chose "system", react to OS-level changes live.
  useEffect(() => {
    if (theme !== 'system') return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mql.addEventListener?.('change', onChange)
    return () => mql.removeEventListener?.('change', onChange)
  }, [theme])

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    try {
      if (next === 'system') {
        window.localStorage.removeItem(STORAGE_KEY)
      } else {
        window.localStorage.setItem(STORAGE_KEY, next)
      }
    } catch {
      // localStorage may be unavailable (private mode, quota, etc.)
    }
  }, [])

  const toggle = useCallback(() => {
    const root = document.documentElement
    setThemeState(root.classList.contains('dark') ? 'light' : 'dark')
    try {
      const isDark = root.classList.contains('dark')
      window.localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light')
    } catch {
      // ignore
    }
  }, [])

  return { theme, setTheme, toggle }
}
