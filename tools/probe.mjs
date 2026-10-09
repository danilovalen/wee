// Responsiveness probe: drives the real page on a phone-sized viewport with the CPU
// slowed down, and reports long tasks, DOM writes and timings for each user action.
// Usage: node tools/probe.mjs [cpu-throttle, default 4]
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { serve } from './serve.mjs';

const THROTTLE = +process.argv[2] || 4;
const server = await serve(0);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
await page.addInitScript(() => {
  window.__long = []; window.__writes = 0;
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(e.duration); }).observe({ type: 'longtask', buffered: true });
  addEventListener('DOMContentLoaded', () => new MutationObserver(m => { window.__writes += m.length; }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true }));
});
const rows = [];
const reset = () => page.evaluate(() => { window.__long = []; window.__writes = 0; });
const read = () => page.evaluate(() => ({ long: window.__long.length, worst: Math.round(Math.max(0, ...window.__long)), writes: window.__writes }));
async function measure(name, fn) {
  await reset();
  const t = Date.now();
  let ms;
  try { await fn(); ms = Date.now() - t; } catch (e) { ms = `>${Date.now() - t} (timed out)`; }
  await page.waitForTimeout(150);
  rows.push({ name, ms, ...(await read()) });
}

const t0 = Date.now();
await page.goto(`http://localhost:${server.address().port}/`);
await page.waitForFunction(() => window.wee && window.wee.roomsReady);
await page.evaluate(() => window.wee.roomsReady);
rows.push({ name: 'boot to ready', ms: Date.now() - t0, ...(await read()) });

// Idle: the render loop runs every frame even when nothing changes.
await measure('2 s idle in edit', () => page.waitForTimeout(2000));
const d0 = await page.evaluate(() => window.wee.draws()); await page.waitForTimeout(1000);
rows.push({ name: 'redraws per idle second', ms: await page.evaluate(() => window.wee.draws()) - d0 });

// A big room: 40x30 with pieces, the worst case for every per-edit cost.
const big = await page.evaluate(() => {
  const l = window.wee.blank(40, 30);
  for (let i = 0; i < 40; i++) { l.cells[i] = 'wall'; l.cells[29 * 40 + i] = 'wall'; }
  for (let y = 0; y < 30; y++) { l.cells[y * 40] = 'wall'; l.cells[y * 40 + 39] = 'wall'; }
  for (let i = 0; i < 60; i++) l.entities.push({ kind: i % 2 ? 'box' : 'heavy', x: 2 + (i * 7) % 36, y: 2 + Math.floor(i / 6) * 2 });
  l.cells[28 * 40 + 38] = 'goal';
  return l;
});
await measure('load a 40x30 room', () => page.evaluate(l => window.wee.loadLevel(l), big));
const box = await page.locator('#game').boundingBox();
const at = (x, y) => ({ x: box.x + (x + 0.5) * box.width / 40, y: box.y + (y + 0.5) * box.height / 30 });
await page.click('[data-group=basic]'); await page.click('[data-tool=wall]');
await measure('one tap places a block (40x30)', async () => { const p = at(5, 5); await page.touchscreen.tap(p.x, p.y); });
await measure('drag paints 15 blocks (40x30)', async () => {
  const a = at(3, 10); await page.mouse.move(a.x, a.y); await page.mouse.down();
  for (let x = 4; x < 18; x++) { const p = at(x, 10); await page.mouse.move(p.x, p.y); }
  await page.mouse.up();
});
await measure('undo (40x30)', () => page.click('#undo'));
await measure('edit to play (40x30)', () => page.click('#mode'));
await measure('play: 2 s of sliding (40x30)', async () => { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(2000); });
await measure('play to edit (40x30)', () => page.click('#mode'));
await measure('Check (40x30, until answered)', async () => { await page.click('#checkBtn'); await page.waitForFunction(() => !document.getElementById('checkText').textContent.startsWith('Checking'), null, { timeout: 120000 }); });
rows.push({ name: '  check said', ms: await page.textContent('#checkText') });

// Fifty saved rooms: what opening the Rooms panel costs.
await page.evaluate(() => {
  const rooms = [];
  for (let i = 0; i < 50; i++) rooms.push({ ...window.wee.getLevel(), id: 'r' + i, name: 'Room ' + i, note: '', updated: new Date(Date.now() - i * 86400000).toISOString() });
  localStorage.setItem('wee.rooms', JSON.stringify(rooms));
});
await measure('open Rooms with 50 rooms of 40x30', async () => { await page.click('#roomsBtn'); await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 50, null, { timeout: 180000 }); });
await page.fill('#roomName', 'Probe');
await measure('Save (browser storage, 51 rooms)', async () => { await page.click('#roomSave'); await page.waitForFunction(() => document.getElementById('roomsSay').textContent.startsWith('Saved')); });
await measure('change the mechanism filter', () => page.selectOption('#tagFilter', 'piece:box'));
await page.keyboard.press('Escape');

// His first room: the small, real case.
const first = JSON.parse(readFileSync('rooms/first-room.wee', 'utf8'));
await page.evaluate(l => window.wee.loadLevel(l), first);
await measure('Check his first room', async () => { await page.click('#checkBtn'); await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable')); });
await page.click('[data-tool=look]');
await measure('Show stops, his first room', async () => { await page.click('#stopsBtn'); await page.waitForFunction(() => document.getElementById('placeHint').textContent.includes('stop on')); });

console.log(`CPU throttle ${THROTTLE}x, 390x844 @3x\n`);
console.log('action'.padEnd(40), 'ms'.padStart(8), 'long'.padStart(6), 'worst'.padStart(7), 'writes'.padStart(8));
for (const r of rows) console.log(String(r.name).padEnd(40), String(r.ms).padStart(8), String(r.long ?? '').padStart(6), String(r.worst ?? '').padStart(7), String(r.writes ?? '').padStart(8));
await browser.close(); server.close();
