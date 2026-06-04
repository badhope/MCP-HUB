/* MCP Hub service worker. Versioned cache, app-shell precaching,
 * network-first for navigations, cache-first for hashed static assets.
 * Network-first for /api/* falls back to network (apiClient handles
 * its own static JSON fallback) — we don't want to serve stale API
 * responses.
 */
/* eslint-disable no-restricted-globals */
const VERSION = 'mcp-hub-v1';
const APP_SHELL = [
  '/MCP-HUB/',
  '/MCP-HUB/servers',
  '/MCP-HUB/categories',
  '/MCP-HUB/companies',
  '/MCP-HUB/curated',
  '/MCP-HUB/about',
  '/MCP-HUB/submit',
  '/MCP-HUB/manifest.webmanifest',
  '/MCP-HUB/favicon.svg',
  '/MCP-HUB/icon-192.png',
  '/MCP-HUB/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Don't touch cross-origin or API requests; apiClient already has
  // a static JSON fallback. Caching it would mask real backend outages.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/MCP-HUB/api/')) return;
  if (url.pathname.startsWith('/MCP-HUB/static-data/')) {
    // Static-data files change on deploy; network-first so the user
    // sees new content after an update, fall back to cache offline.
    event.respondWith(networkFirst(req));
    return;
  }

  // SPA navigations: try network, fall back to cached shell.
  if (req.mode === 'navigate') {
    event.respondWith(navigationHandler(req));
    return;
  }

  // Hashed assets (Vite emits `/assets/index-*.js`, etc.) are
  // content-addressed — safe to cache forever.
  if (url.pathname.startsWith('/MCP-HUB/assets/')) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Everything else: stale-while-revalidate so the UI is snappy.
  event.respondWith(staleWhileRevalidate(req));
});

async function navigationHandler(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(VERSION);
    cache.put(req, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch {
    const cache = await caches.open(VERSION);
    const cached =
      (await cache.match(req)) ||
      (await cache.match('/MCP-HUB/')) ||
      Response.error();
    return cached;
  }
}

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(VERSION);
    cache.put(req, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch {
    const cache = await caches.open(VERSION);
    return (await cache.match(req)) || Response.error();
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    cache.put(req, fresh.clone()).catch(() => undefined);
    return fresh;
  } catch {
    return cached || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const networkPromise = fetch(req)
    .then((fresh) => {
      cache.put(req, fresh.clone()).catch(() => undefined);
      return fresh;
    })
    .catch(() => undefined);
  return cached || (await networkPromise) || Response.error();
}
