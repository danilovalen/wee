// Drives the real page: edit by clicking, play by keys, save and open a file,
// and checks painted pixels where the text state says the player is.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../tools/serve.mjs';
import { room, suite } from './lib.mjs';
import { GROUPS } from '../src/editor/palette.js';
const GROUP_COUNT = GROUPS.length;

const { check, done } = suite('browser');
const FIRST_W = JSON.parse(readFileSync('rooms/first-room.wee', 'utf8')).w;
const PORT = 5199;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
mkdirSync('shots', { recursive: true });

try {
  await page.goto(`http://localhost:${PORT}/?sandbox`);
  await page.waitForFunction(() => window.wee);
  await page.waitForFunction(() => window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  check('wee starts on the library', await page.locator('#roomsBox').isVisible());
  check('focus starts on New room, not on Close', await page.evaluate(() => document.activeElement.id) === 'roomNew', await page.evaluate(() => document.activeElement.id));
  check('a fresh start has no unsaved tile', await page.locator('#openNow').isHidden());
  check('floors are their own section: water, sticky puddle and gravel', (await page.$$eval('[data-tool][data-in=floors]', bs => bs.map(b => b.dataset.tool).join())) === 'water,sticky,gravel' && await page.locator('[data-group=floors]').count() === 1);
  await page.click('#roomsBox .roomsHead button');
  const text = async () => JSON.parse(await page.evaluate(() => window.renderGameToText()));
  // A tool sits in one tab of the palette: open its tab, then pick it.
  const pick = async t => { const tab = page.locator(`[data-group=${await page.getAttribute(`[data-tool=${t}]`, 'data-in')}]`); if (await tab.isVisible()) await tab.click(); await page.click(`[data-tool=${t}]`); };
  // Canvas clicks are aimed from the room's position with the page scrolled to the top.
  for (const fn of ['click', 'move']) { const real = page.mouse[fn].bind(page.mouse); page.mouse[fn] = async (...a) => { await page.evaluate(() => scrollTo(0, 0)); return real(...a); }; }
  const box = await page.locator('#game').boundingBox();
  const at = (x, y) => ({ x: box.x + (x + 0.5) * box.width / 20, y: box.y + (y + 0.5) * box.height / 12 });

  // on a wide screen every tool shows at once, in sections, with no tabs
  const wide = await page.evaluate(() => ({ tabs: !!document.getElementById('groups').offsetParent, hidden: [...document.querySelectorAll('[data-tool]')].filter(b => !b.offsetParent).length, heads: [...document.querySelectorAll('.ghead')].filter(h => h.offsetParent).length }));
  check('on desktop the tools are sections, all visible, no tabs', !wide.tabs && wide.hidden === 0 && wide.heads === GROUP_COUNT, JSON.stringify(wide));
  // nothing in a panel is cut by its panel: every control sits inside its box
  const type = await page.evaluate(async () => {
    await document.fonts.ready;
    const fam = sel => getComputedStyle(document.querySelector(sel)).fontFamily.split(',')[0].replace(/["']/g, '');
    return { body: fam('body'), button: fam('#mode'), head: fam('.ghead'), logo: fam('.logo'),
      loaded: ['400 14px Bitter', '600 13px Asap', '800 11px Asap', '700 22px Comfortaa'].filter(f => !document.fonts.check(f)) };
  });
  check('text is Bitter, controls and heads Asap, the wordmark Comfortaa', type.body === 'Bitter' && type.button === 'Asap' && type.head === 'Asap' && type.logo === 'Comfortaa', JSON.stringify(type));
  check('and all four faces actually loaded', !type.loaded.length, type.loaded.join(' | '));
  const cut = await page.evaluate(() => {
    const out = [];
    for (const panel of document.querySelectorAll('aside, header')) {
      const r = panel.getBoundingClientRect();
      for (const el of panel.querySelectorAll('button, label, input, h2, p, small')) {
        if (el.closest('[hidden]')) continue;
        const e = el.getBoundingClientRect();
        if (e.width === 0) continue;
        if (e.left < r.left - 0.5 || e.right > r.right + 0.5 || e.top < r.top - 0.5 || e.bottom > r.bottom + 0.5 || el.scrollWidth > el.clientWidth + 1)
          out.push((el.textContent || el.tagName).trim().slice(0, 20));
      }
    }
    return out;
  });
  check('no control spills out of its panel', cut.length === 0, cut.join(', '));

  // edit by clicking: a block, a right-click erase, then a dragged row of enemies
  // Look is the starting tool: a click with it changes nothing and says what is there
  const before = JSON.stringify((await text()).level);
  let p = at(0, 0), q; await page.mouse.click(p.x, p.y);
  check('Look is the starting tool and a click changes nothing', JSON.stringify((await text()).level) === before);
  check('Look says what is under it', (await page.textContent('#placeHint')) === 'Block', await page.textContent('#placeHint'));
  await pick('wall');
  p = at(5, 5); await page.mouse.click(p.x, p.y);
  let lv = (await text()).level;
  check('a click places a block', lv.cells[5 * 20 + 5] === 'wall');
  await page.mouse.click(p.x, p.y, { button: 'right' });
  lv = (await text()).level;
  check('a right click erases it', lv.cells[5 * 20 + 5] === '');
  await page.mouse.click(p.x, p.y); await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  check('clicking a block with Block selected removes it', lv.cells[5 * 20 + 5] === '');
  await pick('tri');
  await page.click('[data-corner=ne]');
  await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  check('a triangle places with its chosen corner', lv.cells[5 * 20 + 5] === 'tri:ne');
  await page.mouse.click(p.x, p.y);
  check('and a second click removes it', (await text()).level.cells[5 * 20 + 5] === '');
  await pick('wall');
  await pick('enemy');
  check('enemy options show', await page.locator('[data-axis=h][data-dir="1"]').isVisible());
  await page.click('[data-axis=v][data-dir="-1"]');
  check('a starting direction is picked by its arrow', await page.locator('[data-axis=v][data-dir="-1"]').evaluate(b => b.classList.contains('on')) && !(await page.locator('[data-axis=v][data-dir="1"]').evaluate(b => b.classList.contains('on'))));
  await page.click('[data-axis=h][data-dir="1"]');
  await page.click('[data-mode=realtime]');
  const a = at(3, 8), b = at(6, 8);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  lv = (await text()).level;
  const enemies = lv.entities.filter(e => e.kind === 'enemy' && e.y === 8);
  check('a drag paints a row', enemies.length === 4, String(enemies.length));
  check('placed enemies keep the chosen clock', enemies.every(e => e.mode === 'realtime'));
  // a drag that starts on the selected type removes that type along the way, and nothing else
  await pick('enemy');
  const r0 = at(3, 8), r1 = at(5, 8);
  await page.mouse.move(r0.x, r0.y); await page.mouse.down(); await page.mouse.move(r1.x, r1.y, { steps: 6 }); await page.mouse.up();
  lv = (await text()).level;
  const left = lv.entities.filter(e => e.kind === 'enemy' && e.y === 8).map(e => e.x);
  check('a drag from an enemy removes the enemies it crosses', left.join() === '6', left.join());
  await pick('checkpoint');
  const c9 = at(9, 10); await page.mouse.click(c9.x, c9.y);
  await pick('wall');
  const b0 = at(7, 10), b1 = at(11, 10);
  await page.mouse.move(b0.x, b0.y); await page.mouse.down(); await page.mouse.move(b1.x, b1.y, { steps: 8 }); await page.mouse.up();
  lv = (await text()).level;
  check('a placing drag fills its path, replacing what was there', [7, 8, 9, 10, 11].every(x => lv.cells[10 * 20 + x] === 'wall'));
  await pick('checkpoint');
  await page.mouse.click(c9.x, c9.y);
  await pick('wall');
  await page.mouse.move(b0.x, b0.y); await page.mouse.down(); await page.mouse.move(b1.x, b1.y, { steps: 8 }); await page.mouse.up();
  lv = (await text()).level;
  check('a drag from a block removes the blocks it crosses', [7, 8, 10, 11].every(x => lv.cells[10 * 20 + x] === ''));
  check('and leaves the checkpoint in its path alone', lv.cells[10 * 20 + 9] === 'checkpoint', lv.cells[10 * 20 + 9]);
  // a turret aims where you choose and mounts on a box it is placed on
  await pick('box');
  p = at(10, 3); await page.mouse.click(p.x, p.y);
  await pick('turret');
  await page.click('[data-aim=down]');
  await page.click('[data-aim=right]');
  check('the last aimed direction cannot be turned off', await page.locator('[data-aim=down]').isDisabled());
  check('a turret with one direction has no start to choose', !(await page.locator('#startOpt').isVisible()));
  await page.click('[data-aim=left]');
  check('with two, it starts on one of them', await page.locator('#startOpt').isVisible() && await page.locator('[data-start=up]').isDisabled() && !(await page.locator('[data-start=left]').isDisabled()));
  await page.mouse.click(p.x, p.y);
  q = at(12, 3); await page.mouse.click(q.x, q.y);
  lv = (await text()).level;
  const mounted = lv.entities.find(e => e.x === 10 && e.y === 3);
  const alone = lv.entities.find(e => e.x === 12 && e.y === 3);
  check('a turret on a box mounts on it', mounted?.kind === 'box' && mounted.turret?.dirs.join() === 'down,left', JSON.stringify(mounted));
  check('a turret on floor stands alone', alone?.kind === 'turret', JSON.stringify(alone));
  await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  const unmounted = lv.entities.find(e => e.x === 10 && e.y === 3);
  check('clicking a mounted turret again takes only the turret off', unmounted?.kind === 'box' && !unmounted.turret, JSON.stringify(unmounted));
  await pick('mover');
  await page.click('[data-mode=follow]');
  check('a follower has no patrol axis to pick', !(await page.locator('[data-axis=h][data-dir="1"]').isVisible()));
  p = at(14, 3); await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  check('a follow piece saves its clock', lv.entities.find(e => e.x === 14 && e.y === 3)?.mode === 'follow');
  await page.click('[data-mode=input]');
  await pick('gate');
  await page.click('[data-pass=left]');
  q = at(15, 3); await page.mouse.click(q.x, q.y);
  check('a one-way tile keeps its directions', (await text()).level.cells[3 * 20 + 15] === 'gate:right,left', (await text()).level.cells[3 * 20 + 15]);
  await page.click('[data-pass=right]');
  check('the last allowed direction cannot be turned off', await page.locator('[data-pass=left]').isDisabled());
  await pick('spring');
  await page.click('[data-face=left]');
  q = at(16, 3); await page.mouse.click(q.x, q.y);
  await pick('death');
  q = at(17, 3); await page.mouse.click(q.x, q.y);
  lv = (await text()).level;
  check('a spring keeps the way it faces, and a death block places', lv.cells[3 * 20 + 16] === 'spring:left' && lv.cells[3 * 20 + 17] === 'death', lv.cells[3 * 20 + 16] + ' ' + lv.cells[3 * 20 + 17]);
  await pick('sensor');
  await page.click('[data-colour=blue]');
  q = at(18, 3); await page.mouse.click(q.x, q.y);
  check('a laser sensor places in its colour', (await text()).level.cells[3 * 20 + 18] === 'sensor:blue', (await text()).level.cells[3 * 20 + 18]);
  await page.mouse.click(q.x, q.y);
  check('and clicking it again with the sensor tool removes it', (await text()).level.cells[3 * 20 + 18] === '');
  await pick('water');
  q = at(18, 4); await page.mouse.click(q.x, q.y);
  check('water places', (await text()).level.cells[4 * 20 + 18] === 'water', (await text()).level.cells[4 * 20 + 18]);
  await pick('sticky');
  q = at(17, 4); await page.mouse.click(q.x, q.y);
  check('a sticky puddle places', (await text()).level.cells[4 * 20 + 17] === 'sticky', (await text()).level.cells[4 * 20 + 17]);
  await pick('wall');
  check('enemy options hide for a block', !(await page.locator('[data-axis=h][data-dir="1"]').isVisible()));
  await page.screenshot({ path: 'shots/edit.png' });

  // play a known room by keys on a fixed clock
  await page.evaluate(l => window.wee.loadLevel(l), room([
    '##########',
    '#P..B...C#',
    '#........#',
    '#..o..D..#',
    '##########',
  ]));
  await pick('water');
  await page.keyboard.press('e');
  await page.evaluate(() => { window.__manualClock = true; });
  check('E enters play', (await text()).mode === 'play');
  await page.keyboard.press('ArrowRight');
  await page.evaluate(() => window.advanceTime(600));
  let s = await text();
  check('a key slide pushes the box to the wall', s.player.x === 7 && s.pieces[0].x === 8, JSON.stringify(s.player));
  await page.screenshot({ path: 'shots/play.png' });

  // the painted player sits where the text state says
  const px = await page.evaluate(({ x, y }) => {
    const c = document.getElementById('game'), tile = c.width / window.wee.getLevel().w;
    const d = c.getContext('2d').getImageData(Math.round((x + 0.5) * tile), Math.round((y + 0.75) * tile), 1, 1).data;
    return [d[0], d[1], d[2]];
  }, s.player);
  check('the player is painted on its tile', px[2] > 200 && px[2] - px[1] > 80 && px[0] < px[2] - 60, px.join(','));
  await page.locator('#statusList [data-power=armored]').setChecked(true);
  await page.evaluate(() => window.advanceTime(60));
  const rim = await page.evaluate(({ x, y }) => {
    const c = document.getElementById('game'), tile = c.width / window.wee.getLevel().w;
    const d = c.getContext('2d').getImageData(Math.round((x + 0.5 + 11.5 / 32) * tile), Math.round((y + 0.5) * tile), 1, 1).data;
    return [d[0], d[1], d[2]];
  }, s.player);
  check('armored, the player wears a steel rim', rim[2] > 160 && rim[0] > 110 && rim[0] < rim[2], rim.join(','));
  await page.locator('#statusList [data-power=armored]').setChecked(false);

  await page.keyboard.press('ArrowDown');
  await page.evaluate(() => window.advanceTime(600));
  await page.keyboard.press('r');
  await page.evaluate(() => window.advanceTime(120));
  s = await text();
  check('R returns to the start before any checkpoint', s.player.x === 1 && s.player.y === 1, JSON.stringify(s.player));
  await page.keyboard.press('e');
  check('E goes back to editing', (await text()).mode === 'edit');
  check('going back to editing selects Look, on its open tab', await page.locator('[data-tool=look]').evaluate(b => b.classList.contains('on')) && await page.locator('[data-tool=look]').isVisible());
  check('playing did not change the room', (await text()).level.entities[0].x === 4);

  const roomBeforePanel = (await text()).level;
  // Select: drag a box, copy, paste where you click, rotate, delete, all undoable
  const sr = room(['########', '#P.....#', '#.B....#', '#.o....#', '#......#', '########']);
  await page.evaluate(l => window.wee.loadLevel(l), sr);
  await page.evaluate(() => scrollTo(0, 0));
  const S8 = await page.locator('#game').boundingBox();
  const at8 = (x, y) => ({ x: S8.x + (x + 0.5) * S8.width / 8, y: S8.y + (y + 0.5) * S8.height / 6 });
  await pick('select');
  check('with nothing selected, Copy is off', await page.locator('#selCopy').isDisabled());
  let a8 = at8(2, 2), b8 = at8(2, 3);
  await page.mouse.move(a8.x, a8.y); await page.mouse.down(); await page.mouse.move(b8.x, b8.y, { steps: 4 }); await page.mouse.up();
  await page.click('#selCopy');
  check('Copy says what it took', (await page.textContent('#placeHint')).startsWith('Copied 1x2'));
  await page.click('#selPaste');
  a8 = at8(5, 2); await page.mouse.move(a8.x, a8.y); await page.mouse.click(a8.x, a8.y);
  let lv8 = (await text()).level;
  check('Paste stamps the copy where you click', lv8.entities.some(e => e.kind === 'box' && e.x === 5 && e.y === 2) && lv8.cells[3 * 8 + 5] === 'button:red');
  await page.click('#selPaste');
  check('Done leaves paste mode', (await page.textContent('#selPaste')) === 'Paste');
  await page.click('#undo');
  check('the paste is one undo step', !(await text()).level.entities.some(e => e.x === 5));
  a8 = at8(2, 2); b8 = at8(2, 3);
  await page.mouse.move(a8.x, a8.y); await page.mouse.down(); await page.mouse.move(b8.x, b8.y, { steps: 4 }); await page.mouse.up();
  await page.click('#selRotate');
  lv8 = (await text()).level;
  check('Rotate turns the box in place: a 1x2 column becomes a 2x1 row', lv8.cells[2 * 8 + 2] === 'button:red' && lv8.cells[3 * 8 + 2] === '' && lv8.entities.length === 1 && lv8.entities[0].x === 3 && lv8.entities[0].y === 2, JSON.stringify(lv8.entities));
  await page.keyboard.press('Delete');
  check('Delete clears the box', (await text()).level.entities.length === 0);
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z');
  lv8 = (await text()).level;
  check('and both undo', lv8.entities.some(e => e.x === 2 && e.y === 2) && lv8.cells[3 * 8 + 2] === 'button:red');
  // Drag inside the box to move it: one undo step, and the box goes with it.
  await page.keyboard.press('Escape');
  a8 = at8(2, 2); b8 = at8(2, 3);
  await page.mouse.move(a8.x, a8.y); await page.mouse.down(); await page.mouse.move(b8.x, b8.y, { steps: 4 }); await page.mouse.up();
  const c8 = at8(5, 2);
  await page.mouse.move(a8.x, a8.y); await page.mouse.down(); await page.mouse.move(c8.x, c8.y, { steps: 6 }); await page.mouse.up();
  lv8 = (await text()).level;
  check('dragging inside the box moves it', lv8.entities.some(e => e.kind === 'box' && e.x === 5 && e.y === 2) && lv8.cells[3 * 8 + 5] === 'button:red' && !lv8.entities.some(e => e.x === 2 && e.y === 2) && lv8.cells[3 * 8 + 2] === '', JSON.stringify(lv8.entities));
  await page.keyboard.press('Control+c');
  check('and the box follows it', (await page.textContent('#placeHint')).startsWith('Copied 1x2'));
  await page.keyboard.press('Control+z');
  lv8 = (await text()).level;
  check('the move is one undo step', lv8.entities.some(e => e.x === 2 && e.y === 2) && lv8.cells[3 * 8 + 2] === 'button:red' && !lv8.entities.some(e => e.x === 5));
  const st8 = lv8.start, sa = at8(st8.x, st8.y), sb = at8(st8.x + 1, st8.y);
  await page.keyboard.press('Escape');
  await page.mouse.click(sa.x, sa.y);
  await page.mouse.move(sa.x, sa.y); await page.mouse.down(); await page.mouse.move(sb.x, sb.y, { steps: 4 }); await page.mouse.up();
  lv8 = (await text()).level;
  check('the start rides along when it is inside the box', lv8.start.x === st8.x + 1 && lv8.start.y === st8.y, JSON.stringify([st8, lv8.start]));
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Escape');
  await page.evaluate(l => window.wee.loadLevel(l), JSON.parse(JSON.stringify(roomBeforePanel)));
  // the Look tool: Show stops marks the tiles you can stop on; Play from here starts there
  const box6 = room(['######', '#P...#', '#....#', '######']);
  box6.powers = { ...box6.powers, boomerang: false, dive: false, laser: false };
  await page.evaluate(l => window.wee.loadLevel(l), box6);
  await pick('look');
  await page.click('#stopsBtn');
  await page.waitForFunction(() => document.getElementById('lensLegend').textContent.includes('tiles you can stop on'));
  check('Lenses open on Stops, counting the tiles you can stop on', (await page.textContent('#lensLegend')).includes('Dots: 4 tiles'), await page.textContent('#lensLegend'));
  const dot = async (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; const d = c.getContext('2d').getImageData(Math.round((x + 0.5) * t), Math.round((y + 0.5) * t), 1, 1).data; return d[0] < 150 && d[2] > 200; }, [x, y]); // the player's sky on a light gray floor
  // The legend can land a frame before the room draws the dots, so let two frames pass first.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  check('a stop gets a dot, a tile you only slide over does not', await dot(4, 2) && !(await dot(2, 2)));
  await page.click('#stopsBtn');
  await page.waitForTimeout(80);
  check('Closing the lenses takes the dots away', !(await dot(4, 2)));
  await page.evaluate(() => scrollTo(0, 0));
  const L6 = await page.locator('#game').boundingBox();
  const at6 = (x, y) => ({ x: L6.x + (x + 0.5) * L6.width / 6, y: L6.y + (y + 0.5) * L6.height / 4 });
  let p6 = at6(0, 0); await page.mouse.click(p6.x, p6.y);
  check('Play from here is not offered on a block', !(await page.locator('#playHere').isVisible()));
  p6 = at6(3, 2); await page.mouse.click(p6.x, p6.y);
  await page.click('#playHere');
  check('Play from here starts the run on that tile', (await text()).mode === 'play' && (await text()).player.x === 3 && (await text()).player.y === 2);
  await page.keyboard.press('e');
  check('and the room itself keeps its start', (await text()).level.start.x === 1);
  // adding and cutting a side, and Border, are single undoable steps
  await page.evaluate(l => window.wee.loadLevel(l), room(['.....', '.P...', '.....']));
  // The "+" on the room's right edge adds a column there; the status bar reads the new size.
  await page.click('[data-plus=right]');
  check('the + on an edge adds a column there, and the size readout follows', (await text()).level.w === 6 && (await page.textContent('#sizeBtn')) === '6\u00d73', await page.textContent('#sizeBtn'));
  await page.click('#undo');
  // Dragging a grip: outward adds as many lines as it covers, inward cuts, one undo step each.
  const drag = async (side, tiles) => {
    const b = page.locator(`[data-plus=${side}]`); await page.hover('#game'); const r = await b.boundingBox();
    const t = await page.evaluate(() => document.getElementById('game').getBoundingClientRect().width / window.wee.getLevel().w);
    const [ux, uy] = { right: [1, 0], left: [-1, 0], top: [0, -1], bottom: [0, 1] }[side];
    await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await page.mouse.down();
    await page.mouse.move(r.x + r.width / 2 + ux * tiles * t, r.y + r.height / 2 + uy * tiles * t, { steps: 8 });
    const band = await page.evaluate(() => { const b = document.querySelector('.sizeBand:not([hidden])'); return b && { text: b.textContent }; });
    await page.mouse.up();
    return band;
  };
  const b2 = await drag('bottom', 2);
  check('dragging the bottom grip down two tiles adds two rows, and shows +2 first', (await text()).level.h === 5 && b2 && b2.text === '+2', JSON.stringify(b2) + (await text()).level.h);
  await drag('bottom', -1);
  check('dragging it back up one cuts one', (await text()).level.h === 4);
  await page.click('#undo'); await page.click('#undo');
  check('each drag is one undo step', (await text()).level.h === 3);
  const far = await drag('top', -5);
  check('a drag past 2 tall stops at the last line that can go', far && far.text === '\u22121' && (await text()).level.h === 2, JSON.stringify(far));
  check('no band is left behind after a drag', await page.evaluate(() => !document.querySelector('.sizeBand:not([hidden])')));
  await page.click('#undo');
  check('the size readout opens the size controls', await page.locator('#sizePop').isHidden() && await page.click('#sizeBtn').then(() => page.locator('#sizePop').isVisible()));
  await page.keyboard.press('Escape');
  check('Escape shuts them', await page.locator('#sizePop').isHidden());
  await page.click('#sizeBtn');
  await page.click('[data-side=top][data-delta="1"]');
  check('Add above makes the room a row taller, start moved down', (await text()).level.h === 4 && (await text()).level.start.y === 2);
  await page.click('#border');
  check('Border walls the edge', (await text()).level.cells.slice(0, 5).every(c => c === 'wall'));
  await page.click('#undo'); await page.click('#undo');
  check('and each undoes in one step', (await text()).level.h === 3);
  await page.click('#sizeBtn');
  await page.click('[data-side=left][data-delta="-1"]'); await page.click('[data-side=left][data-delta="-1"]');
  check('a cut through the start takes it off', (await text()).level.w === 3 && (await text()).level.start === null);
  check('with no start, Play and Check are greyed out and the check line says why', await page.locator('#mode').isDisabled() && await page.locator('#checkBtn').isDisabled() && (await page.textContent('#checkText')).includes('place the start'));
  await page.keyboard.press('e');
  check('and E does not start a run', (await text()).mode === 'edit');
  await page.keyboard.press('Escape');
  { const gb = await page.locator('#game').boundingBox(), lw = (await text()).level;
    await pick('look'); await page.mouse.click(gb.x + 1.5 * gb.width / lw.w, gb.y + 0.5 * gb.height / lw.h);
    await page.click('#playHere');
    check('Play from here works with no start, and Edit stays clickable', (await text()).mode === 'play' && !(await page.locator('#mode').isDisabled()));
    await page.click('#mode'); await page.click('#sizeBtn'); }
  for (let i = 0; i < 3; i++) await page.click('[data-side=bottom][data-delta="-1"]', { force: true });
  check('a cut that would leave less than 2 tall is greyed out', (await text()).level.h === 2 && await page.locator('[data-side=bottom][data-delta="-1"]').isDisabled());
  await page.click('#undo');
  await page.keyboard.press('Escape');
  await pick('start'); const g0 = await page.locator('#game').boundingBox(); const lv0 = (await text()).level;
  await page.mouse.click(g0.x + 1.5 * g0.width / lv0.w, g0.y + 1.5 * g0.height / lv0.h);
  check('placing the start again brings Play back', (await text()).level.start && !(await page.locator('#mode').isDisabled()), JSON.stringify((await text()).level) + await page.locator('#mode').isDisabled());
  await pick('look');
  await page.click('#sizeBtn');
  await page.mouse.click(5, 5);
  check('a click elsewhere shuts the size controls', await page.locator('#sizePop').isHidden());
  await page.evaluate(l => window.wee.loadLevel(l), JSON.parse(JSON.stringify(roomBeforePanel)));

  // the Rooms panel: name and save the room, find it in the list, come back to it
  const wallsBefore = (await text()).level.cells.filter(c => c === 'wall').length;
  check('an unnamed room reads as unsaved', (await page.textContent('#roomsBtn')).includes('\u2022'));
  await page.click('#roomsBtn');
  check('the panel says where rooms are kept', (await page.textContent('#roomsWhere')).includes('this browser'));
  check('an empty library hides its filter and explored count', await page.locator('#libTools').isHidden());
  check('the library holds no templates of its own', (await page.locator('#roomsBox #templateList').count()) === 0);
  await page.click('#roomNew');
  check('New room is its own page, with the templates', await page.locator('#newBox').isVisible() && (await page.locator('#templateList li').count()) >= 2);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  check('the header names the room, untitled at first', (await page.textContent('#roomTitle')).startsWith('Untitled'));
  await page.click('#roomTitle');
  check('the room title opens This room', await page.locator('#infoBox').isVisible());
  await page.click('#roomSave');
  check('saving without a name asks for one', (await page.textContent('#infoSay')).includes('name'));
  await page.fill('#roomName', 'Smoke room');
  await page.fill('#roomNote', 'checks the panel');
  await page.click('#roomSave');
  await page.waitForFunction(() => !document.getElementById('roomsBtn').textContent.includes('\u2022'));
  check('and the title follows the name', (await page.textContent('#roomTitle')) === 'Smoke room');
  check('and the button no longer says unsaved', !(await page.textContent('#roomsBtn')).includes('\u2022'));
  check('delete sits apart, in its own danger zone', (await page.locator('#infoBox .danger #roomDelete').count()) === 1);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#roomDownload')]);
  const saved = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  check('Download gives a .wee with its name and note', dl.suggestedFilename() === 'Smoke-room.wee' && saved.name === 'Smoke room' && saved.note === 'checks the panel');
  await page.keyboard.press('Escape');
  await page.click('#roomsBtn');
  await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 1);
  check('a saved room shows in the library, by name', (await page.textContent('#roomList')).includes('Smoke room'));
  check('a library with rooms shows its filter', await page.locator('#libTools').isVisible());
  await page.click('#roomNew');
  page.once('dialog', d => d.accept());
  await page.click('#newBlank');
  page.removeAllListeners('dialog');
  check('Empty room starts an empty one and closes every page', (await text()).level.cells.filter(c => c === 'wall').length !== wallsBefore && !(await page.locator('#newBox').isVisible()) && !(await page.locator('#roomsBox').isVisible()));
  await page.click('#roomsBtn');
  await page.locator('#roomList .roomRow', { hasText: 'Smoke room' }).click();
  check('opening it from the list brings it back', (await text()).level.cells.filter(c => c === 'wall').length === wallsBefore);
  await page.reload();
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  check('a reload starts on the library', await page.locator('#roomsBox').isVisible());
  check('a saved room behind it gets no unsaved tile', await page.locator('#openNow').isHidden());
  await page.click('#roomsBox .roomsHead button');
  check('a reload reopens the room you were on', (await text()).level.cells.filter(c => c === 'wall').length === wallsBefore && (await page.getAttribute('#roomsBtn', 'title')) === 'Smoke room');
  // autosave: an unsaved edit survives a reload, and saving clears the draft
  await page.keyboard.press('Escape').catch(() => {});
  await pick('wall');
  const lvA = (await text()).level; await page.evaluate(() => scrollTo(0, 0)); const bA = await page.locator('#game').boundingBox();
  const ax = lvA.w - 2, ay = lvA.h - 2, apos = { x: bA.x + (ax + 0.5) * bA.width / lvA.w, y: bA.y + (ay + 0.5) * bA.height / lvA.h };
  if (lvA.cells[ay * lvA.w + ax] === 'wall') await page.mouse.click(apos.x, apos.y);
  await page.mouse.click(apos.x, apos.y);
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  check('unsaved work leads the library as its own tile', await page.locator('#openNow').isVisible() && (await page.textContent('#openNow')).includes('Smoke room') && (await page.textContent('#openNow')).includes('Unsaved changes'));
  await page.click('#openNow .roomRow');
  check('and tapping it goes back to that room', !(await page.locator('#roomsBox').isVisible()));
  check('an unsaved edit comes back after a reload', (await text()).level.cells[ay * lvA.w + ax] === 'wall' && (await page.textContent('#roomsBtn')).includes('\u2022') && (await page.textContent('#placeHint')).includes('unsaved changes are back'));
  await page.keyboard.press('Control+s');
  await page.waitForFunction(() => !document.getElementById('roomsBtn').textContent.includes('\u2022'));
  check('saving clears the draft', await page.evaluate(() => localStorage.getItem('wee.draft') === null));
  await page.click('#roomsBtn');
  await page.click('#roomNew');
  await page.locator('#templateList .roomRow', { hasText: 'First room' }).click();
  // A template opens as a new room, untitled; left as it is, it has no unsaved changes to warn about.
  check('a template opens as a new, untitled room with nothing unsaved', (await text()).level.w === FIRST_W && !(await page.textContent('#roomsBtn')).includes('\u2022') && (await page.textContent('#roomTitle')).startsWith('Untitled') && !(await page.locator('#newBox').isVisible()));
  // a share code round-trips: sent from This room, received in the library, and a #room= link opens the room
  await page.click('#roomTitle');
  check('the share box stays hidden until it is needed', await page.locator('#shareOut').isHidden());
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new Error('no')); });
  await page.click('#copyCode');
  await page.waitForFunction(() => /box|copied/.test(document.getElementById('infoSay').textContent));
  const code = await page.inputValue('#shareOut');
  check('without the clipboard, Copy code leaves the code in the share box', code.startsWith('w1') && (await page.textContent('#infoSay')).includes('box') && await page.locator('#shareOut').isVisible());
  await page.keyboard.press('Escape');
  await page.click('#roomsBtn');
  check('the code field waits behind Open a code', await page.locator('#codeRow').isHidden());
  await page.click('#codeBtn');
  await page.fill('#codeIn', 'nonsense');
  await page.click('#openCode');
  check('a bad code says so', (await page.textContent('#roomsSay')).includes('Not a wee room code'));
  const linkPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await linkPage.goto(`http://localhost:${PORT}/#room=${code}`);
  await linkPage.waitForFunction(() => window.wee && window.wee.roomsReady);
  await linkPage.evaluate(() => window.wee.roomsReady);
  check('a #room= link skips the library', !(await linkPage.locator('#roomsBox').isVisible()));
  check('a #room= link opens that room, unsaved', (await linkPage.evaluate(() => window.wee.getLevel().w)) === FIRST_W && (await linkPage.textContent('#roomsBtn')).includes('\u2022') && !(await linkPage.evaluate(() => location.hash)));
  await linkPage.close();
  await page.locator('#importFile').setInputFiles({ name: 'two.weepack', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'wee-pack', version: 1, rooms: [{ ...room(['#####', '#P..#', '#####']), id: 'ra', name: 'A' }, { ...room(['#####', '#P..#', '#####']), id: 'rb', name: 'B' }] })) });
  await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 3);
  check('Import adds every room in a pack', (await page.textContent('#roomsSay')).includes('Imported 2 rooms'));
  // A saved room's own menu: right-click a tile, act on it without opening it.
  const tiles = () => page.$$eval('#roomList .roomRow b', bs => bs.map(b => b.textContent));
  await page.locator('#roomList .roomRow', { hasText: /^A/ }).first().click({ button: 'right' });
  check('right-clicking a room opens its menu, and the room stays shut', await page.locator('#tileMenu').isVisible() && await page.locator('#roomsBox').isVisible() && (await page.$$eval('#tileMenu [data-act]', bs => bs.map(b => b.textContent).join())) === 'Rename,Duplicate,Copy code,Delete');
  await page.click('#tileMenu [data-act=rename]');
  await page.fill('#tileName', 'Arch');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('#roomList .roomRow b')].some(b => b.textContent === 'Arch'));
  check('Rename renames it in place', (await tiles()).includes('Arch') && !(await tiles()).includes('A') && await page.locator('#tileMenu').isHidden(), (await tiles()).join());
  await page.locator('#roomList .roomRow', { hasText: 'Arch' }).click({ button: 'right' });
  await page.click('#tileMenu [data-act=duplicate]');
  await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 4);
  check('Duplicate adds a copy beside it', (await tiles()).includes('Arch copy'), (await tiles()).join());
  await page.locator('#roomList .roomRow', { hasText: 'Arch copy' }).click({ button: 'right' });
  await page.click('#tileMenu [data-act=code]');
  await page.waitForFunction(() => !document.getElementById('tileCode').hidden);
  check('Copy code without the clipboard leaves the code in the menu', (await page.inputValue('#tileCode')).startsWith('w1'));
  await page.mouse.click(5, 5);
  check('a click elsewhere closes the menu', await page.locator('#tileMenu').isHidden());
  if (!(await page.locator('#roomsBox').isVisible())) await page.click('#roomsBtn');
  await page.setViewportSize({ width: 1280, height: 380 });
  await page.locator('#roomList .roomRow').last().scrollIntoViewIfNeeded();
  await page.locator('#roomList .roomRow').last().click({ button: 'right' });
  const mb = await page.locator('#tileMenu').boundingBox();
  check('a menu opened low on a short window stays on screen', mb.y + mb.height <= 380, JSON.stringify(mb));
  await page.mouse.click(5, 5);
  await page.setViewportSize({ width: 1280, height: 800 });
  if (!(await page.locator('#roomsBox').isVisible())) await page.click('#roomsBtn');
  await page.locator('#roomList .roomRow', { hasText: 'Arch copy' }).click({ button: 'right' });
  page.once('dialog', d => d.accept());
  await page.click('#tileMenu [data-act=delete]');
  await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 3);
  check('Delete asks, then removes it', !(await tiles()).includes('Arch copy'), (await tiles()).join());
  await page.keyboard.press('Escape');

  // a boomerang kicks up a cloud where you turned, blown the way you were going
  await page.evaluate(l => window.wee.loadLevel(l), room(['############', '#P.........#', '############']));
  await page.keyboard.press('e');
  await page.evaluate(() => { window.__manualClock = true; window.advanceTime(60); });
  await page.keyboard.press('ArrowRight'); await page.evaluate(() => window.advanceTime(250));
  await page.keyboard.press('ArrowLeft'); await page.evaluate(() => window.advanceTime(110));
  // the brightest grey along the corridor, away from the player, is the cloud
  const puff = await page.evaluate(() => {
    const c = document.getElementById('game'), tile = c.width / window.wee.getLevel().w, px = JSON.parse(window.renderGameToText()).player.x;
    const row = c.getContext('2d').getImageData(0, Math.round(1.5 * tile), c.width, 1).data;
    let best = 0;
    for (let x = Math.ceil(tile); x < c.width - tile; x++) {
      if (Math.abs(x / tile - (px + 0.5)) < 1.2) continue;
      const i = x * 4, r = row[i], g = row[i + 1], b = row[i + 2];
      best = Math.max(best, b - r);
    }
    return best;
  });
  check('a boomerang leaves a cloud ahead of where you turned', puff > 30, String(puff)); // a blue cloud on the gray floor (b - r = 8)
  // a side key pressed right after a tick is aimed from the tile you were drawn on
  await page.keyboard.press('ArrowRight'); await page.evaluate(() => window.advanceTime(60));
  await page.keyboard.press('ArrowUp'); await page.evaluate(() => window.advanceTime(60));
  check('an early side key goes in as an aimed-back shot', JSON.parse(await page.evaluate(() => window.wee.report())).keys.some(k => k.k === 'back:up'));
  // a report replays to exactly the state the run ended in, including a power turned off mid-run
  await page.locator('[data-power=boomerang]').setChecked(false);
  await page.keyboard.press('ArrowDown'); await page.evaluate(() => window.advanceTime(1500));
  const same = await page.evaluate(() => {
    const r = JSON.parse(window.wee.report());
    const again = JSON.parse(window.wee.gameText(window.wee.replay(r.level, r.keys, r.ticks)));
    return JSON.stringify(again) === JSON.stringify(r.end) && r.level.powers.boomerang === true && r.keys.some(k => k.k === 'power:boomerang:0');
  });
  check('a copied report replays to the same end, with a power turned off mid-run', same);
  await page.locator('[data-power=boomerang]').setChecked(true);
  await page.keyboard.press('e');

  // undo takes back a whole drag in one step, redo puts it back, and both keys work
  await page.evaluate(() => window.wee.loadLevel(window.wee.blank(20, 12)));
  check('a loaded room starts with nothing to undo', await page.locator('#undo').isDisabled());
  await pick('wall');
  const row = y => [3, 4, 5].map(x => at(x, y));
  const [a1, , a3] = row(3);
  await page.mouse.move(a1.x, a1.y); await page.mouse.down(); await page.mouse.move(a3.x, a3.y, { steps: 6 }); await page.mouse.up();
  const painted = (await text()).level.cells.slice(3 * 20 + 3, 3 * 20 + 6);
  check('the drag painted three blocks', painted.every(c => c === 'wall'), painted.join());
  await page.click('#undo');
  check('one undo takes back the whole drag', (await text()).level.cells.slice(3 * 20 + 3, 3 * 20 + 6).every(c => c === ''));
  await page.click('#redo');
  check('redo puts it back', (await text()).level.cells.slice(3 * 20 + 3, 3 * 20 + 6).every(c => c === 'wall'));
  await page.keyboard.press('Control+z');
  check('Ctrl+Z undoes', (await text()).level.cells[3 * 20 + 3] === '');
  await page.keyboard.press('Control+Shift+Z');
  check('Ctrl+Shift+Z redoes', (await text()).level.cells[3 * 20 + 3] === 'wall');
  await page.keyboard.press('e');
  check('undo is off while playing', await page.locator('#undo').isDisabled());
  await page.keyboard.press('e');

  // stopping on the goal shows the win, with the move count; Play again starts over
  const goalRoom = room(['#######', '#P..#.#', '#######']); goalRoom.cells[10] = 'goal';
  await page.evaluate(l => window.wee.loadLevel(l), goalRoom);
  await page.click('#checkBtn');
  await page.waitForFunction(() => (e => !e.classList.contains('stale') && e.textContent.startsWith('Solvable'))(document.getElementById('checkText')));
  check('Check finds the solution and its length', (await page.textContent('#checkText')) === 'Solvable in 1 move.' && await page.locator('#showSolution').isVisible());
  await pick('enemy');
  check('picking a tool keeps the check', (await page.textContent('#checkText')) === 'Solvable in 1 move.');
  await pick('wall'); const g1 = at(5, 5); await page.mouse.click(g1.x, g1.y);
  check('editing the room dims the stale check instead of blanking it, and Show solution greys out', (await page.textContent('#checkText')) === 'Solvable in 1 move.' && await page.$eval('#checkText', e => e.classList.contains('stale')) && await page.locator('#showSolution').isDisabled());
  await page.keyboard.press('Control+z');
  await page.click('#checkBtn');
  await page.waitForFunction(() => (e => !e.classList.contains('stale') && e.textContent.startsWith('Solvable'))(document.getElementById('checkText')));
  await page.click('#showSolution');
  await page.evaluate(() => window.advanceTime(1200));
  check('Show solution plays it to the win', await page.locator('#win').isVisible());
  await page.click('#winEdit');
  // a two-move solution waits for the first slide to end before the second
  const turnRoom = room(['#####', '#P..#', '###.#', '###.#', '#####']); turnRoom.cells[3 * 5 + 3] = 'goal';
  await page.evaluate(l => window.wee.loadLevel(l), turnRoom);
  await page.click('#checkBtn');
  await page.waitForFunction(() => (e => !e.classList.contains('stale') && e.textContent.startsWith('Solvable'))(document.getElementById('checkText')));
  await page.click('#showSolution');
  await page.evaluate(() => window.advanceTime(3000));
  check('a two-move solution plays to the win', await page.locator('#win').isVisible() && (await page.textContent('#winText')) === 'Solved in 2 moves.', await page.textContent('#winText'));
  await page.click('#winEdit');
  // a solution with a dive plays its mid-slide key on the right tick
  const diveRoom = room(['#######', '#P.H..#', '#######']); diveRoom.cells[11] = 'goal';
  await page.evaluate(l => window.wee.loadLevel(l), diveRoom);
  await page.click('#checkBtn');
  await page.waitForFunction(() => (e => !e.classList.contains('stale') && e.textContent.startsWith('Solvable'))(document.getElementById('checkText')));
  await page.click('#showSolution');
  await page.evaluate(() => window.advanceTime(3000));
  check('Show solution plays a dive to the win', await page.locator('#win').isVisible(), await page.textContent('#checkText'));
  await page.click('#winEdit');
  await page.evaluate(l => window.wee.loadLevel(l), turnRoom);
  await page.click('#checkBtn');
  await page.waitForFunction(() => (e => !e.classList.contains('stale') && e.textContent.startsWith('Solvable'))(document.getElementById('checkText')));
  // a checked room saves its par, and the mechanism filter and tally read the saved rooms
  check('a room whose full check is done greys out Check: a second press would redo it', await page.locator('#checkBtn').isDisabled());
  await page.click('#roomTitle');
  await page.fill('#roomName', 'Par room');
  await page.click('#roomSaveAs');
  await page.waitForFunction(() => document.getElementById('roomTitle').textContent === 'Par room');
  await page.keyboard.press('Escape');
  await page.click('#roomsBtn');
  await page.waitForFunction(() => document.getElementById('roomList').textContent.includes('Par room'));
  check('a checked room is listed with its par', (await page.locator('#roomList .roomRow', { hasText: 'Par room' }).textContent()).includes('par 2'));
  check('an unchecked one says so', (await page.locator('#roomList .roomRow', { hasText: 'Smoke room' }).textContent()).includes('not checked'));
  check('the tally counts explored mechanisms', /^Explored \d+ of \d+ mechanisms$/.test(await page.textContent('#exploredSum')));
  await page.selectOption('#tagFilter', 'tile:goal');
  check('filtering by Goal shows only rooms with one', (await page.locator('#roomList .roomRow').count()) >= 1 && !(await page.textContent('#roomList')).includes('Smoke room'));
  await page.selectOption('#tagFilter', 'use:spring');
  check('a mechanism no room has says so', (await page.textContent('#roomList')).includes('No room has this yet.'));
  check('and is listed as not explored', (await page.textContent('#unexplored')).includes('A spring launches'));
  await page.selectOption('#tagFilter', '');
  await page.keyboard.press('Escape');
  check('a room with nothing wrong shows no warnings', !(await page.locator('#lintBox').isVisible()));
  await page.click('#roomsBtn');
  await page.locator('#roomList .roomRow', { hasText: 'Par room' }).click();
  const blocked = JSON.parse(JSON.stringify(turnRoom)); blocked.cells[2 * 5 + 3] = 'wall';
  await page.evaluate(l => window.wee.loadLevel(l), blocked);
  check('editing the room so its saved solution fails says so', (await page.textContent('#lintList')).includes('saved solution no longer wins'), await page.textContent('#lintList'));
  const detour = room(['#####', '#P..#', '#.###', '#...#', '#####']); detour.cells[3 * 5 + 3] = 'goal';
  await page.evaluate(l => window.wee.loadLevel(l), detour);
  check('a room with another way still warns before it is checked', (await page.textContent('#lintList')).includes('saved solution no longer wins'));
  await page.click('#checkBtn');
  await page.waitForFunction(() => (e => !e.classList.contains('stale') && e.textContent.startsWith('Solvable'))(document.getElementById('checkText')));
  check('and once Check finds the new way, the warning goes', !(await page.textContent('#lintList')).includes('saved solution no longer wins'), await page.textContent('#lintList'));
  const lone = room(['#####', '#P.D#', '#####']);
  await page.evaluate(l => window.wee.loadLevel(l), lone);
  check('a door with no switch is a warning', (await page.textContent('#lintSum')) === '2 warnings' && (await page.textContent('#lintList')).includes('red door with no red switch'), await page.textContent('#lintList'));
  // Warnings live in the well: the status bar's Findings button counts them and opens it.
  // The label follows on the next frame, so wait for it rather than race it.
  await page.waitForFunction(() => document.getElementById('wellBtn').textContent === 'Findings 2', null, { timeout: 3000 }).catch(() => {});
  check('the status bar counts the warnings', (await page.textContent('#wellBtn')) === 'Findings 2', await page.textContent('#wellBtn'));
  if (await page.locator('#well').isHidden()) await page.click('#wellBtn');
  await page.click('[data-well=lenses]');
  await page.click('#wellBtn');
  check('the Findings button opens the well on its findings, from any tab', await page.locator('#lintList').isVisible());
  await page.click('#wellBtn');
  check('and pressed again, shuts it', await page.locator('#well').isHidden());
  await page.click('#wellBtn');
  await page.locator('#lintList button').last().click();
  await page.waitForTimeout(60);
  const gold = await page.evaluate(() => {
    const c = document.getElementById('game'), tile = c.width / window.wee.getLevel().w;
    const d = c.getContext('2d').getImageData(Math.round(3 * tile + tile * 0.065), Math.round(1.5 * tile), 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  check('tapping a warning flashes its tile', gold[0] > 180 && gold[1] > 130 && gold[2] < 140, gold.join());
  await page.evaluate(l => window.wee.loadLevel(l), goalRoom);
  await page.keyboard.press('e');
  check('a run starts at Moves 0', (await page.textContent('#moves')) === 'Moves 0');
  await page.keyboard.press('ArrowRight'); await page.evaluate(() => window.advanceTime(600));
  check('stopping on the goal shows the win', await page.locator('#win').isVisible() && (await page.textContent('#winText')) === 'Solved in 1 move.', await page.textContent('#winText'));
  check('the counter counts the slide', (await page.textContent('#moves')) === 'Moves 1');
  // Drift: the slide gusts the snow its way and leaves a fading ghost behind.
  check('a slide to the right gusts the snow to the right', (await page.evaluate(() => window.wee.wind())).x > 0.3, JSON.stringify(await page.evaluate(() => window.wee.wind())));
  check('and leaves a ghost on the tile it left', (await page.evaluate(() => window.wee.fxTypes())).includes('ghost'));
  await page.click('#again');
  check('Play again starts the room over', !(await page.locator('#win').isVisible()) && (await text()).player.x === 1);
  await page.keyboard.press('e');

  // Manga: "on" is an accent ring inside a sticker shadow, and no control draws a border.
  const onLook = await page.$eval('[data-tool].on', b => { const c = getComputedStyle(b); return { shadow: c.boxShadow, border: c.borderTopWidth, accent: c.color }; });
  check('a picked tool wears the accent inset ring and no border', onLook.shadow.includes('inset') && onLook.shadow.includes(onLook.accent + ' 0px 0px 0px 2px inset') && onLook.accent === 'rgb(123, 108, 255)' && onLook.border === '0px', JSON.stringify(onLook));
  // a disabled power reads as disabled and cannot be ticked
  const hook = page.locator('[data-power=light]');
  check('a power that cannot act yet is disabled', await hook.isDisabled());
  // served with a rooms directory, the page saves to the server instead of the browser
  const roomsDir = mkdtempSync(join(tmpdir(), 'wee-rooms-'));
  const withApi = await serve(PORT + 1, { rooms: roomsDir });
  // Keys: a letter picks a tool, but not while typing; Tab hides both side columns; ? lists every key.
  await page.evaluate(() => { window.wee.setMode('edit'); document.activeElement.blur(); });
  await page.keyboard.press('t');
  const toolOn = () => page.$eval('[data-tool].on', b => b.dataset.tool);
  check('a tool letter picks its tool', await toolOn() === 'turret', await toolOn());
  await page.click('#roomTitle');
  await page.fill('#roomName', '');
  await page.locator('#roomName').pressSequentially('bet');
  check('typing in a field picks no tool and does not play', await toolOn() === 'turret' && (await text()).mode === 'edit');
  await page.keyboard.press('Escape');
  await page.evaluate(() => document.activeElement.blur());
  const shown = () => page.evaluate(() => getComputedStyle(document.getElementById('tools')).visibility === 'visible' && getComputedStyle(document.getElementById('powers')).visibility === 'visible');
  await page.keyboard.press('Tab');
  check('Tab hides both side columns', !(await shown()));
  await page.keyboard.press('Tab');
  check('and Tab again brings them back', await shown());
  await page.focus('#mode');
  await page.keyboard.press('Tab');
  check('with a button focused, Tab moves focus and leaves the columns', await shown() && await page.evaluate(() => document.activeElement.id !== 'mode'));
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('?');
  const listed = await page.evaluate(() => { const list = document.getElementById('keysList').textContent; return [...document.querySelectorAll('[data-tool] kbd')].every(k => list.includes(k.textContent)) && document.querySelectorAll('[data-tool] kbd').length >= 10; });
  check('? opens a list holding every tool key', await page.locator('#keysBox').isVisible() && listed);
  await page.keyboard.press('Escape');
  const sp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  sp.on('pageerror', e => errors.push(e.message));
  await sp.goto(`http://localhost:${PORT + 1}/?sandbox`);
  await sp.waitForFunction(() => window.wee && window.wee.roomsReady);
  await sp.evaluate(() => window.wee.roomsReady);
  await sp.evaluate(() => document.getElementById('roomsBox').close());
  await sp.click('#roomsBtn');
  check('served with a rooms directory, rooms are kept on the server', (await sp.textContent('#roomsWhere')).includes('server'));
  await sp.keyboard.press('Escape');
  await sp.click('#roomTitle');
  await sp.fill('#roomName', 'On the server');
  await sp.click('#roomSave');
  await sp.waitForFunction(() => document.getElementById('roomTitle').textContent === 'On the server');
  check('a saved room lands in the directory as a file', readdirSync(roomsDir).some(f => f.endsWith('.wee')));
  await sp.close(); withApi.close();

  // Joined-up tiles: two walls side by side have no seam; a lone wall has round corners.
  await page.evaluate(l => window.wee.loadLevel(l), room(['.......', '.##....', '.....#.', '...gg..', '.......']));
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const red = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return c.getContext('2d').getImageData(Math.round(x * t), Math.round(y * t), 1, 1).data[0]; }, [x, y]);
  const [seam, corner, face] = [await red(2, 1.6), await red(5.03, 2.03), await red(5.5, 2.6)];
  check('walls side by side are one mass, a lone wall rounds its corners', seam < 210 && face < 210 && corner > face + 30, JSON.stringify({ seam, corner, face }));
  const grav = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round((3 + 15 / 32) * t), Math.round((3 + 12 / 32) * t), 1, 1).data]; });
  check('gravel is drawn in its sand colour', Math.abs(grav[0] - 220) < 12 && Math.abs(grav[1] - 184) < 12 && Math.abs(grav[2] - 143) < 12, JSON.stringify(grav));

  // A breakable block wears dark cracks; broken by a dive, it is floor for the rest of the run.
  const kr = room(['#######', '#P.k..#', '#######']); kr.powers.dive = true;
  await page.evaluate(l => window.wee.loadLevel(l), kr);
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const crackInk = await red(3 + 13 / 32, 1 + 19 / 32), crackFace = await red(3 + 26 / 32, 1 + 16 / 32);
  check('a breakable block wears dark cracks on the wall face', crackInk < 120 && crackFace > 150 && crackFace < 200, JSON.stringify({ crackInk, crackFace }));
  await page.evaluate(() => { window.__manualClock = true; });
  await page.keyboard.press('e');
  await page.evaluate(() => { window.wee.press('right'); window.advanceTime(60); window.wee.press('right'); window.advanceTime(1500); });
  // The break's burst runs on the real clock: let it finish, then draw once more.
  await page.waitForTimeout(400); await page.evaluate(() => window.advanceTime(60));
  const broke = JSON.parse(await page.evaluate(() => window.renderGameToText()));
  const gone = await red(3 + 6 / 32, 1 + 26 / 32);
  check('a dive breaks it, and it is drawn as floor', broke.broken?.[0]?.join() === '3,1' && broke.player.x === 5 && gone > 215, JSON.stringify({ broken: broke.broken, x: broke.player.x, gone }));
  await page.keyboard.press('e');

  // A bomb's fuse is its timer: a push lights it and its spark burns down one length per move.
  await page.evaluate(l => window.wee.loadLevel(l), room(['#######', '#.....#', '#PO...#', '#######']));
  const rgb = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round(x * t), Math.round(y * t), 1, 1).data].slice(0, 3); }, [x, y]);
  const orange = ([r, g, b]) => r > 220 && g > 110 && g < 200 && b < 120;
  await page.keyboard.press('e');
  await page.evaluate(() => { window.wee.press('right'); window.advanceTime(1500); });
  const sparkFull = await rgb(5 + 26 / 32, 2 + 3 / 32);
  await page.evaluate(() => { window.wee.press('up'); window.advanceTime(1500); });
  const sparkHalf = await rgb(5 + 21 / 32, 2 + 2 / 32), burnt = await rgb(5 + 26 / 32, 2 + 3 / 32);
  check('a lit fuse sparks at its end, and burns one length shorter each move', orange(sparkFull) && orange(sparkHalf) && !orange(burnt), JSON.stringify({ sparkFull, sparkHalf, burnt }));
  await page.evaluate(() => { window.wee.press('left'); window.advanceTime(60); });
  await page.evaluate(() => window.advanceTime(1500));
  const after = JSON.parse(await page.evaluate(() => window.renderGameToText()));
  check('it goes off at the end of the second move after the push, with a blast', !after.pieces.some(p => p.kind === 'bomb') && (await page.evaluate(() => window.wee.fxTypes())).includes('blast'), JSON.stringify(after.pieces));
  await page.keyboard.press('e');
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  check('the smoke ran to the end', false, err.message);
} finally {
  await browser.close();
  server.close();
}
done();
