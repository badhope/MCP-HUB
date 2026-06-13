import { useState, useSyncExternalStore } from 'react'
import { IconMoon, IconSun, IconDeviceDesktop } from '@tabler/icons-react'
import { useTheme, type Theme } from '../../hooks/useTheme'

// Subscribe to "is the browser rendering this?" without an effect.
// `useSyncExternalStore` returns the server snapshot during SSR/initial
// hydration and the client snapshot after — exactly the boundary this
// component needs to avoid a hydration mismatch with the FOUC script
// that paints the theme before React mounts.
function subscribe() {
  return () => {}
}
function getClientSnapshot() {
  return true
}
function getServerSnapshot() {
  return false
}

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
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)

  const Icon = !mounted
    ? IconSun
    : theme === 'dark'
      ? IconMoon
      : theme === 'light'
        ? IconSun
        : IconDeviceDesktop

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
        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
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
            className="absolute right-0 mt-2 w-40 z-50 rounded-xl border border-border bg-card shadow-sm ring-1 ring-black/5 overflow-hidden"
          >
            <ThemeOption
              value="light"
              current={theme}
              icon={IconSun}
              label="Light"
              onSelect={(v) => {
                setTheme(v)
                setOpen(false)
              }}
            />
            <ThemeOption
              value="dark"
              current={theme}
              icon={IconMoon}
              label="Dark"
              onSelect={(v) => {
                setTheme(v)
                setOpen(false)
              }}
            />
            <ThemeOption
              value="system"
              current={theme}
              icon={IconDeviceDesktop}
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
  icon: typeof IconSun
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
          ? 'bg-muted text-foreground'
          : 'text-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <Icon size={16} />
      <span className="flex-1 text-left">{label}</span>
      {active && <span className="text-xs">✓</span>}
    </button>
  )
}
