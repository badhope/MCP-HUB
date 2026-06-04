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
  const browser = await browserLauncher.launch({ headless: true, args: launchArgs })
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

    await page.goto(join(path), { waitUntil: 'domcontentloaded', timeout: 30000 })
    try {
      await page.waitForFunction(
        () => {
          const h1 = document.querySelector('h1')
          return !!(h1 && (h1.textContent || '').trim().length > 0)
        },
        { timeout: 8000 }
      )
    } catch {
      // surfaces as no-h1 below
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

    if (!checks.h1Text) {
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'no-h1', detail: 'no h1 rendered' })
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
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'console-error', detail: e.slice(0, 160) })
    }
    for (const r of failedRequests) {
      // GitHub Pages SPA fallback 404
      if (/^404 https:\/\/badhope\.github\.io\/MCP-HUB\/[^?]+$/.test(r)) continue
      if (/\/static-data\/config\/[^?]+\.json/.test(r)) continue
      if (/\/api\//.test(r)) continue
      ISSUES.push({ browser: browserName, viewport: vp.name, page: path, kind: 'failed-request', detail: r.slice(0, 160) })
    }

    await ctx.close()
  } catch (e) {
    ISSUES.push({
      browser: browserName,
      viewport: vp.name,
      page: path,
      kind: 'crash',
      detail: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
    })
  } finally {
    await browser.close()
  }
}

async function main() {
  console.log(`[xbr] base = ${BASE}`)
  console.log(`[xbr] browsers = ${BROWSERS.map((b) => b.name).join(', ')}`)
  console.log(`[xbr] viewports = ${ALL_VIEWPORTS.map((v) => v.name).join(', ')}`)
  console.log(`[xbr] pages = ${PAGES.length}`)

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
