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
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true }); await page.addInitScript(() => { window.__openAll = true; });
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
  // Any room zooms, a small one too (register 781).
  await page.evaluate(() => { const l = window.wee.blank(7, 7); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  await pinch();
  check('a small room zooms too, and Fit then shows (register 781)', (await cam()).z > 1.2 && await page.locator('#fitBtn').isVisible(), JSON.stringify(await cam()));
  await page.click('#fitBtn');
  await page.evaluate(() => { const l = window.wee.blank(60, 46); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  await page.waitForTimeout(100);
  const before = await walls();
  const fitted = await page.locator('#game').boundingBox();
  await pinch();
  const c1 = await cam();
  check('a pinch on a big room zooms in', c1.z > 1.5, JSON.stringify(c1));
  // Register 414: zoomed in, the view fills the room's area instead of keeping the fitted room's shape.
  const zoomedBox = await page.locator('#game').boundingBox();
  const room = await page.evaluate(async () => { const { BAR } = await import('/src/app/fit.js'); return document.getElementById('roomArea').clientHeight - 2 * BAR; });
  check('zoomed in, the view grows to fill the area', zoomedBox.height > fitted.height && Math.abs(zoomedBox.height - room) <= 2 && zoomedBox.width >= fitted.width - 1, `${Math.round(fitted.width)}x${Math.round(fitted.height)} -> ${Math.round(zoomedBox.width)}x${Math.round(zoomedBox.height)} of ${room}`);
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
  // Register 803: a finger whose lift never reached the room must not turn every later tap into a pinch.
  await page.evaluate(() => { const c = document.getElementById('game'), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', pointerId: 77, isPrimary: true, clientX: r.left + 5, clientY: r.top + 5, bubbles: true })); });
  const next = await page.evaluate(async T => { const { toScreen } = await import('/src/app/camera.js'); return toScreen(32.5 * T, 23.5 * T); }, T);
  await page.touchscreen.tap(next.x, next.y); await page.waitForTimeout(150);
  check('after a finger whose lift was lost, a tap while zoomed still places (register 803)', await page.evaluate(() => { const l = window.wee.getLevel(); return l.cells[23 * l.w + 32] === 'wall'; }));
  // Zoomed only a little, the view is taller than the room: the space past its edges is clear, not stale.
  const past = await page.evaluate(async () => { const { cam, apply } = await import('/src/app/camera.js'); cam.z = 1.2; apply(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const c = document.getElementById('game'); return c.getContext('2d').getImageData(Math.round(c.width / 2), 1, 1, 1).data[3]; });
  check('past the room\'s edges the zoomed view is clear', past === 0, String(past));
  // Register 802: zoomed in and moved to the room's top left corner, the wall ring round the room is drawn.
  const ringPx = await page.evaluate(async () => { const { cam, apply } = await import('/src/app/camera.js'); cam.z = 3; cam.x = -999; cam.y = -999; apply(); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const c = document.getElementById('game'); return cam.x < 0 ? c.getContext('2d').getImageData(Math.round(c.width * 0.02), Math.round(c.height * 0.02), 1, 1).data[3] : -1; });
  check('zoomed in at the room\'s corner, the wall ring round it is drawn (register 802)', ringPx > 200, String(ringPx));
  await page.click('#fitBtn');
  const refit = await page.locator('#game').boundingBox();
  check('Fit shows the whole room again, at its fitted size', (await cam()).z === 1 && await page.locator('#fitBtn').isHidden() && Math.abs(refit.height - fitted.height) < 2, `${Math.round(refit.height)} vs ${Math.round(fitted.height)}`);
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
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } }); await desk.addInitScript(() => { window.__openAll = true; });
  await desk.goto(`http://localhost:${PORT}/`); await desk.waitForTimeout(400);
  await desk.click('#menuSandbox'); await desk.waitForTimeout(400); await desk.click('#roomNew'); await desk.waitForTimeout(300);
  await desk.evaluate(() => { const l = window.wee.blank(7, 7); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  await desk.click('#zoomIn'); await desk.click('#zoomIn');
  check('on a wide screen a small room, its tiles already big, still zooms in (register 781)', await desk.evaluate(async () => (await import('/src/app/camera.js')).cam.z > 1.4));
  await desk.click('#fitBtn');
  await desk.evaluate(() => { const l = window.wee.blank(60, 46); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  const b = await desk.locator('#game').boundingBox();
  await desk.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await desk.keyboard.down('Control'); await desk.mouse.wheel(0, -400); await desk.keyboard.up('Control'); await desk.waitForTimeout(100);
  check('on a computer Ctrl and the wheel zoom in', await desk.evaluate(async () => (await import('/src/app/camera.js')).cam.z > 1.5));
  // Register 781: the plain wheel, the buttons and the keys zoom; arrows and a drag on empty space pan.
  const z = () => desk.evaluate(async () => (await import('/src/app/camera.js')).cam.z);
  const xy = () => desk.evaluate(async () => { const { cam } = await import('/src/app/camera.js'); return [cam.x, cam.y]; });
  await desk.click('#fitBtn');
  await desk.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await desk.mouse.wheel(0, -300); await desk.waitForTimeout(100);
  check('the plain wheel zooms in', await z() > 1.5, String(await z()));
  await desk.click('#fitBtn');
  await desk.click('#zoomIn'); const z1 = await z(); await desk.click('#zoomIn'); const z2 = await z(); await desk.click('#zoomOut'); const z3 = await z();
  check('the + button zooms in and − zooms back out', z1 > 1.1 && z2 > z1 && Math.abs(z3 - z1) < 0.01, [z1, z2, z3].join());
  await desk.click('#game', { position: { x: 5, y: 5 } }).catch(() => {});
  await desk.keyboard.press('Escape'); await desk.locator('#game').focus().catch(() => {});
  await desk.keyboard.press('f'); const zf = await z();
  await desk.keyboard.press('+'); const zk = await z(); await desk.keyboard.press('-'); const zm = await z();
  check('F fits, + and − zoom from the keyboard', zf === 1 && zk > 1.1 && zm < zk, [zf, zk, zm].join());
  await desk.keyboard.press('+'); await desk.keyboard.press('+'); await desk.keyboard.press('+');
  await desk.evaluate(async () => { const { cam, apply } = await import('/src/app/camera.js'); cam.x = 200; cam.y = 200; apply(); });
  const p0 = await xy(); await desk.keyboard.press('ArrowRight'); const p1 = await xy();
  check('an arrow key moves the view while editing zoomed in', p1[0] > p0[0] && p1[1] === p0[1], JSON.stringify([p0, p1]));
  await desk.evaluate(() => { window.__openAll = true; }); await desk.click('[data-tool=look]').catch(() => {});
  const blob = await desk.evaluate(async () => { const { toScreen } = await import('/src/app/camera.js'); const T = (await import('/src/view/ink.js')).T; return toScreen(20.5 * T, 20.5 * T); });
  const q0 = await xy();
  await desk.mouse.move(blob.x, blob.y); await desk.mouse.down(); await desk.mouse.move(blob.x - 60, blob.y - 40, { steps: 6 }); await desk.mouse.up();
  const q1 = await xy();
  check('dragging empty space with Look moves the view', q1[0] > q0[0] + 20 && q1[1] > q0[1] + 10, JSON.stringify([q0, q1]));
  await desk.keyboard.press('F');
  check('Shift+F resets the zoom to tiles a tapping size', Math.abs(await desk.evaluate(async () => { const { cam } = await import('/src/app/camera.js'); return cam.fit * cam.z * (await import('/src/view/ink.js')).T; }) - 40) < 1);
  check('no page errors', errors.filter(e => !/setPointerCapture/.test(e)).length === 0, errors.join(' | '));
} catch (err) { check('the camera smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
