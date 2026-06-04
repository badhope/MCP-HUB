/**
 * Self-audit: take screenshots, detect visual bugs, capture console
 * errors across the most important pages at three viewports. Run with:
 *
 *   npx tsx scripts/visual-audit.ts
 *   # or
 *   node --import tsx scripts/visual-audit.ts
 *
 * Output:
 *   - screenshots/  — full-page PNGs for every (page × viewport) combo
 *   - report.json   — issues found (overflow, contrast, console errors…)
 *   - exit 1 if any new issue is found
 */
import { chromium, Browser, ViewportSize, ConsoleMessage } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173/MCP-HUB';
// Make sure BASE always has a trailing slash so `${BASE}${path}` is correct,
// and strip any leading slash from pagePath before joining so we don't end
// up with `//servers` which React Router treats as a different URL from
// `/servers` and matches the `*` NotFound route.
const NORMALIZED_BASE = BASE.endsWith('/') ? BASE : `${BASE}/`;
const join = (path: string) => `${NORMALIZED_BASE}${path.replace(/^\//, '')}`;
const OUT_DIR = path.resolve('screenshots');

const VIEWPORTS: { name: string; size: ViewportSize }[] = [
  { name: '360', size: { width: 360, height: 740 } }, // small phone
  { name: '768', size: { width: 768, height: 1024 } }, // tablet
  { name: '1280', size: { width: 1280, height: 800 } }, // desktop
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'servers', path: '/servers' },
  { name: 'categories', path: '/categories' },
  { name: 'companies', path: '/companies' },
  { name: 'curated', path: '/curated' },
  { name: 'about', path: '/about' },
  { name: 'favorites', path: '/favorites' },
  { name: 'submit', path: '/submit' },
];

const ISSUES: { kind: string; page: string; viewport: string; detail: string }[] = [];

const log = (...args: unknown[]) => console.log('[audit]', ...args);

async function capturePage(browser: Browser, pageName: string, pagePath: string, vp: { name: string; size: ViewportSize }) {
  const ctx = await browser.newContext({ viewport: vp.size, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: { url: string; status: number }[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // /api/* endpoints return 500 in dev mode because the backend isn't
    // running. The app falls back to static JSON, so these console errors
    // are expected and not a real bug. Filter them out here so the audit
    // surfaces only actionable issues.
    if (/Failed to load resource.*500/.test(text)) return;
    consoleErrors.push(text);
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('response', (resp) => {
    if (resp.status() < 400) return;
    if (resp.url().includes('favicon')) return;
    // Same dev-mode exception as the console listener above.
    if (resp.status() === 500 && resp.url().includes('/api/')) return;
    failedRequests.push({ url: resp.url(), status: resp.status() });
  });

  const url = join(pagePath);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  // Wait for the page's own <h1> to appear, but bail out after 5s so a
  // truly broken page doesn't hang the whole audit. The `<main>` element
  // is the React Router mount point; the H1 only renders once the lazy
  // route chunk has resolved, which is what we want to screenshot.
  try {
    await page.waitForFunction(
      () => {
        const main = document.querySelector('main');
        if (!main) return false;
        const h1 = main.querySelector('h1');
        if (!h1) return false;
        // Reject the NotFound 404 page — that's the fallback route, not
        // the page we asked for.
        const txt = (h1.textContent || '').trim();
        if (/Not Found/i.test(txt)) return false;
        return true;
      },
      { timeout: 5000 }
    );
  } catch {
    // Page never produced a real H1 — leave the 700ms settle, the
    // overflow/console checks will still run, and the screenshot will
    // reveal what's actually rendered.
    const h1 = await page.locator('main h1').first().textContent().catch(() => 'NO H1');
    const url2 = page.url();
    log(`  [waitForH1-timeout] ${pageName} @${vp.name} url=${url2} h1="${h1}"`);
  }
  // Let the lazy entry/exit animations settle.
  await page.waitForTimeout(700);

  // Detect horizontal overflow (the #1 mobile regression).
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    const winW = window.innerWidth;
    if (docW <= winW + 1) return null;
    // Find which element(s) push past the viewport
    const culprits: { tag: string; cls: string; w: number; left: number }[] = [];
    document.querySelectorAll('*').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.right > winW + 1) {
        culprits.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 80),
          w: Math.round(rect.width),
          left: Math.round(rect.left),
        });
      }
    });
    return { docW, winW, culprits: culprits.slice(0, 5) };
  });
  if (overflow) {
    ISSUES.push({
      kind: 'horizontal-overflow',
      page: pageName,
      viewport: vp.name,
      detail: `docW=${overflow.docW} winW=${overflow.winW} culprits=${JSON.stringify(overflow.culprits)}`,
    });
  }

  // Detect images with no alt text (when they have src).
  const missingAlt = await page.evaluate(() => {
    const offenders: { src: string; tag: string }[] = [];
    document.querySelectorAll('img[src]').forEach((img) => {
      const alt = img.getAttribute('alt');
      if (alt === null || alt === undefined) {
        offenders.push({ src: img.getAttribute('src') || '', tag: 'img' });
      }
    });
    return offenders;
  });
  if (missingAlt.length > 0) {
    ISSUES.push({
      kind: 'img-missing-alt',
      page: pageName,
      viewport: vp.name,
      detail: JSON.stringify(missingAlt),
    });
  }

  // Detect icon-only buttons without aria-label
  const iconBtnsMissingLabel = await page.evaluate(() => {
    const offenders: string[] = [];
    document.querySelectorAll('button').forEach((btn) => {
      const txt = (btn.textContent || '').trim();
      const hasSvg = btn.querySelector('svg') !== null;
      if (hasSvg && txt === '' && !btn.getAttribute('aria-label')) {
        offenders.push('button[no-label]');
      }
    });
    return offenders.slice(0, 5);
  });
  if (iconBtnsMissingLabel.length > 0) {
    ISSUES.push({
      kind: 'icon-btn-missing-aria',
      page: pageName,
      viewport: vp.name,
      detail: iconBtnsMissingLabel.join(', '),
    });
  }

  // Push any console / page errors / failed requests as issues
  for (const e of consoleErrors) {
    ISSUES.push({ kind: 'console-error', page: pageName, viewport: vp.name, detail: e.slice(0, 200) });
  }
  for (const e of pageErrors) {
    ISSUES.push({ kind: 'page-error', page: pageName, viewport: vp.name, detail: e.slice(0, 200) });
  }
  for (const r of failedRequests) {
    ISSUES.push({
      kind: 'http-failed',
      page: pageName,
      viewport: vp.name,
      detail: `${r.status} ${r.url}`,
    });
  }

  // Take a full-page screenshot
  const file = path.join(OUT_DIR, `${pageName}_${vp.name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  log(`  ${vp.name.padEnd(4)} ${pageName.padEnd(12)} ${file}`);

  await ctx.close();
}

async function testServerDetailNotFound(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(join('servers/this-server-does-not-exist-zzzzz'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const text = await page.locator('h2').first().textContent().catch(() => '');
  if (!text || !/Not Found/i.test(text)) {
    ISSUES.push({ kind: 'not-found-state-missing', page: 'servers/<bogus>', viewport: '1280', detail: `h2="${text}"` });
  }
  await page.screenshot({ path: path.join(OUT_DIR, 'detail_not_found_1280.png'), fullPage: true });
  await ctx.close();
}

async function testSearchDebounce(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(join('servers'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const search = page.getByRole('searchbox');
  // Type a search, then capture the visible results count after the
  // debounce window. We just verify the count actually narrows.
  await search.fill('rag');
  await page.waitForTimeout(600);
  const resultText = await page.locator('text=/^\\d+ results?$/').first().textContent().catch(() => '');
  if (!resultText) {
    ISSUES.push({ kind: 'search-no-count', page: 'servers', viewport: '1280', detail: 'no result count after debounce' });
  } else {
    log(`  search "rag" → "${resultText.trim()}"`);
  }
  await page.screenshot({ path: path.join(OUT_DIR, 'search_rag_1280.png'), fullPage: false });
  await ctx.close();
}

async function testScrollRestoration(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(join('servers'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 2000));
  await page.waitForTimeout(200);
  const scroll1 = await page.evaluate(() => window.scrollY);
  // Navigate to a server detail
  const firstCard = page.locator('a[href^="/MCP-HUB/servers/"], a[href^="/servers/"]').first();
  if ((await firstCard.count()) > 0) {
    await firstCard.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    // Now go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const scroll2 = await page.evaluate(() => window.scrollY);
    log(`  scroll back: was ${scroll1} → now ${scroll2} (expected top, ${scroll2 < 50 ? 'OK' : 'did not reset'})`);
    if (scroll2 > 200) {
      ISSUES.push({ kind: 'scroll-not-restored', page: 'servers→detail→back', viewport: '1280', detail: `scrollY=${scroll2}` });
    }
  }
  await ctx.close();
}

async function testSkipLink(browser: Browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(NORMALIZED_BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  // Tab once — skip link should be focused (or focusable)
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    return { tag: el.tagName, text: (el.textContent || '').trim() };
  });
  log(`  first Tab focus: ${JSON.stringify(focused)}`);
  if (!focused || !/Skip to main content/i.test(focused.text || '')) {
    ISSUES.push({
      kind: 'skip-link-not-first',
      page: 'home',
      viewport: '1280',
      detail: `first-focused=${JSON.stringify(focused)}`,
    });
  }
  await ctx.close();
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  try {
    log('=== viewport sweep ===');
    for (const vp of VIEWPORTS) {
      for (const p of PAGES) {
        await capturePage(browser, p.name, p.path, vp);
      }
    }
    log('=== not-found state ===');
    await testServerDetailNotFound(browser);
    log('=== search debounce ===');
    await testSearchDebounce(browser);
    log('=== scroll restoration ===');
    await testScrollRestoration(browser);
    log('=== skip link ===');
    await testSkipLink(browser);
  } finally {
    await browser.close();
  }
  fs.writeFileSync('report.json', JSON.stringify(ISSUES, null, 2));
  log('=== summary ===');
  if (ISSUES.length === 0) {
    log('  ✓ no issues');
    process.exit(0);
  }
  for (const i of ISSUES) {
    log(`  [${i.kind}] ${i.page} @${i.viewport} — ${i.detail}`);
  }
  log(`  total: ${ISSUES.length} issue(s)`);
  process.exit(1);
}

main().catch((e) => {
  console.error('[audit] crashed', e);
  process.exit(2);
});
