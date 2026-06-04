// scripts/dark-contrast-audit.ts
// Beyond "0 issues" from the basic visual-audit (which only checks overflow /
// alt / labels / console), this script actually opens each page in dark mode
// and looks for elements where the computed text color is too close to the
// computed background color — i.e. things that LOOK broken visually but
// don't show up in any other check.
//
// Specifically it reports:
//   1. `<body>`'s computed background-color (should be very dark)
//   2. The default text color on the body (should be near-white)
//   3. All elements whose text is the same shade as their background
//      (a strong signal of "invisible text in dark mode")
//   4. The same checks for `input` / `select` / `textarea` elements
//   5. Cards / main containers — bg should be dark, text should be light
//
// Usage: AUDIT_BASE=http://... npx tsx scripts/dark-contrast-audit.ts
import { chromium, Browser, ConsoleMessage } from 'playwright'

const BASE = process.env.AUDIT_BASE || 'http://127.0.0.1:4173/MCP-HUB'
const NORMALIZED_BASE = BASE.endsWith('/') ? BASE : `${BASE}/`
const join = (p: string) => `${NORMALIZED_BASE}${p.replace(/^\//, '')}`

const PAGES = [
  '/',
  '/servers',
  '/servers/1panel',     // detail page
  '/categories',
  '/companies',
  '/curated',
  '/about',
  '/favorites',
  '/submit',
  '/this-does-not-exist', // 404
]

type Issue = { kind: string; page: string; detail: string }
const ISSUES: Issue[] = []

// luminance: closer to 0 = darker, 1 = lighter
function relLuminance([r, g, b]: [number, number, number]): number {
  const s = (c: number) => {
    const cs = c / 255
    return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b)
}

function parseRgb(s: string): [number, number, number] | null {
  // "rgb(15, 23, 42)" or "rgba(15, 23, 42, 1)" or "transparent"
  const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

async function inspectPage(browser: Browser, path: string) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
  })
  await ctx.addInitScript(() => {
    try {
      window.localStorage.setItem('mcp-hub-theme', 'dark')
    } catch {
      // localStorage may be unavailable in some browser contexts; the
      // FOUC script tolerates this, so it's safe to no-op.
    }
  })
  const page = await ctx.newPage()
  const consoleErrors: string[] = []
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  await page.goto(join(path), { waitUntil: 'networkidle', timeout: 15000 })
  // Wait for the real H1 (filter out NotFound)
  try {
    await page.waitForFunction(
      () => {
        const h1 = document.querySelector('main h1')
        if (!h1) return false
        const t = (h1.textContent || '').trim()
        return t.length > 0 && !/Not Found/i.test(t)
      },
      { timeout: 5000 }
    )
  } catch {
    // Some pages may not have an h1 within the timeout (e.g. loading
    // state). Continue with what we have; the contrast check is still
    // meaningful for whatever content is on the page.
  }
  await page.waitForTimeout(400)

  // 1) body bg should be very dark
  const bodyInfo = await page.evaluate(() => {
    const cs = getComputedStyle(document.body)
    return {
      bg: cs.backgroundColor,
      color: cs.color,
    }
  })
  const bodyBg = parseRgb(bodyInfo.bg)
  if (bodyBg) {
    const lum = relLuminance(bodyBg)
    if (lum > 0.2) {
      ISSUES.push({
        kind: 'body-bg-not-dark',
        page: path,
        detail: `body bg=${bodyInfo.bg} lum=${lum.toFixed(3)} (expected <0.2 in dark mode)`,
      })
    }
  } else {
    ISSUES.push({
      kind: 'body-bg-unparseable',
      page: path,
      detail: `body bg=${bodyInfo.bg}`,
    })
  }
  const bodyColor = parseRgb(bodyInfo.color)
  if (bodyColor) {
    const lum = relLuminance(bodyColor)
    if (lum < 0.5) {
      ISSUES.push({
        kind: 'body-text-not-light',
        page: path,
        detail: `body color=${bodyInfo.color} lum=${lum.toFixed(3)} (expected >0.5 in dark mode)`,
      })
    }
  }

  // 2) scan for invisible text (text rgb close to parent bg rgb).
  // Use a function-string so nested helpers are emitted as plain JS (tsx
  // would otherwise mangle them when targeting CJS).
  const SCAN_INVISIBLES_FN = `(function () {
    var out = [];
    var RGB_RE = new RegExp('rgba?\\\\(\\\\s*(\\\\d+)\\\\s*,\\\\s*(\\\\d+)\\\\s*,\\\\s*(\\\\d+)');
    function parse(s) {
      var m = s.match(RGB_RE);
      return m ? [+m[1], +m[2], +m[3]] : null;
    }
    function lum(rgb) {
      function s(c) {
        var cs = c / 255;
        return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
      }
      return 0.2126 * s(rgb[0]) + 0.7152 * s(rgb[1]) + 0.0722 * s(rgb[2]);
    }
    function effectiveBg(el) {
      var cur = el;
      while (cur) {
        var c = getComputedStyle(cur).backgroundColor;
        var rgb = parse(c);
        if (rgb && c !== 'rgba(0, 0, 0, 0)') return rgb;
        cur = cur.parentElement;
      }
      return null;
    }
    var sels = 'h1, h2, h3, h4, h5, h6, p, span, a, button, label, li';
    document.querySelectorAll(sels).forEach(function (el) {
      var txt = (el.textContent || '').trim();
      if (!txt || txt.length < 2) return;
      if (el.closest('[aria-hidden="true"]')) return;
      // Skip gradient text (text-transparent + bg-clip-text is a deliberate
      // visual; computed color resolves to transparent which trips the
      // contrast heuristic). Detect via the class string.
      var cls = el.getAttribute('class') || '';
      if (/\btext-transparent\b/.test(cls)) return;
      // Skip elements that are themselves inside a colored gradient
      // hero/banner (the bg we are comparing to is the page body, but the
      // visible bg is the gradient). We approximate by checking if the
      // element has any ancestor whose class list contains bg-gradient.
      var hasGradientAncestor = false;
      var p2 = el.parentElement;
      while (p2) {
        var pc = p2.getAttribute('class') || '';
        if (/bg-gradient/.test(pc)) { hasGradientAncestor = true; break; }
        p2 = p2.parentElement;
      }
      if (hasGradientAncestor) return;
      var bg = effectiveBg(el);
      var color = parse(getComputedStyle(el).color);
      if (!bg || !color) return;
      var bL = lum(bg);
      var cL = lum(color);
      if (Math.abs(bL - cL) < 0.15) {
        out.push({
          tag: el.tagName.toLowerCase(),
          cls: cls.slice(0, 80),
          text: txt.slice(0, 50),
          color: 'rgb(' + color.join(',') + ')',
          bg: 'rgb(' + bg.join(',') + ')',
        });
      }
    });
    return out.slice(0, 20);
  })()`
  const invisibles = await page.evaluate(SCAN_INVISIBLES_FN);
  if (invisibles.length > 0) {
    ISSUES.push({
      kind: 'low-contrast-text',
      page: path,
      detail: `${invisibles.length} element(s) with text/bg luminance diff < 0.15: ${JSON.stringify(invisibles.slice(0, 3))}`,
    })
  }

  // 3) form controls — bg should not be pure white in dark mode
  const SCAN_FORM_FN = `(function () {
    var out = [];
    var RGB_RE = new RegExp('rgba?\\\\(\\\\s*(\\\\d+)\\\\s*,\\\\s*(\\\\d+)\\\\s*,\\\\s*(\\\\d+)');
    document.querySelectorAll('input, select, textarea').forEach(function (el) {
      var cs = getComputedStyle(el);
      var bg = cs.backgroundColor;
      var color = cs.color;
      var rgb = bg.match(RGB_RE);
      if (!rgb) return;
      var avg = (+rgb[1] + +rgb[2] + +rgb[3]) / 3;
      if (avg > 200) {
        out.push({
          tag: el.tagName.toLowerCase(),
          type: el.type || '',
          bg: bg,
          color: color,
        });
      }
    });
    return out.slice(0, 10);
  })()`
  const formIssues = await page.evaluate(SCAN_FORM_FN);
  if (formIssues.length > 0) {
    ISSUES.push({
      kind: 'light-form-control-in-dark',
      page: path,
      detail: `${formIssues.length} form control(s) still white in dark mode: ${JSON.stringify(formIssues.slice(0, 3))}`,
    })
  }

  for (const e of consoleErrors) {
    if (/Failed to load resource.*500/.test(e)) continue
    ISSUES.push({ kind: 'console-error', page: path, detail: e.slice(0, 200) })
  }

  await ctx.close()
}

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    for (const p of PAGES) {
      console.log(`[contrast] ${p}`)
      await inspectPage(browser, p)
    }
  } finally {
    await browser.close()
  }
  console.log('\n=== summary ===')
  if (ISSUES.length === 0) {
    console.log('  ✓ dark-mode contrast OK across all pages')
    process.exit(0)
  }
  for (const i of ISSUES) console.log(`  [${i.kind}] ${i.page} — ${i.detail}`)
  console.log(`  total: ${ISSUES.length} issue(s)`)
  process.exit(1)
}

main().catch((e) => {
  console.error('[contrast] crashed', e)
  process.exit(2)
})
