// The camera (register 408): only a room too big to tap zooms; a pinch zooms and takes back the
// first finger's stroke; a tap lands on the tile drawn under it; Fit shows the whole room; play
// follows the mover and leaving play returns to the editing view; Ctrl and the wheel zoom on a computer.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite, pickTool } from './lib.mjs';

const { check, done } = suite('camera');
const PORT = 5251;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const cdp = await page.context().newCDPSession(page);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
// Two fingers start near the room's middle and move apart.
async function pinch(spread = 120) {
  const r = await page.locator('#game').boundingBox(), cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  await touch('touchStart', [[cx - 20, cy]]);
  await touch('touchStart', [[cx - 20, cy], [cx + 20, cy]]);
  for (let i = 1; i <= 6; i++) await touch('touchMove', [[cx - 20 - spread * i / 6, cy], [cx + 20 + spread * i / 6, cy]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(100);
}
const cam = () => page.evaluate(async () => { const { cam } = await import('/src/app/camera.js'); return { ...cam }; });
const walls = () => page.evaluate(() => window.wee.getLevel().cells.filter(c => c === 'wall').length);
try {
  await page.goto(`http://localhost:${PORT}/`); await page.waitForTimeout(400);
  await page.click('#menuSandbox'); await page.waitForTimeout(400); await page.click('#roomNew'); await page.waitForTimeout(300);
  await pickTool(page, 'wall');
  // A small room fits with tiles big enough to tap: no zoom.
  await page.evaluate(() => { const l = window.wee.blank(7, 7); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  await pinch();
  check('a small room does not zoom', (await cam()).z === 1 && await page.locator('#fitBtn').isHidden(), JSON.stringify(await cam()));
  await page.evaluate(() => { const l = window.wee.blank(60, 46); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  await page.waitForTimeout(100);
  const before = await walls();
  await pinch();
  const c1 = await cam();
  check('a pinch on a big room zooms in', c1.z > 1.5, JSON.stringify(c1));
  check('Fit shows while zoomed, and the resize bars wait', await page.locator('#fitBtn').isVisible() && await page.locator('.growBar').first().isHidden());
  check('the pinch placed nothing: the first finger\'s stroke is taken back', (await walls()) === before, `${before} -> ${await walls()}`);
  // A tap lands on the tile drawn under the finger: the pixel there turns from floor to wall.
  const T = await page.evaluate(async () => (await import('/src/view/ink.js')).T);
  const target = await page.evaluate(async T => { const { toScreen } = await import('/src/app/camera.js'); return toScreen(30.5 * T, 23.5 * T); }, T);
  const pixel = () => page.evaluate(({ x, y }) => { const c = document.getElementById('game'), r = c.getBoundingClientRect(); return [...c.getContext('2d').getImageData(Math.round((x - r.left) * c.width / r.width), Math.round((y - r.top) * c.height / r.height), 1, 1).data].slice(0, 3).join(); }, target);
  const floor = await pixel();
  await page.touchscreen.tap(target.x, target.y); await page.waitForTimeout(150);
  const placed = await page.evaluate(() => { const l = window.wee.getLevel(); return l.cells.map((c, i) => c === 'wall' ? `${i % l.w},${Math.floor(i / l.w)}` : null).filter(Boolean); });
  check('a tap while zoomed places on the tile under it', placed.includes('30,23') && placed.length === before + 1, placed.join(' '));
  check('and the wall is drawn under the finger', (await pixel()) !== floor, `${floor} -> ${await pixel()}`);
  await page.click('#fitBtn');
  check('Fit shows the whole room again', (await cam()).z === 1 && await page.locator('#fitBtn').isHidden());
  // Play follows the mover: zoom in on the start corner, walk to the far side, and the view goes too.
  await pinch(200);
  await page.evaluate(async () => { const { cam, apply } = await import('/src/app/camera.js'); cam.x = 0; cam.y = 0; apply(); });
  const editView = await cam();
  await page.keyboard.press('e'); await page.waitForTimeout(200);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(2500);
  const played = await cam();
  check('in play the view follows the mover to the far side', played.x > editView.x + 100, `${editView.x} -> ${played.x}`);
  check('the mover, now on the far side, stays in view', await page.evaluate(async T => { const { cam } = await import('/src/app/camera.js'); const p = JSON.parse(window.renderGameToText()).player || {}; const l = window.wee.getLevel(), vw = l.w * T / cam.z; return p.x > 30 && ((p.x + 0.5) * T >= cam.x && (p.x + 0.5) * T <= cam.x + vw); }, T));
  await page.keyboard.press('e'); await page.waitForTimeout(200);
  const back = await cam();
  check('leaving play returns to the editing view', Math.abs(back.x - editView.x) < 1 && Math.abs(back.z - editView.z) < 0.01, JSON.stringify(back));
  // On a computer, Ctrl and the wheel zoom.
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desk.goto(`http://localhost:${PORT}/`); await desk.waitForTimeout(400);
  await desk.click('#menuSandbox'); await desk.waitForTimeout(400); await desk.click('#roomNew'); await desk.waitForTimeout(300);
  await desk.evaluate(() => { const l = window.wee.blank(60, 46); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  const b = await desk.locator('#game').boundingBox();
  await desk.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await desk.keyboard.down('Control'); await desk.mouse.wheel(0, -400); await desk.keyboard.up('Control'); await desk.waitForTimeout(100);
  check('on a computer Ctrl and the wheel zoom in', await desk.evaluate(async () => (await import('/src/app/camera.js')).cam.z > 1.5));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the camera smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
