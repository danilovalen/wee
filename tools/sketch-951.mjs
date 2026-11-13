// Draws switches off and on in red and blue with the game's own sprites (register 951): node tools/sketch-951.mjs
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const server = await serve(5294);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
await page.goto('http://localhost:5294/index.html'); await page.waitForTimeout(800);
await page.evaluate(async () => {
  const { drawSprite } = await import('/src/view/sprites.js'), { P } = await import('/src/view/crayonSprites.js'), { T } = await import('/src/view/ink.js');
  document.body.innerHTML = '<canvas id="sk" style="image-rendering:pixelated;background:#f3ead8"></canvas>';
  const c = document.getElementById('sk'); c.width = 4 * T + 50; c.height = T + 20; c.style.width = c.width * 3 + 'px';
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  [['switchOff', P.red], ['switchOn', P.red], ['switchOff', P.blue], ['switchOn', P.blue]].forEach(([n, col], i) => drawSprite(g, n, 10 + i * (T + 10), 10, { exact: true, colour: col }));
});
await page.locator('#sk').screenshot({ path: 'docs/sketches/switch-951-built.png' });
await browser.close(); server.close();
