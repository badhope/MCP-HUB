/* eslint-disable no-console */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SVG = fs.readFileSync(path.resolve('public/favicon.svg'), 'utf8');
const SIZES = [192, 512];

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: size, height: size } });
    const page = await ctx.newPage();
    const html = `<!doctype html><html><head><style>
      html,body{margin:0;padding:0;background:#0A0B0D;}
      svg{width:${size}px;height:${size}px;display:block;}
    </style></head><body>${SVG}</body></html>`;
    await page.setContent(html);
    await page.waitForTimeout(200);
    const out = path.resolve('public', `icon-${size}.png`);
    await page.locator('svg').screenshot({ path: out, omitBackground: false });
    console.log(`wrote ${out} (${size}x${size})`);
    await ctx.close();
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
