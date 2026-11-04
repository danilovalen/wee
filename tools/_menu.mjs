import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
await serve(4396);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
await p.goto('http://localhost:4396/'); await p.waitForTimeout(800);
await p.screenshot({ path: process.argv[2] + '/menu-laser.png', clip: { x: 0, y: 220, width: 200, height: 150 } });
console.log(await p.evaluate(() => { const e = document.querySelector('.msEmitter'), r = e.getBoundingClientRect(); return JSON.stringify([r.left, r.top, r.width, r.height, getComputedStyle(e).backgroundImage.slice(0, 40), getComputedStyle(e).display, getComputedStyle(e).zIndex]); }));
await b.close(); process.exit(0);
