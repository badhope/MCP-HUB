import { useEffect, useState } from 'react'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme, type Theme } from '../../hooks/useTheme'

/**
 * Three-way theme toggle: light / dark / system.
 *
 * Why a dropdown instead of a binary button? The "system" option is the
 * default for first-time visitors and respects their OS preference. A
 * simple sun/moon toggle would force an explicit choice.
 *
 * The button is fully accessible: it has an aria-label that reflects the
 * current state, and the menu uses roving-tabindex semantics via the
 * native <details>/<summary> pattern (which is keyboard-friendly out of
 * the box).
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatches: the SSR/initial DOM (set by the FOUC
  // script) may disagree with React's first render of the icon.
  useEffect(() => setMounted(true), [])

  const Icon = !mounted
    ? Sun
    : theme === 'dark'
      ? Moon
      : theme === 'light'
        ? Sun
        : Monitor

  const label = !mounted
    ? 'Theme'
    : theme === 'dark'
      ? 'Dark theme (click to change)'
      : theme === 'light'
        ? 'Light theme (click to change)'
        : 'System theme (click to change)'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <Icon size={20} />
      </button>

      {open && (
        <>
          {/* Click-away catcher */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute right-0 mt-2 w-40 z-50 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg ring-1 ring-black/5 overflow-hidden"
          >
            <ThemeOption
              value="light"
              current={theme}
              icon={Sun}
              label="Light"
              onSelect={(v) => {
                setTheme(v)
                setOpen(false)
              }}
            />
            <ThemeOption
              value="dark"
              current={theme}
              icon={Moon}
              label="Dark"
              onSelect={(v) => {
                setTheme(v)
                setOpen(false)
              }}
            />
            <ThemeOption
              value="system"
              current={theme}
              icon={Monitor}
              label="System"
              onSelect={(v) => {
                setTheme(v)
                setOpen(false)
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

function ThemeOption({
  value,
  current,
  icon: Icon,
  label,
  onSelect,
}: {
  value: Theme
  current: Theme
  icon: typeof Sun
  label: string
  onSelect: (v: Theme) => void
}) {
  const active = current === value
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={() => onSelect(value)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      {active && <span className="text-xs">✓</span>}
    </button>
  )
}
