// Drives the real page: edit by clicking, play by keys, save and open a file,
// and checks painted pixels where the text state says the player is.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from '../tools/serve.mjs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('browser');
const PORT = 5199;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
mkdirSync('shots', { recursive: true });

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.wee);
  const text = async () => JSON.parse(await page.evaluate(() => window.renderGameToText()));
  // A tool sits in one tab of the palette: open its tab, then pick it.
  const pick = async t => { const tab = page.locator(`[data-group=${await page.getAttribute(`[data-tool=${t}]`, 'data-in')}]`); if (await tab.isVisible()) await tab.click(); await page.click(`[data-tool=${t}]`); };
  const box = await page.locator('#game').boundingBox();
  const at = (x, y) => ({ x: box.x + (x + 0.5) * box.width / 20, y: box.y + (y + 0.5) * box.height / 12 });

  // on a wide screen every tool shows at once, in sections, with no tabs
  const wide = await page.evaluate(() => ({ tabs: !!document.getElementById('groups').offsetParent, hidden: [...document.querySelectorAll('[data-tool]')].filter(b => !b.offsetParent).length, heads: [...document.querySelectorAll('.ghead')].filter(h => h.offsetParent).length }));
  check('on desktop the tools are sections, all visible, no tabs', !wide.tabs && wide.hidden === 0 && wide.heads === 4, JSON.stringify(wide));
  // nothing in a panel is cut by its panel: every control sits inside its box
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
  check('enemy options show', await page.locator('[data-axis=h]').isVisible());
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
  await page.click('[data-aim=left]');
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
  check('a follower has no patrol axis to pick', !(await page.locator('[data-axis=h]').isVisible()));
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
  check('enemy options hide for a block', !(await page.locator('[data-axis=h]').isVisible()));
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
  check('the player is painted on its tile', px[1] > 180 && px[2] > 180 && px[0] < 140, px.join(','));
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

  // the Rooms panel: name and save the room, find it in the list, come back to it
  const wallsBefore = (await text()).level.cells.filter(c => c === 'wall').length;
  check('an unnamed room reads as unsaved', (await page.textContent('#roomsBtn')).includes('\u2022'));
  await page.click('#roomsBtn');
  check('the panel says where rooms are kept', (await page.textContent('#roomsWhere')).includes('this browser'));
  check('the templates are listed', (await page.locator('#templateList li').count()) >= 2);
  await page.click('#roomSave');
  check('saving without a name asks for one', (await page.textContent('#roomsSay')).includes('name'));
  await page.fill('#roomName', 'Smoke room');
  await page.fill('#roomNote', 'checks the panel');
  await page.click('#roomSave');
  await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 1);
  check('a saved room shows in the list, by name', (await page.textContent('#roomList')).includes('Smoke room'));
  check('and the button no longer says unsaved', !(await page.textContent('#roomsBtn')).includes('\u2022'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#roomDownload')]);
  const saved = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  check('Download gives a .wee with its name and note', dl.suggestedFilename() === 'Smoke-room.wee' && saved.name === 'Smoke room' && saved.note === 'checks the panel');
  page.once('dialog', d => d.accept());
  await page.click('#roomNew');
  check('New room starts an empty one', (await text()).level.cells.filter(c => c === 'wall').length !== wallsBefore || (await page.inputValue('#roomName')) === '');
  await page.click('#roomsBtn').catch(() => {});
  if (!(await page.locator('#roomsBox').isVisible())) await page.click('#roomsBtn');
  await page.locator('#roomList .roomRow', { hasText: 'Smoke room' }).click();
  check('opening it from the list brings it back', (await text()).level.cells.filter(c => c === 'wall').length === wallsBefore);
  await page.reload();
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  check('a reload reopens the room you were on', (await text()).level.cells.filter(c => c === 'wall').length === wallsBefore && (await page.getAttribute('#roomsBtn', 'title')) === 'Smoke room');
  await page.click('#roomsBtn');
  await page.locator('#templateList .roomRow', { hasText: 'First room' }).click();
  check('a template opens as a new, unsaved room', (await text()).level.w === 7 && (await page.textContent('#roomsBtn')).includes('\u2022'));
  await page.click('#roomsBtn');
  await page.locator('#importFile').setInputFiles({ name: 'two.weepack', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'wee-pack', version: 1, rooms: [{ ...room(['#####', '#P..#', '#####']), id: 'ra', name: 'A' }, { ...room(['#####', '#P..#', '#####']), id: 'rb', name: 'B' }] })) });
  await page.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 3);
  check('Import adds every room in a pack', (await page.textContent('#roomsSay')).includes('Imported 2 rooms'));
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
      if (Math.abs(r - b) < 40) best = Math.max(best, r + g + b);
    }
    return best;
  });
  check('a boomerang leaves a cloud ahead of where you turned', puff > 200, String(puff));
  // a side key pressed right after a tick is aimed from the tile you were drawn on
  await page.keyboard.press('ArrowRight'); await page.evaluate(() => window.advanceTime(60));
  await page.keyboard.press('ArrowUp'); await page.evaluate(() => window.advanceTime(60));
  check('an early side key goes in as an aimed-back shot', JSON.parse(await page.evaluate(() => window.wee.report())).keys.some(k => k.k === 'back:up'));
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
  await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable'));
  check('Check finds the solution and its length', (await page.textContent('#checkText')) === 'Solvable in 1 move.' && await page.locator('#showSolution').isVisible());
  await pick('enemy');
  check('picking a tool keeps the check', (await page.textContent('#checkText')) === 'Solvable in 1 move.');
  await pick('wall'); const g1 = at(5, 5); await page.mouse.click(g1.x, g1.y);
  check('editing the room clears a stale check', (await page.textContent('#checkText')) === '' && !(await page.locator('#showSolution').isVisible()));
  await page.keyboard.press('Control+z');
  await page.click('#checkBtn');
  await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable'));
  await page.click('#showSolution');
  await page.evaluate(() => window.advanceTime(1200));
  check('Show solution plays it to the win', await page.locator('#win').isVisible());
  await page.click('#winEdit');
  // a two-move solution waits for the first slide to end before the second
  const turnRoom = room(['#####', '#P..#', '###.#', '###.#', '#####']); turnRoom.cells[3 * 5 + 3] = 'goal';
  await page.evaluate(l => window.wee.loadLevel(l), turnRoom);
  await page.click('#checkBtn');
  await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable'));
  await page.click('#showSolution');
  await page.evaluate(() => window.advanceTime(3000));
  check('a two-move solution plays to the win', await page.locator('#win').isVisible() && (await page.textContent('#winText')) === 'Solved in 2 moves.', await page.textContent('#winText'));
  await page.click('#winEdit');
  // a solution with a dive plays its mid-slide key on the right tick
  const diveRoom = room(['#######', '#P.H..#', '#######']); diveRoom.cells[11] = 'goal';
  await page.evaluate(l => window.wee.loadLevel(l), diveRoom);
  await page.click('#checkBtn');
  await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable'));
  await page.click('#showSolution');
  await page.evaluate(() => window.advanceTime(3000));
  check('Show solution plays a dive to the win', await page.locator('#win').isVisible(), await page.textContent('#checkText'));
  await page.click('#winEdit');
  await page.evaluate(l => window.wee.loadLevel(l), turnRoom);
  await page.click('#checkBtn');
  await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable'));
  // a checked room saves its par, and the mechanism filter and tally read the saved rooms
  await page.click('#checkBtn');
  await page.waitForFunction(() => document.getElementById('checkText').textContent.startsWith('Solvable'));
  await page.click('#roomsBtn');
  await page.fill('#roomName', 'Par room');
  await page.click('#roomSaveAs');
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
  const lone = room(['#####', '#P.D#', '#####']);
  await page.evaluate(l => window.wee.loadLevel(l), lone);
  check('a door with no switch is a warning', (await page.textContent('#lintSum')) === '2 warnings' && (await page.textContent('#lintList')).includes('red door with no red switch'), await page.textContent('#lintList'));
  await page.click('#lintBox summary');
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
  await page.click('#again');
  check('Play again starts the room over', !(await page.locator('#win').isVisible()) && (await text()).player.x === 1);
  await page.keyboard.press('e');

  // a disabled power reads as disabled and cannot be ticked
  const hook = page.locator('[data-power=hook]');
  check('a power that cannot act yet is disabled', await hook.isDisabled());
  // served with a rooms directory, the page saves to the server instead of the browser
  const roomsDir = mkdtempSync(join(tmpdir(), 'wee-rooms-'));
  const withApi = await serve(PORT + 1, { rooms: roomsDir });
  const sp = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  sp.on('pageerror', e => errors.push(e.message));
  await sp.goto(`http://localhost:${PORT + 1}/`);
  await sp.waitForFunction(() => window.wee && window.wee.roomsReady);
  await sp.evaluate(() => window.wee.roomsReady);
  await sp.click('#roomsBtn');
  check('served with a rooms directory, rooms are kept on the server', (await sp.textContent('#roomsWhere')).includes('server'));
  await sp.fill('#roomName', 'On the server');
  await sp.click('#roomSave');
  await sp.waitForFunction(() => document.querySelectorAll('#roomList .roomRow').length === 1);
  check('a saved room lands in the directory as a file', readdirSync(roomsDir).some(f => f.endsWith('.wee')));
  await sp.close(); withApi.close();

  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  check('the smoke ran to the end', false, err.message);
} finally {
  await browser.close();
  server.close();
}
done();
