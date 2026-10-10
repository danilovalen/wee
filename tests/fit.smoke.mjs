// A wide screen never scrolls: not the page, and not a column, whatever tool is picked.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('fit');
const server = await serve(5191);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  for (const [w, h] of [[1280, 720], [1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('http://localhost:5191/');
    await page.waitForFunction(() => window.wee && window.wee.roomsReady);
    await page.evaluate(() => window.wee.roomsReady);
    const over = () => page.evaluate(() => [document.documentElement, ...document.querySelectorAll('main > *')].map(e => e.scrollHeight - e.clientHeight).filter(n => n > 0).length);
    const bad = [];
    for (const t of await page.$$eval('[data-tool]', bs => bs.map(b => b.dataset.tool))) {
      await page.click(`[data-tool=${t}]`);
      if (await over()) bad.push(t);
    }
    check(`${w}x${h}: nothing scrolls, with any tool picked`, !bad.length, bad.join(' '));
    const tall = await page.evaluate(() => { window.wee.loadLevel(window.wee.blank(12, 30)); return new Promise(r => requestAnimationFrame(() => r())); }).then(over);
    check(`${w}x${h}: a tall room still fits`, !tall);
    await page.click('#genBtn');
    await page.locator('.genIngBox summary').click();
    check(`${w}x${h}: the Generator opens from the header and fits without scrolling`, await page.locator('#genBox').isVisible() && await page.evaluate(() => { const d = document.getElementById('genBox'); return d.scrollHeight <= d.clientHeight; }));
    await page.close();
  }
  // Below about 700 px of height a column may scroll on its own, but nothing may be cut off.
  const low = await browser.newPage({ viewport: { width: 1280, height: 560 } });
  await low.goto('http://localhost:5191/');
  await low.waitForFunction(() => window.wee && window.wee.roomsReady);
  await low.evaluate(() => window.wee.roomsReady);
  const reach = [];
  for (const [col, last] of [['#tools', '#palette button:last-child'], ['#powers', 'input[name=clock]:last-of-type']]) {
    const b = await low.locator(col).boundingBox();
    await low.mouse.move(b.x + b.width / 2, b.y + 40);
    await low.mouse.wheel(0, 3000);
    await low.waitForTimeout(200);
    const r = await low.locator(last).last().boundingBox();
    if (!r || r.y + r.height > 560) reach.push(col);
  }
  check('on a short screen every column can still be scrolled to its end', !reach.length, reach.join(' '));
  await low.close();
} catch (err) { check('the fit smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
