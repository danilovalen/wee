// The crayon look as it is painted (docs/THEME.md, registers 858 to 863): a wall wears the same line on every
// open side, a beam is flat and stops at the line of what it hits, the blob is a rounded square, and the
// menu's room is drawn on whole screen pixels with a line where its walls meet open floor.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('look');
const PORT = 5283;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(600);

  // One wall block alone on a 3 by 3 floor, drawn at one pixel to a unit.
  const wall = await p.evaluate(async () => {
    const { drawMasses } = await import('/src/view/masses.js'), { T } = await import('/src/view/ink.js'), { lineOf } = await import('/src/view/crayon.js'), { P } = await import('/src/view/crayonSprites.js');
    const c = document.createElement('canvas'); c.width = c.height = 3 * T; const g = c.getContext('2d');
    g.fillStyle = '#ffffffff'; g.fillRect(0, 0, c.width, c.height);
    drawMasses(g, ['', '', '', '', 'wall', '', '', '', ''], 3, 3, undefined, '');
    const px = (x, y) => '#' + [...g.getImageData(x, y, 1, 1).data].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
    const m = T + T / 2, line = lineOf(P.wall).slice(0, 7);
    // One pixel outside each side's middle, and the face's own middle.
    return { line, n: px(m, T - 1), s: px(m, 2 * T), w: px(T - 1, m), e: px(2 * T, m), face: px(m, m), far: px(m, T - 5) };
  });
  check('a wall wears the same line on all four open sides (register 861)', [wall.n, wall.s, wall.w, wall.e].every(c => c === wall.line) && wall.face !== wall.line && wall.far === '#ffffff', JSON.stringify(wall));

  // A beam running right from (0,1) and stopped by a wall at (3,1).
  const beam = await p.evaluate(async () => {
    const { drawBeams } = await import('/src/view/beams.js'), { T } = await import('/src/view/ink.js');
    const c = document.createElement('canvas'); c.width = 4 * T; c.height = 3 * T; const g = c.getContext('2d');
    g.fillStyle = '#ffffffff'; g.fillRect(0, 0, c.width, c.height);
    drawBeams(g, [{ path: [[0, 1], [1, 1], [2, 1]], end: 'right', wall: true }], 0);
    const d = g.getImageData(0, 0, c.width, c.height).data, at = (x, y) => [d[(y * c.width + x) * 4], d[(y * c.width + x) * 4 + 1], d[(y * c.width + x) * 4 + 2]];
    const white = (x, y) => at(x, y).every(v => v === 255), y = T + T / 2;
    // The beam's colours: every pixel is one of a few flat ones, never a blend.
    const seen = new Set(); for (let i = 0; i < d.length; i += 4) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]);
    let last = 0; for (let x = 0; x < c.width; x++) if (!white(x, y)) last = x;
    return { colours: seen.size, last, edge: 3 * T, inked: !white(2 * T, y), above: white(2 * T, y - 6) };
  });
  check('a beam is flat colour, a narrow band (register 862)', beam.colours <= 4 && beam.inked && beam.above, JSON.stringify(beam));
  check('a beam stops at the line of the wall it hits, never on the wall', beam.last === beam.edge - 3, JSON.stringify(beam));

  // The blob: its body reaches nearer its corners than a circle of the same size would.
  const blob = await p.evaluate(async () => {
    const { spriteSheet } = await import('/src/view/sprites.js');
    const g = spriteSheet('blob', 'right'), rows = g.map(r => r.filter(Boolean).length), wide = Math.max(...rows), tall = rows.filter(Boolean).length;
    return { wide, tall, fill: rows.reduce((a, b) => a + b, 0) / (wide * tall) };
  });
  check('the blob is a rounded square, not a ball (register 860)', blob.fill > 0.86 && blob.fill < 0.97 && blob.wide >= 22, JSON.stringify(blob));

  // The menu's room: a whole number of screen pixels to an art pixel, and a line where a wall meets open floor.
  const menu = await p.evaluate(async () => {
    const { MENU_MARGIN: m } = await import('/src/app/menuScene.js'), { T } = await import('/src/view/ink.js'), { lineOf } = await import('/src/view/crayon.js'), { P } = await import('/src/view/crayonSprites.js');
    const c = document.getElementById('menuRoom'), g = c.getContext('2d'), r = c.getBoundingClientRect();
    const px = (x, y) => '#' + [...g.getImageData(x, y, 1, 1).data].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
    // The ring's right column is one tile right of the room; one pixel past its far side, on row 5.
    return { per: r.width / c.width * devicePixelRatio, outer: px((m + 7) * T, (m + 5) * T + 9), line: lineOf(P.wall).slice(0, 7) };
  });
  check('the menu\'s room is drawn on whole screen pixels', Math.abs(menu.per - Math.round(menu.per)) < 0.01 && menu.per >= 1, JSON.stringify(menu));
  check('the menu\'s walls have their line where they meet open floor', menu.outer === menu.line, JSON.stringify(menu));
  check('nothing threw', !errors.length, errors.join(' | '));
} finally { await browser.close(); server.close(); }
done();
