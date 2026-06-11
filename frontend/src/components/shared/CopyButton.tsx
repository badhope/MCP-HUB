/**
 * CopyButton — click to copy a string to the clipboard, with a brief
 * "Copied!" state. Used by InstallPanel (1-line install commands),
 * UniversalConfig (the JSON snippet), and ServerDetail (GitHub URL,
 * etc.).
 *
 * Why a shared component: the click feedback + a11y label + fallback
 * for non-secure-context environments were copy-pasted in 4 places
 * before. Centralizing the implementation removes drift.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface CopyButtonProps {
  /** The string to copy. */
  value: string;
  /** Optional label; shown next to the icon. Defaults to "Copy". */
  label?: string;
  /** Optional className passthrough for layout. */
  className?: string;
  /** Whether to use the compact icon-only variant. */
  iconOnly?: boolean;
  /** Variant for color theming. */
  variant?: 'default' | 'primary' | 'ghost';
  /** Called after a successful copy (useful for analytics). */
  onCopied?: () => void;
}

/**
 * Fallback for non-secure-context (http://) environments where
 * `navigator.clipboard.writeText` is not available.
 * We use a hidden textarea + document.execCommand('copy').
 */
function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'Copy',
  className = '',
  iconOnly = false,
  variant = 'default',
  onCopied,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = useCallback(async () => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        ok = true;
      } else {
        ok = legacyCopy(value);
      }
    } catch {
      ok = legacyCopy(value);
    }
    if (ok) {
      setCopied(true);
      onCopied?.();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1800);
    }
  }, [value, onCopied]);

  const palette = {
    default: copied
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800'
      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800',
    primary: copied
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700',
    ghost: copied
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white',
  }[variant];

  const a11yLabel = copied ? 'Copied' : label;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={a11yLabel}
      title={a11yLabel}
      className={`inline-flex items-center gap-1.5 border rounded-lg text-sm font-medium transition-all duration-150 ${palette} ${
        iconOnly ? 'p-1.5' : 'px-3 py-1.5'
      } ${className}`}
    >
      {copied ? <Check size={iconOnly ? 14 : 16} /> : <Copy size={iconOnly ? 14 : 16} />}
      {!iconOnly && <span>{copied ? 'Copied' : label}</span>}
    </button>
  );
};
