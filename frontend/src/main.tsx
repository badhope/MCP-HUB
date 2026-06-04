import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { HelmetProvider } from 'react-helmet-async'
import { queryClient } from './lib/queryClient'
import { initUserStoreSync } from './store/useUserStore'
import App from './App'
import './index.css'

// Hydrate the local user store from localStorage so the first render
// already reflects any previously-saved favorites/ratings/etc.
initUserStoreSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </HelmetProvider>
  </StrictMode>,
)

// Register the PWA service worker (no-op in dev with the dev server, but
// always active in production). Failures are silent — the app still works
// online without cache.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`.replace(/\/+/g, '/').replace(/^([^/])/, '/$1')
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn('[pwa] service worker registration failed:', err)
    })
  })
}