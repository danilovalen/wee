import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const OUT = process.argv[2];
await serve(4393);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.addInitScript(() => { window.__noTutorial = true; });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('http://localhost:4393/'); await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/l-menu.png` });
await p.click('#menuUnlock'); await p.click('#menuLooks'); await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/l-page.png`, fullPage: true });
for (const [pal, f] of [['gameboy', 'l-gb'], ['paper', 'l-paper'], ['pico8', 'l-pico']]) {
  await p.click(`[data-palette=${pal}]`); await p.waitForTimeout(200);
  if (pal === 'paper') for (const s of ['hero', 'berry', 'block', 'box', 'door', 'switch', 'button', 'laser']) await p.click(`[data-skin=${s}] [data-alt=true]`);
  await p.click('#lookMenu'); await p.waitForTimeout(300); await p.click('#menuCampaign'); await p.waitForTimeout(300);
  await p.click('.campRow >> nth=1'); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/${f}.png` });
  await p.goto('http://localhost:4393/#/looks'); await p.waitForTimeout(500);
}
console.log(JSON.stringify(errs));
await b.close(); process.exit(0);
