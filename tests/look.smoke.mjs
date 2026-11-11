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
  // The room's own edge (register 869): outside it is wall, so a floor tile at the edge carries that wall's line.
  const edge = await p.evaluate(async () => {
    const { drawMasses } = await import('/src/view/masses.js'), { T } = await import('/src/view/ink.js'), { lineOf } = await import('/src/view/crayon.js'), { P } = await import('/src/view/crayonSprites.js');
    const c = document.createElement('canvas'); c.width = c.height = 2 * T; const g = c.getContext('2d');
    g.fillStyle = '#ffffffff'; g.fillRect(0, 0, c.width, c.height);
    drawMasses(g, ['', '', '', 'wall'], 2, 2);
    const px = (x, y) => '#' + [...g.getImageData(x, y, 1, 1).data].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
    return { line: lineOf(P.wall).slice(0, 7), left: px(0, T / 2), top: px(T / 2, 0), right: px(2 * T - 1, T / 2), inside: px(T / 2, T / 2), wallEdge: px(2 * T - 1, T + T / 2) };
  });
  check('a room has a line where its floor meets the wall round it, on every side', [edge.left, edge.top, edge.right].every(c => c === edge.line) && edge.inside === '#ffffff' && edge.wallEdge !== edge.line, JSON.stringify(edge));

  // One frame for the whole interface (register 872): every control on a screen wears the line and the edge
  // inside it. A link that is only words is the one exception.
  const bare = () => p.evaluate(() => {
    const top = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body, out = [];
    for (const e of top.querySelectorAll('button, input[type=text], input[type=number], select, textarea')) {
      const r = e.getBoundingClientRect(), c = getComputedStyle(e);
      if (r.width < 2 || r.height < 2 || c.visibility === 'hidden' || e.closest('[hidden]') || c.opacity === '0' || e.id === 'menuDebug') continue;
      if ((c.boxShadow.match(/inset/g) || []).length < 2) out.push(e.id || e.className || e.tagName);
    }
    return out;
  });
  const menuBare = await bare();
  check('every control on the menu wears the frame', !menuBare.length, menuBare.join(' '));
  const sign = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('.menuList')), fade = getComputedStyle(document.querySelector('.menu'), '::after'); return { framed: (c.boxShadow.match(/inset/g) || []).length >= 2, fade: fade.display }; });
  check('the menu\'s choices are one framed sign, and nothing fades the room', sign.framed && sign.fade === 'none', JSON.stringify(sign));
  // The title is a drawing in the look (register 876): its letters' colour, a darker line round them, on whole pixels.
  const title = await p.evaluate(async () => {
    const { lineOf } = await import('/src/view/crayon.js'), { P } = await import('/src/view/crayonSprites.js'), { LOGO_SCALE } = await import('/src/app/logo.js');
    const c = document.querySelector('.menuLogo canvas'); if (!c) return { canvas: false };
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set(); let inked = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { inked++; seen.add('#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')); }
    return { canvas: true, line: seen.has(lineOf(P.violet).slice(0, 7)), tones: seen.size, inked, per: c.getBoundingClientRect().width / c.width, scale: LOGO_SCALE, label: document.querySelector('.menuLogo').getAttribute('aria-label') };
  });
  check('the title is drawn like a piece: a line round its letters, lit and shaded, on whole pixels', title.canvas && title.line && title.tones >= 4 && title.inked > 1500 && title.per === title.scale && title.label === 'wee', JSON.stringify(title));
  // A button is square, with a line and a lighter band inside it: nothing is cut off its corners (register 878).
  const btn = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('#menuCampaign')); return { clip: c.clipPath, radius: c.borderTopLeftRadius, insets: (c.boxShadow.match(/inset/g) || []).length }; });
  check('a button has square corners, nothing cut', btn.clip === 'none' && btn.radius === '0px' && btn.insets === 2, JSON.stringify(btn));
  await p.click('#menuCampaign'); await p.waitForTimeout(400);
  const listBare = await bare(), locked = await p.evaluate(() => { const e = document.createElement('button'); e.className = 'campRow locked'; e.append(document.createElement('b')); document.querySelector('#campList').append(e); const o = getComputedStyle(e).opacity + '/' + getComputedStyle(e.firstChild).opacity; e.remove(); return o; });
  check('every control on the level list wears the frame, and a locked level keeps its line', !listBare.length && locked === '1/0.45', listBare.join(' ') + ' ' + locked);
  await p.click('.campRow[data-level]'); await p.waitForTimeout(700);
  const levelBare = await bare();
  check('every control in a level wears the frame', !levelBare.length, levelBare.join(' '));
  // Who's playing: the row that is picked keeps the frame, in the accent.
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(500);
  await p.click('#menuSlot'); await p.waitForTimeout(400);
  const whoBare = await bare(), picked = await p.evaluate(() => !!document.querySelector('.slotRow.on'));
  check('every control on Who\'s playing wears the frame, the picked row too', picked && !whoBare.length, picked + ' ' + whoBare.join(' '));
  check('nothing threw', !errors.length, errors.join(' | '));
} finally { await browser.close(); server.close(); }
done();
