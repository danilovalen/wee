// The room's + and − buttons (register 298): a tap adds or cuts one line, a press the phone cancels
// still counts (register 227), a press that slides off counts not, and none sits over a tile.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('size-buttons');
const server = await serve(5237);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 393, height: 873 }, hasTouch: true, isMobile: true });
try {
  await page.goto('http://localhost:5237/?sandbox');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  const width = () => page.evaluate(() => window.wee.getLevel().w);
  const press = (sel, end) => page.evaluate(([sel, end]) => {
    const b = document.querySelector(sel), r = b.getBoundingClientRect(), o = { pointerId: 7, bubbles: true, isPrimary: true, pointerType: 'touch', clientX: r.x + r.width / 2, clientY: r.y + r.height / 2 };
    b.dispatchEvent(new PointerEvent('pointerdown', o));
    if (end === 'leave') b.dispatchEvent(new PointerEvent('pointerleave', o));
    else b.dispatchEvent(new PointerEvent(end, o));
  }, [sel, end]);
  const w0 = await width();
  await press('[data-plus="right"]', 'pointerup');
  check('a tap on the right + adds a column', (await width()) === w0 + 1, `${w0} -> ${await width()}`);
  await press('[data-minus="right"]', 'pointercancel');
  check('a press the phone cancels still cuts the column', (await width()) === w0, `${w0} -> ${await width()}`);
  await press('[data-plus="left"]', 'leave');
  // The finger comes back up over the button later, from a drag that started elsewhere.
  await page.evaluate(() => { const b = document.querySelector('[data-plus="left"]'), r = b.getBoundingClientRect(); b.dispatchEvent(new PointerEvent('pointerup', { pointerId: 9, bubbles: true, pointerType: 'touch', clientX: r.x + 5, clientY: r.y + 5 })); });
  check('a press that slides off the button does nothing, even if a release lands on it later', (await width()) === w0);
  const over = await page.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(); return [...document.querySelectorAll('.plus, .minus')].filter(b => { const r = b.getBoundingClientRect(); return !(r.bottom <= g.top || r.top >= g.bottom || r.right <= g.left || r.left >= g.right); }).map(b => b.dataset.plus || b.dataset.minus); });
  check('no + or − sits over a tile', over.length === 0, over.join());
  const sides = await page.evaluate(() => { const g = document.getElementById('game').getBoundingClientRect(), r = s => [...document.querySelectorAll(`[data-plus=${s}], [data-minus=${s}]`)].map(b => b.getBoundingClientRect());
    return { left: r('left').every(b => b.right <= g.left && b.top >= g.top && b.bottom <= g.bottom), right: r('right').every(b => b.left >= g.right && b.top >= g.top && b.bottom <= g.bottom), top: r('top').every(b => b.bottom <= g.top), bottom: r('bottom').every(b => b.top >= g.bottom) }; });
  check('each side\'s + and − sit on that side of the room (register 318)', Object.values(sides).every(Boolean), JSON.stringify(sides));
  const edge = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.plus, .minus')].map(b => { const r = b.getBoundingClientRect(); return Math.min(r.left, innerWidth - r.right); })));
  // Beside the room, 14px from the screen's sides: his call over the back-swipe margin (register 318).
  check('every + and − keeps 14px from the screen\'s sides', edge >= 14, String(edge));
} finally {
  await browser.close();
  server.close();
}
done();
