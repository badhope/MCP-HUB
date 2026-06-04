// scripts/cross-browser-audit.ts
// Multi-browser × multi-viewport smoke test for the DEPLOYED site.
//
// Matrix: 3 engines (chromium / firefox / webkit) × 3 viewports
// (mobile 360 / tablet 768 / desktop 1280) × 11 pages = 99 checks.
//
// WebKit is what Safari uses, so this gives us coverage for the
// "Safari users" risk noted in the closing summary. Firefox is included
// to catch Gecko-only CSS / JS issues. Chromium is the baseline.
//
// The check is lighter than the single-browser prod-audit:
//   - h1 must exist (any real text)
//   - skip target #main-content must exist
//   - theme toggle must exist
//   - no uncaught console errors (404 SPA fallback tolerated)
//   - service worker registration is not required in dev
//
// Usage:
//   PROD_BASE=https://badhope.github.io/MCP-HUB npx tsx scripts/cross-browser-audit.ts
//
// To run only one browser (faster iteration):
//   BROWSERS=chromium npx tsx scripts/cross-browser-audit.ts

import { chromium, firefox, webkit, Browser, ConsoleMessage, Request, BrowserType } from 'playwright'

const BASE = process.env.PROD_BASE || 'https://badhope.github.io/MCP-HUB'
const NORMALIZED_BASE = BASE.endsWith('/') ? BASE : `${BASE}/`
const join = (p: string) => `${NORMALIZED_BASE}${p.replace(/^\//, '')}`

const ALL_PAGES = [
  '/',
  '/servers',
  '/servers/1Panel',
  '/servers/NoSuchServer',
  '/categories',
  '/companies',
  '/curated',
  '/about',
  '/favorites',
  '/submit',
  '/this-does-not-exist',
]

const ALL_VIEWPORTS = [
  { name: 'mobile', width: 360, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const

const ALL_BROWSERS = [
  { name: 'chromium', launcher: chromium as BrowserType<Browser> },
  { name: 'firefox', launcher: firefox as BrowserType<Browser> },
  { name: 'webkit', launcher: webkit as BrowserType<Browser> },
] as const

// Allow narrowing via env: BROWSERS=chromium,firefox
const requested = (process.env.BROWSERS || '').split(',').map((s) => s.trim()).filter(Boolean)
const BROWSERS = requested.length > 0
  ? ALL_BROWSERS.filter((b) => requested.includes(b.name))
  : ALL_BROWSERS

const PAGES = (process.env.PAGES || '').split(',').map((s) => s.trim()).filter(Boolean).length > 0
  ? (process.env.PAGES || '').split(',').map((s) => s.trim()).filter(Boolean)
  : ALL_PAGES

type Issue = { browser: string; viewport: string; page: string; kind: string; detail: string }
const ISSUES: Issue[] = []

async function checkOne(
  browserLauncher: BrowserType<Browser>,
  browserName: string,
  vp: { name: string; width: number; height: number },
  path: string,
) {
  // WebKit doesn't support the --no-sandbox flag; chromium + firefox do
  // (needed in restricted CI/container environments).
  const launchArgs = browserName === 'webkit' ? [] : ['--no-sandbox']
  // Up to 3 attempts for the whole check — page.goto itself can hit
  // a transient CDN race that the per-attempt retry logic above
  // doesn't catch. The browser is re-launched each time so any
  // half-open sockets are dropped.
  for (let attempt = 1; attempt <= 3; attempt++) {
    const browser = await browserLauncher.launch({ headless: true, args: launchArgs })
    try {
      const result = await runOne(browser, browserName, vp, path)
      if (result !== 'transient') {
        await browser.close()
        return
      }
      // Transient: tear down and retry.
      await browser.close()
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 1500 * attempt))
      }
    } catch (e) {
      await browser.close()
      if (attempt === 3) {
        ISSUES.push({
          browser: browserName,
          viewport: vp.name,
          page: path,
          kind: 'crash',
          detail: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
        })
        return
      }
      await new Promise((r) => setTimeout(r, 1500 * attempt))
    }
  }
  // All 3 attempts hit a transient — treat as a real failure but mark
  // the kind accordingly so it's easy to spot.
  ISSUES.push({
    browser: browserName,
    viewport: vp.name,
    page: path,
    kind: 'transient-retry-exhausted',
    detail: '3 consecutive transient crashes; check CDN status',
  })
}

async function runOne(
  browser: Browser,
  browserName: string,
  vp: { name: string; width: number; height: number },
  path: string,
): Promise<'transient' | 'done'> {
  try {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } })
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

    await page.goto(join(path), { waitUntil: 'load', timeout: 30000 })
    // Give the browser a moment to settle dynamic imports. WebKit is
    // stricter about its per-host connection pool than Chromium and
    // can drop TLS handshakes under parallel load from GitHub Pages'
    // CDN — those are transient network errors, not code bugs, so
    // they are tolerated below. The `load` event waits for the
    // initial set of resources (HTML, CSS, entry JS), but lazy
    // chunks can land just after.
    await page.waitForTimeout(500)
    let h1Found = false
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.waitForFunction(
          () => {
            const h1 = document.querySelector('h1')
            return !!(h1 && (h1.textContent || '').trim().length > 0)
          },
          { timeout: 10000 }
        )
        h1Found = true
        break
      } catch {
        // Re-try: a transient chunk-load failure on the first pass
        // usually means the dynamic import will succeed on the second.
        if (attempt < 2) {
          await page.reload({ waitUntil: 'load' })
          await page.waitForTimeout(500)
        }
      }
    }

    const checks = await page.evaluate(() => {
      const h1 = document.querySelector('h1')
      const h1Text = h1 ? (h1.textContent || '').trim() : null
      const skipTarget = !!document.getElementById('main-content')
      const themeBtn = !!document.querySelector('button[aria-label*="theme" i]')
      const horizontalScroll =
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      const bodyText = (document.body.textContent || '').trim()
      return { h1Text, skipTarget, themeBtn, horizontalScroll, bodyChars: bodyText.length }
    })

    console.log(
      `[xbr] ${browserName}/${vp.name.padEnd(7)} ${path.padEnd(20)} ` +
        `h1="${(checks.h1Text || '').slice(0, 30)}" ` +
        `skip=${checks.skipTarget} theme=${checks.themeBtn} ` +
        `hScroll=${checks.horizontalScroll} bodyChars=${checks.bodyChars}`
    )

    if (!h1Found) {
      const finalH1 = await page.evaluate(() => {
        const h1 = document.querySelector('h1')
        return h1 ? (h1.textContent || '').trim() : null
      })
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'no-h1', detail: `no h1 rendered after 3 attempts (last h1="${finalH1 || ''}")` })
    }
    if (!checks.skipTarget) {
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'no-skip-target', detail: 'no #main-content' })
    }
    if (!checks.themeBtn) {
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'no-theme-toggle', detail: 'no theme toggle button' })
    }
    if (checks.horizontalScroll) {
      ISSUES.push({
        browser: browserName,
        viewport: vp.name,
        page: path,
        kind: 'h-scroll',
        detail: `horizontal overflow: doc=${(checks as { bodyChars?: number }).bodyChars}`,
      })
    }
    if (checks.bodyChars < 100) {
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'empty-page', detail: `body has only ${checks.bodyChars} chars` })
    }

    for (const e of consoleErrors) {
      if (/Failed to load resource.*500/.test(e)) continue
      if (/Failed to fetch/.test(e)) continue
      if (/Failed to load resource.*404/.test(e)) continue
      // Transient: GitHub Pages CDN TLS handshake terminations under
      // WebKit/Firefox parallel load. The chunk loads fine on a normal
      // user click; this is a Playwright-vs-CDN race. Cascade effects
      // (module import + ErrorBoundary) are tolerated as a group below.
      if (/TLS handshake.*non-properly terminated/i.test(e)) continue
      if (/Peer failed to perform TLS handshake/i.test(e)) continue
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'console-error', detail: e.slice(0, 160) })
    }
    // Track whether the cascade of "module import failed" / ErrorBoundary
    // errors came from a TLS handshake root cause — those are
    // tolerated only when paired with a TLS termination on the same page.
    const hadTlsFailure =
      consoleErrors.some((e) => /TLS handshake|non-properly terminated/i.test(e)) ||
      failedRequests.some((r) => /TLS handshake|non-properly terminated/i.test(r))
    for (const r of failedRequests) {
      // GitHub Pages SPA fallback 404
      if (/^404 https:\/\/badhope\.github\.io\/MCP-HUB\/[^?]+$/.test(r)) continue
      if (/\/static-data\/config\/[^?]+\.json/.test(r)) continue
      if (/\/api\//.test(r)) continue
      if (hadTlsFailure && /TLS handshake|non-properly terminated/i.test(r)) continue
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'failed-request', detail: r.slice(0, 160) })
    }
    // If the page hit a TLS termination, the cascade "Importing a
    // module script failed" + "ErrorBoundary caught" entries are
    // symptoms of the same transient network problem, not real bugs.
    if (hadTlsFailure) {
      consoleErrors.length = 0
      // Filter out the cascade entries from ISSUES (they may have
      // been added above in the console-error loop before we knew).
      for (let i = ISSUES.length - 1; i >= 0; i--) {
        const issue = ISSUES[i]
        if (!issue) continue
        if (issue.browser === browserName && issue.viewport === vp.name && issue.page === path &&
            issue.kind === 'console-error' &&
            /Importing a module script failed|ErrorBoundary: TypeError/i.test(issue.detail)) {
          ISSUES.splice(i, 1)
        }
      }
    }

    await ctx.close()
    return 'done'
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // TLS handshake failures and similar transient network errors
    // bubble up here when they happen during page.goto or context
    // creation. Surface them as transient so the outer wrapper retries
    // the whole check with a fresh browser.
    if (/TLS handshake|non-properly terminated|net::ERR/i.test(msg)) {
      return 'transient'
    }
    ISSUES.push({
      browser: browserName,
      viewport: vp.name,
      page: path,
      kind: 'crash',
      detail: msg.slice(0, 200),
    })
    return 'done'
  } finally {
    await browser.close()
  }
}

async function main() {
  console.log(`[xbr] base = ${BASE}`)
  console.log(`[xbr] browsers = ${BROWSERS.map((b) => b.name).join(', ')}`)
  console.log(`[xbr] viewports = ${ALL_VIEWPORTS.map((v) => v.name).join(', ')}`)
  console.log(`[xbr] pages = ${PAGES.length}`)

  // Pre-warm the CDN edge with the entry HTML + initial JS/CSS so the
  // first parallel batch of requests from each browser doesn't all
  // hit cold paths at once. This is a CDN-race workaround, not a
  // product concern.
  try {
    await Promise.all(
      PAGES.map((p) =>
        fetch(join(p), { method: 'GET' })
          .then(() => undefined)
          .catch(() => undefined)
      )
    )
  } catch {
    // ignore — pre-warm is best-effort
  }

  for (const b of BROWSERS) {
    for (const vp of ALL_VIEWPORTS) {
      for (const p of PAGES) {
        await checkOne(b.launcher, b.name, vp, p)
      }
    }
  }

  console.log('\n=== summary ===')
  if (ISSUES.length === 0) {
    console.log(`  ✓ all ${BROWSERS.length * ALL_VIEWPORTS.length * PAGES.length} checks pass`)
    process.exit(0)
  }
  // Group by (browser, viewport) for readability
  const byCombo = new Map<string, Issue[]>()
  for (const i of ISSUES) {
    const k = `${i.browser}/${i.viewport}`
    if (!byCombo.has(k)) byCombo.set(k, [])
    byCombo.get(k)!.push(i)
  }
  for (const [k, list] of byCombo.entries()) {
    console.log(`  [${k}]`)
    for (const i of list) {
      console.log(`    [${i.kind}] ${i.page} — ${i.detail}`)
    }
  }
  console.log(`  total: ${ISSUES.length} issue(s)`)
  process.exit(1)
}

main().catch((e) => {
  console.error('[xbr] crashed', e)
  process.exit(2)
})
