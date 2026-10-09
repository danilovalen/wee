// Responsiveness gate: a phone-sized page with the CPU slowed 4x. Long tasks are what a
// person feels as a frozen page; ceilings are loose so a slow machine does not flake,
// tight enough that the problems in docs/RESPONSIVENESS.md cannot come back unnoticed.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('perf');
const CEILING_MS = 250;
const server = await serve(5195);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.addInitScript(() => { window.__long = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(e.duration); }).observe({ type: 'longtask', buffered: true }); });
const worst = async fn => { await page.evaluate(() => { window.__long = []; }); await fn(); await page.waitForTimeout(100); return Math.round(await page.evaluate(() => Math.max(0, ...window.__long))); };
const first = JSON.parse(readFileSync('rooms/first-room.wee', 'utf8'));
try {
  await page.goto('http://localhost:5195/');
  await page.evaluate(f => { const rooms = []; for (let i = 0; i < 100; i++) rooms.push({ ...f, id: 'r' + i, name: 'Room ' + i, updated: new Date(Date.now() - i * 864e5).toISOString() }); localStorage.setItem('wee.rooms', JSON.stringify(rooms)); }, first);
  await page.reload();
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });

  // idle: a still room with nothing moving is not redrawn
  await page.evaluate(l => window.wee.loadLevel(l), { ...first, cells: first.cells.map(c => c === 'goal' ? '' : c) });
  await page.waitForTimeout(300);
  const d0 = await page.evaluate(() => window.wee.draws());
  await page.waitForTimeout(1000);
  const idle = await page.evaluate(() => window.wee.draws()) - d0;
  check('a still room is not redrawn while idle', idle <= 2, `${idle} draws in 1 s`);
  await page.evaluate(l => window.wee.loadLevel(l), first);
  await page.waitForTimeout(300);
  const d1 = await page.evaluate(() => window.wee.draws());
  await page.waitForTimeout(1000);
  const amb = await page.evaluate(() => window.wee.draws()) - d1;
  check('a room with a goal redraws slowly, for its pulse', amb >= 3 && amb <= 15, `${amb} draws in 1 s`);

  // the Rooms panel with 100 rooms, about three months of one a day
  let w = await worst(async () => { await page.click('#roomsBtn'); await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 100); });
  check(`opening Rooms with 100 rooms never freezes over ${CEILING_MS} ms`, w < CEILING_MS, `${w} ms`);
  await page.fill('#roomName', 'Perf');
  w = await worst(async () => { await page.click('#roomSave'); await page.waitForFunction(() => document.getElementById('roomsSay').textContent.startsWith('Saved')); });
  check(`saving with 100 rooms never freezes over ${CEILING_MS} ms`, w < CEILING_MS, `${w} ms`);
  w = await worst(() => page.selectOption('#tagFilter', 'piece:box'));
  check(`the mechanism filter never freezes over ${CEILING_MS} ms`, w < CEILING_MS, `${w} ms`);
  // a filter change while the list is still building replaces it, never adds to it
  await page.selectOption('#tagFilter', '');
  await page.evaluate(() => { const f = document.getElementById('tagFilter'); f.value = 'tile:goal'; f.dispatchEvent(new Event('change')); });
  await page.waitForFunction(() => /^Explored/.test(document.getElementById('exploredSum').textContent) && document.querySelectorAll('#roomList .roomRow').length >= 100, null, { timeout: 30000 });
  await page.waitForTimeout(500);
  check('a filter change mid-build does not duplicate rooms', await page.evaluate(() => document.querySelectorAll('#roomList .roomRow').length) === 101, String(await page.evaluate(() => document.querySelectorAll('#roomList .roomRow').length)));
  await page.keyboard.press('Escape');

  // Check and Show stops on his room
  w = await worst(async () => { await page.click('#checkBtn'); await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable'), null, { timeout: 60000 }); });
  check(`Check never freezes over ${CEILING_MS} ms`, w < CEILING_MS, `${w} ms`);
  await page.click('[data-tool=look]');
  const t0 = Date.now();
  w = await worst(async () => { await page.click('#stopsBtn'); await page.waitForFunction(() => document.getElementById('placeHint').textContent.includes('stop on'), null, { timeout: 30000 }); });
  check('Show stops answers within a few seconds', Date.now() - t0 < 8000, `${Date.now() - t0} ms`);
  check(`and never freezes over ${CEILING_MS} ms`, w < CEILING_MS, `${w} ms`);

  // Check on a 40x30 room with 60 boxes
  const big = await page.evaluate(() => {
    const l = window.wee.blank(40, 30);
    for (let i = 0; i < 40; i++) { l.cells[i] = 'wall'; l.cells[29 * 40 + i] = 'wall'; }
    for (let y = 0; y < 30; y++) { l.cells[y * 40] = 'wall'; l.cells[y * 40 + 39] = 'wall'; }
    for (let i = 0; i < 60; i++) l.entities.push({ kind: i % 2 ? 'box' : 'heavy', x: 2 + (i * 7) % 36, y: 2 + Math.floor(i / 6) * 2 });
    l.cells[28 * 40 + 38] = 'goal';
    return l;
  });
  await page.evaluate(l => window.wee.loadLevel(l), big);
  w = await worst(async () => { await page.click('#checkBtn'); await page.waitForFunction(() => !document.getElementById('checkText').textContent.startsWith('Checking'), null, { timeout: 120000 }); });
  check(`Check on a 40x30 room never freezes over ${CEILING_MS} ms`, w < CEILING_MS, `${w} ms`);
} catch (err) {
  check('the perf smoke ran to the end', false, err.message);
} finally { await browser.close(); server.close(); }
done();
