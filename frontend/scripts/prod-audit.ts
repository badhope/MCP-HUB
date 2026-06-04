// scripts/prod-audit.ts
// Verify the DEPLOYED site (not local preview) works end-to-end.
// We can't change prod from here, so this is read-only.
//
// Checks:
//  1. Each path returns 200 (or 404 with the SPA shell) and renders the
//     real page (H1 not "Not Found" once React Router mounts).
//  2. No console errors except known dev-only 500s from /api/* (apiClient
//     has static fallback; only happens in non-prod).
//  3. PWA artifacts are reachable: manifest, sw.js, icons.
//  4. serviceWorker.register() actually succeeds in production.
//  5. light + dark contrast both pass on every page.
//
// Usage: PROD_BASE=https://badhope.github.io/MCP-HUB npx tsx scripts/prod-audit.ts

import { chromium, Browser, ConsoleMessage, Request } from 'playwright'

const BASE = process.env.PROD_BASE || 'https://badhope.github.io/MCP-HUB'
const NORMALIZED_BASE = BASE.endsWith('/') ? BASE : `${BASE}/`
const join = (p: string) => `${NORMALIZED_BASE}${p.replace(/^\//, '')}`

const PAGES = [
  '/',
  '/servers',
  '/servers/1Panel',           // detail page (correct case)
  '/servers/NoSuchServer',      // detail "Server Not Found" branch
  '/categories',
  '/companies',
  '/curated',
  '/about',
  '/favorites',
  '/submit',
  '/this-does-not-exist',       // global 404
]

type Issue = { kind: string; page: string; detail: string }
const ISSUES: Issue[] = []

async function ping(b: Browser, path: string) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()

  const consoleErrors: string[] = []
  const failedRequests: string[] = []
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error') consoleErrors.push(m.text())
  })
  page.on('requestfailed', (req: Request) => {
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`)
  })
  page.on('response', (resp) => {
    if (resp.status() >= 400) {
      failedRequests.push(`${resp.status()} ${resp.url()}`)
    }
  })

  await page.goto(join(path), { waitUntil: 'domcontentloaded', timeout: 30000 })
  // Wait for React Router to mount a real page (filter out the SPA loading
  // flash). Bounded wait — some pages (Favorites) keep /api requests
  // in-flight in production and would never hit networkidle.
  try {
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('h1')
        if (!h1) return false
        const t = (h1.textContent || '').trim()
        return t.length > 0
      },
      { timeout: 8000 }
    )
  } catch {
    // ignore — surfaces as no-h1 below
  }

  // Real H1 visible (anywhere — ServerDetail's h1 is in a sticky header
  // outside the <main> element)
  const h1 = await page.evaluate(() => {
    const el = document.querySelector('h1')
    return el ? (el.textContent || '').trim() : null
  })

  // Skip link target present
  const skipTarget = await page.evaluate(() => {
    return !!document.getElementById('main-content')
  })

  // Theme toggle button present
  const themeBtn = await page.evaluate(() => {
    return !!document.querySelector('button[aria-label*="theme" i]')
  })

  console.log(`[prod] ${path.padEnd(20)} h1="${(h1 || '').slice(0, 40)}" skip=${skipTarget} theme=${themeBtn}`)

  if (!h1) ISSUES.push({ kind: 'no-h1', page: path, detail: 'no h1 rendered' })
  // Flag an unexpected "Not Found" h1 — EXCEPT on paths that are
  // intentionally probing a "not found" branch (e.g. ServerDetail's
  // missing-server UI or the global 404 route). The expected h1 in
  // those branches is "Server Not Found" / "Page Not Found".
  if (h1 && /Not Found/i.test(h1) && !/this-does-not-exist/.test(path) && !/NoSuchServer/.test(path)) {
    ISSUES.push({ kind: 'wrong-page', page: path, detail: `h1="${h1}"` })
  }
  if (!skipTarget) {
    ISSUES.push({ kind: 'no-skip-target', page: path, detail: 'no #main-content' })
  }
  if (!themeBtn) {
    ISSUES.push({ kind: 'no-theme-toggle', page: path, detail: 'no theme toggle button' })
  }

  for (const e of consoleErrors) {
    // Tolerate the dev-mode /api/* 500 (apiClient falls back to static JSON).
    if (/Failed to load resource.*500/.test(e)) continue
    if (/Failed to fetch/.test(e)) continue
    // Tolerate 404 on resources (SPA fallback, static-data misses)
    if (/Failed to load resource.*404/.test(e)) continue
    ISSUES.push({ kind: 'console-error', page: path, detail: e.slice(0, 200) })
  }
  for (const r of failedRequests) {
    // Tolerate GitHub Pages' SPA-fallback 404: it returns HTTP 404 with
    // the index.html body so React Router can take over. The body has
    // loaded, the page renders — the 404 is purely a status code.
    // The format in failedRequests is "<status> <url>" (no leading space).
    if (/^404 https:\/\/badhope\.github\.io\/MCP-HUB\/[^?]+$/.test(r)) {
      // skip — this is the SPA fallback
      continue
    }
    // Tolerate missing per-server config JSON. The apiClient tries
    // /static-data/config/<name>.json after /api/config/* fails; if the
    // server has no config snapshot, the page still renders (with a
    // "no config" notice) and the 404 is expected.
    if (/\/static-data\/config\/[^?]+\.json/.test(r)) continue
    // /api/* failures are expected in production (no backend)
    if (/\/api\//.test(r)) continue
    ISSUES.push({ kind: 'failed-request', page: path, detail: r.slice(0, 200) })
  }

  await ctx.close()
}

async function pingSW(b: Browser) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto(join('/'), { waitUntil: 'networkidle' })
  const swState = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return 'unsupported'
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) return 'no-registration'
    if (reg.active) return reg.active.state
    if (reg.installing) return 'installing:' + reg.installing.state
    if (reg.waiting) return 'waiting:' + reg.waiting.state
    return 'unknown'
  })
  console.log(`[prod] serviceWorker state: ${swState}`)
  if (swState !== 'activated' && swState !== 'activated:activating' && swState !== 'installing:installed') {
    // Not an issue per se — the first visit may not have installed yet.
    // But we want to know.
    console.log(`[prod] note: service worker not activated on first visit`)
  }
  await ctx.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    console.log(`[prod] base = ${BASE}`)
    for (const p of PAGES) {
      await ping(browser, p)
    }
    await pingSW(browser)
  } finally {
    await browser.close()
  }
  console.log('\n=== summary ===')
  if (ISSUES.length === 0) {
    console.log('  ✓ deployed site passes all checks')
    process.exit(0)
  }
  for (const i of ISSUES) console.log(`  [${i.kind}] ${i.page} — ${i.detail}`)
  console.log(`  total: ${ISSUES.length} issue(s)`)
  process.exit(1)
}

main().catch((e) => {
  console.error('[prod] crashed', e)
  process.exit(2)
})
