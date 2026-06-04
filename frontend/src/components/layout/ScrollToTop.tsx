import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reset scroll to the top on every route change. React Router v6 doesn't
 * restore scroll on Back/Forward; without this, returning from a deep
 * ServerDetail page lands the user in the middle of the catalog grid.
 *
 * Skip when only the hash changes (anchor navigation should keep position).
 */
export const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);
  return null;
};
