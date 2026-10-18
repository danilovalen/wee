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
