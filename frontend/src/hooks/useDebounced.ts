import { useEffect, useState } from 'react';

/**
 * Returns `value` after it has been stable for `delay` ms. Useful for
 * search inputs so we don't refilter the catalog on every keystroke.
 */
export function useDebounced<T>(value: T, delay: number = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
