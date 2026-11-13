// The crayon look as it is painted (docs/THEME.md, registers 858 to 863): a wall wears the same line on every
// open side, a beam is flat and stops at the line of what it hits, the blob is a rounded square, and the
// menu's room is drawn on whole screen pixels with a line where its walls meet open floor.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite, opt } from './lib.mjs';

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
  check('Wee is a rounded square, not a ball (register 860)', blob.fill > 0.86 && blob.fill < 0.97 && blob.wide >= 22, JSON.stringify(blob));

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
    const { lineOf, resolve, lt } = await import('/src/view/crayon.js'), { P } = await import('/src/view/crayonSprites.js'), { LOGO_SCALE } = await import('/src/app/logo.js');
    const c = document.querySelector('.menuLogo canvas'); if (!c) return { canvas: false };
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set(); let inked = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3]) { inked++; seen.add('#' + [d[i], d[i + 1], d[i + 2]].map(v => v.toString(16).padStart(2, '0')).join('')); }
    return { canvas: true, line: seen.has(lineOf(P.violet).slice(0, 7)), lit: seen.has(resolve(lt(P.violet, 0.3))), tones: seen.size, inked, per: c.getBoundingClientRect().width / c.width, scale: LOGO_SCALE, label: document.querySelector('.menuLogo').getAttribute('aria-label') };
  });
  check('the title is drawn like a piece: one flat colour and a line round its letters, on whole pixels (register 950)', title.canvas && title.line && !title.lit && title.tones === 2 && title.inked > 1500 && title.per === title.scale && title.label === 'wee', JSON.stringify(title));
  // On a phone the title sits clear of the corner buttons (register 880).
  const under = await p.evaluate(() => { const l = document.querySelector('.menuLogo canvas').getBoundingClientRect(); return [...document.querySelectorAll('.menuCorner')].filter(b => { const r = b.getBoundingClientRect(); return r.width && r.left < l.right && r.right > l.left && r.top < l.bottom && r.bottom > l.top; }).map(b => b.id); });
  check('the title is never behind a corner button', !under.length, under.join(' '));
  // A button is square, with a line and a lighter band inside it: nothing is cut off its corners (register 878).
  const btn = await p.evaluate(() => { const c = getComputedStyle(document.querySelector('#menuCampaign')); return { clip: c.clipPath, radius: c.borderTopLeftRadius, insets: (c.boxShadow.match(/inset/g) || []).length }; });
  check('a button has square corners, nothing cut', btn.clip === 'none' && btn.radius === '0px' && btn.insets === 2, JSON.stringify(btn));
  await p.click('#menuCampaign'); await p.waitForTimeout(400);
  const listBare = await bare(), locked = await p.evaluate(() => { const e = document.createElement('button'); e.className = 'campRow locked'; e.append(document.createElement('b')); document.querySelector('#campList').append(e); const o = getComputedStyle(e).opacity + '/' + getComputedStyle(e.firstChild).opacity; e.remove(); return o; });
  check('every control on the level list wears the frame, and a locked level keeps its line', !listBare.length && locked === '1/0.45', listBare.join(' ') + ' ' + locked);
  await p.click('.campRow[data-level]'); await p.waitForTimeout(700);
  const levelBare = await bare();
  check('every control in a level wears the frame', !levelBare.length, levelBare.join(' '));
  // A goal's mark is a box to tick, not a ring (register 881).
  const mark = await p.evaluate(() => { const m = document.querySelector('.campReqs .mark'); const c = getComputedStyle(m, '::before'); return { clip: c.clipPath, insets: (c.boxShadow.match(/inset/g) || []).length }; });
  check('a goal\'s mark is a square box with the frame', mark.clip === 'none' && mark.insets >= 1, JSON.stringify(mark));
  // The clipboard's goals are lines on its paper: the main goal has no bar of its own and a side goal is no chip.
  const lines = await p.evaluate(() => { const m = getComputedStyle(document.querySelector('.campBrief .campMain')), o = document.querySelector('.campBrief .campOpt li'), c = o ? getComputedStyle(o) : null; return { bar: m.boxShadow, chip: c ? c.boxShadow + '/' + c.borderTopLeftRadius : 'none/0px' }; });
  check('a goal on the clipboard is a line on its paper, not a bar or a chip', lines.bar === 'none' && lines.chip === 'none/0px', JSON.stringify(lines));
  // Words sit on their lines (register 884): each goal is ruled under itself.
  const ruled = await p.evaluate(() => { const m = getComputedStyle(document.querySelector('.campBrief .campMain')); return { goal: /gradient/.test(m.backgroundImage) ? '2px' : 'none' }; });
  check('a goal is ruled under its own words', ruled.goal === '2px', JSON.stringify(ruled));
  // What is written on paper is in the hand (register 890), loaded from the repo's own font file.
  const hand = await p.evaluate(async () => { await document.fonts.load("18px 'Hand'"); const f = e => getComputedStyle(document.querySelector(e)); return { goal: f('.campBrief .campReqs li').fontFamily, size: f('.campBrief .campReqs li').fontSize, loaded: document.fonts.check("18px 'Hand'") }; });
  check('a goal is written in the hand, at a whole step of its grid', /^"?Hand/.test(hand.goal) && hand.size === '18px' && hand.loaded, JSON.stringify(hand));
  // Icons are flat and tools unstretched (registers 900, 902): no ring or lit edge on an icon, and a tool's
  // picture has one canvas pixel to each page pixel.
  const sharp = await p.evaluate(() => { const g = document.querySelector('#campRun .glyph.px .l'), c = document.querySelector('#palette canvas, #campTools canvas'); return { ring: g ? getComputedStyle(g).display : 'missing', canvas: c ? c.width + '/' + getComputedStyle(c).width : '' }; });
  check('an icon is one flat shape, and a tool\'s picture is shown at its own size', sharp.ring === 'none' && sharp.canvas === '32/32px', JSON.stringify(sharp));
  // One frame (register 911): the way back and the header are in the same place on the list and in a level.
  {
    const at = sel => p.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(e => e.offsetParent !== null), r = e && e.getBoundingClientRect(); return r ? [r.left, r.top, r.width, r.height].map(Math.round).join() : ''; }, sel);
    const style = (btn, title) => p.evaluate(([btn, title]) => { const b = [...document.querySelectorAll(btn)].find(e => e.offsetParent !== null), g = b.querySelector('svg').getBoundingClientRect(), t = getComputedStyle([...document.querySelectorAll(title)].find(e => e.offsetParent !== null)); return [Math.round(g.width), t.fontSize, t.fontFamily].join(); }, [btn, title]);
    const inLevel = { back: await at('#campBack'), head: (await at('header')).split(',')[3], look: await style('#campBack', '#campNum'), title: await p.evaluate(() => { const r = document.getElementById('campNum').getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - innerWidth / 2) <= 2; }) };
    await p.click('#campBack'); await p.waitForTimeout(500);
    const inList = { back: await at('dialog[open] .roomsHead .upBtn'), head: (await at('dialog[open] .roomsHead')).split(',')[3], look: await style('dialog[open] .roomsHead .upBtn', 'dialog[open] .roomsHead > b') };
    check('the way back, its icon, the title\'s type and the header are the same on the level list and in a level, and a level\'s title is in the middle (registers 911, 914)', inLevel.back === inList.back && inLevel.head === inList.head && inLevel.look === inList.look && inLevel.title, JSON.stringify({ inLevel, inList }));
    await p.click('.campRow[data-level]'); await p.waitForTimeout(600);
  }
  // The desk (register 883): the room's ring has its own line and shadow.
  const desk = await p.evaluate(() => { const n = s => (getComputedStyle(document.querySelector(s)).boxShadow.match(/rgb/g) || []).length; return { ring: n('#ring'), page: getComputedStyle(document.body).backgroundImage !== 'none' }; });
  check('the room lies on squared paper with a line and a shadow', desk.ring >= 2 && desk.page, JSON.stringify(desk));
  // On a wide window the tools are one framed tray of full-size buttons beside the room.
  const wide = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await wide.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; });
  await wide.goto(`http://localhost:${PORT}/index.html`); await wide.waitForTimeout(500);
  await wide.click('#menuCampaign'); await wide.waitForTimeout(300); await wide.click('.campRow[data-level]'); await wide.waitForTimeout(700);
  const tray = await wide.evaluate(() => { const t = document.getElementById('tools'), tr = t.getBoundingClientRect(), s = getComputedStyle(t), room = document.getElementById('roomArea').getBoundingClientRect();
    const cut = [...t.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.right > tr.right + 0.5 || r.width < 44 || r.height < 44); }).length;
    return { framed: (s.boxShadow.match(/inset/g) || []).length >= 2, cut, gap: Math.round(room.left - tr.right), right: Math.round(innerWidth - room.right), left: Math.round(tr.left) }; });
  check('the tool tray is framed, holds every tool whole at full size, and sits against the room', tray.framed && tray.cut === 0 && tray.gap <= 24 && Math.abs(tray.left - tray.right) <= 40, JSON.stringify(tray));
  await wide.close();
  // Who's playing: the row that is picked keeps the frame, in the accent.
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(500);
  await opt(p, 'menuSlot'); await p.waitForTimeout(400);
  const whoBare = await bare(), picked = await p.evaluate(() => !!document.querySelector('.slotRow.on'));
  check('every control on Who\'s playing wears the frame, the picked row too', picked && !whoBare.length, picked + ' ' + whoBare.join(' '));
  check('nothing threw', !errors.length, errors.join(' | '));
} finally { await browser.close(); server.close(); }
done();
