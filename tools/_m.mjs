import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const server = await serve(5187);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto('http://localhost:5187/'); await p.waitForFunction(() => window.wee && window.wee.roomsReady); await p.evaluate(() => window.wee.roomsReady);
  const over = async () => p.evaluate(() => ({ doc: document.documentElement.scrollHeight - innerHeight, cols: [...document.querySelectorAll('main > *')].map(e => e.id + ':' + (e.scrollHeight - e.clientHeight)).join(' ') }));
  const worst = {};
  for (const t of await p.$$eval('[data-tool]', bs => bs.map(b => b.dataset.tool))) {
    await p.click(`[data-tool=${t}]`);
    const o = await over();
    worst[t] = o.cols;
  }
  const bad = Object.entries(worst).filter(([, c]) => /:[1-9]/.test(c));
  console.log(w + 'x' + h, JSON.stringify(await over()), 'tools that overflow:', bad.map(([t, c]) => t + '(' + c + ')').join(' ') || 'none');
  await p.click('[data-tool=look]');
  await p.screenshot({ path: `/tmp/claude-0/desk-${w}.png` });
  await p.click('#roomsBtn'); await p.click('#roomGen'); await p.locator('.genIngBox summary').click();
  console.log('  generator dialog overflow', await p.evaluate(() => { const d = document.getElementById('genBox'); return d.scrollHeight - d.clientHeight; }));
  await p.screenshot({ path: `/tmp/claude-0/gen-${w}.png` });
  await p.close();
}
await b.close(); server.close();
