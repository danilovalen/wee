// Nothing moves when the mode changes (rows 222, 235): the room, the goal card, the palette and the
// top bar keep their boxes from Edit through Run, the robot's demo, the return to Edit, Test and back,
// on a phone and on a desktop. Sampled through the whole run, not just at its ends.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('steady');
const server = await serve(5219);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const WATCH = ['#game', '#campBrief', '#tools', '#campBack', '#campVerdict'];
// Winning rooms, so Run plays a whole demo and returns to Edit: level 1's (square) and his level 9
// win (tall, where the room's height is what limits it).
const ROOMS = [['1', ['P.#.#', '.....', '.###.', '.#...', '.#..G']], ['9', ['G....', '##..#', '..^#.', '.v...', '..#..', '....#', 'P#...']]];
const errors = [];
try {
  // Every menu is a page that fills the window, never a box over the game (register 220).
  for (const viewport of [{ width: 393, height: 852 }, { width: 1280, height: 800 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:5219/');
    const sizes = await page.evaluate(() => [...document.querySelectorAll('dialog')].map(d => {
      for (const o of document.querySelectorAll('dialog[open]')) o.close();
      d.showModal(); const r = d.getBoundingClientRect(), out = `${d.id} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; d.close();
      return { id: d.id, full: r.x === 0 && r.y === 0 && Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight, out };
    }));
    check(`${viewport.width}px: every menu fills the window`, sizes.length >= 8 && sizes.every(x => x.full), sizes.filter(x => !x.full).map(x => x.out).join(' | '));
    await page.close();
  }
  for (const [name, viewport, opts] of [['phone', { width: 393, height: 852 }, { hasTouch: true, isMobile: true }], ['desktop', { width: 1280, height: 800 }, {}]]) for (const [id, rows] of ROOMS) {
    const page = await browser.newPage({ viewport, ...opts });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost:5219/');
    await page.click('#menuCampaign'); await page.click(`.campRow[data-level="${id}"]`);
    await page.evaluate(rows => {
      const l = window.wee.blank(rows[0].length, rows.length);
      for (const p of Object.keys(l.powers)) l.powers[p] = false;
      const CELL = { '#': 'wall', G: 'goal', '^': 'gate:up', v: 'gate:down', '>': 'gate:right', '<': 'gate:left' };
      rows.forEach((row, y) => [...row].forEach((c, x) => { if (CELL[c]) l.cells[y * l.w + x] = CELL[c]; if (c === 'P') l.start = { x, y }; }));
      window.wee.loadLevel(l);
    }, rows);
    await page.waitForTimeout(300);
    const boxes = () => page.evaluate(sel => Object.fromEntries(sel.map(s => {
      const e = document.querySelector(s); if (!e) return [s, null];
      const r = e.getBoundingClientRect(), shown = getComputedStyle(e).display !== 'none';
      return [s, shown ? [r.x, r.y, r.width, r.height].map(v => Math.round(v * 2) / 2).join(',') : 'gone'];
    })), WATCH);
    const base = await boxes(), moved = new Set(), seen = {};
    const look = async when => { const b = await boxes(); for (const s of WATCH) if (b[s] !== base[s]) { moved.add(s); seen[s] ||= `${when}: ${base[s]} -> ${b[s]}`; } return b; };
    await page.click('#campRun');
    for (let i = 0; i < 30; i++) { await look('run ' + i * 100 + 'ms'); await page.waitForTimeout(100); }
    await page.click('#campTest'); await page.waitForTimeout(150); await look('test');
    await page.click('#mode'); await page.waitForTimeout(150); await look('back to edit');
    check(`${name}, level ${id}: the room, goal card, palette and top bar keep their boxes through Run, the demo, Test and back`, moved.size === 0, JSON.stringify(seen));
    // The verdict sits in its own band: it never covers the room.
    await page.click('#campRun'); await page.waitForTimeout(1800);
    const cover = await page.evaluate(() => {
      const v = document.getElementById('campVerdict'), g = document.getElementById('game').getBoundingClientRect(), r = v.getBoundingClientRect();
      return v.hidden ? 'hidden' : (r.bottom <= g.top || r.top >= g.bottom || r.right <= g.left || r.left >= g.right) ? 'clear' : 'covers';
    });
    check(`${name}, level ${id}: the run's verdict never covers the room`, cover === 'clear', cover);
    // A pressed grip stays where it was (it used to jump about 12px sideways).
    if (id === '1') {
      const grip = page.locator('.plus[data-plus="top"]'), at = () => grip.boundingBox().then(b => [b.x, b.y].map(Math.round).join());
      const g = await grip.boundingBox(), rest = await at();
      await page.mouse.move(g.x + 12, g.y + 12); const hovered = await at(); await page.mouse.down(); const pressed = await at(); await page.mouse.up();
      if (opts.hasTouch) {
        // A tap the phone cancels (some viewers do) still adds a line (register 227).
        const cdp = await page.context().newCDPSession(page), h0 = await page.evaluate(() => window.wee.getLevel().h);
        const g2 = await grip.boundingBox(), pt = [{ x: g2.x + 12, y: g2.y + 12 }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await page.waitForTimeout(100);
        const h1 = await page.evaluate(() => window.wee.getLevel().h);
        check(`${name}: a cancelled tap on a + still adds a line`, h1 === h0 + 1, h0 + ' -> ' + h1);
      }
      if (opts.hasTouch) {
        // The side grips stay out of the phone's edge swipe zone, and each takes a 44px touch (register 239).
        const sides = await page.evaluate(() => { const l = document.querySelector('.plus[data-plus="left"]').getBoundingClientRect(), r = document.querySelector('.plus[data-plus="right"]').getBoundingClientRect(); return { left: l.left, right: innerWidth - r.right }; });
        check(`${name}: the side + grips sit at least 30px from the screen's edges`, sides.left >= 30 && sides.right >= 30, JSON.stringify(sides));
        const reach = await page.evaluate(() => { const r = document.querySelector('.plus[data-plus="right"]').getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; return [[cx - 20, cy], [cx + 20, cy], [cx, cy - 20], [cx, cy + 20]].every(([x, y]) => document.elementFromPoint(x, y)?.dataset?.plus === 'right'); });
        check(`${name}: a + answers a touch up to 20px from its centre`, reach);
      }
      check(`${name}: a + stays where it was when hovered and pressed`, rest === hovered && rest === pressed, [rest, hovered, pressed].join(' / '));
    }
    await page.close();
  }
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
