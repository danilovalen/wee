// The Shape helpers (registers 693, 694, 698, 700): after Check the design notes offer Trim and Remove one,
// each with Apply; Best spot sits with the tool's options. Nothing changes until Apply, and the size in the
// status bar is a plain readout (704, 707).
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite, pickTool } from './lib.mjs';

const { check, done } = suite('shapeui');
const server = await serve(5281);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
const level = () => page.evaluate(() => window.wee.getLevel());
const notes = () => page.waitForFunction(() => !!document.getElementById('designBox').dataset.done && !document.getElementById('designBox').classList.contains('stale'), null, { timeout: 60000 }).then(() => page.textContent('#designList'));
const hint = () => page.waitForFunction(() => { const t = document.getElementById('placeSay').textContent; return t && !t.endsWith('...'); }, null, { timeout: 60000 }).then(() => page.textContent('#placeSay'));
try {
  await page.goto('http://localhost:5281/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  // Trim: the bottom row is never used, so the notes offer to cut it; Apply does, and Undo puts it back.
  const spare = room(['#####', '#P.G#', '#...#', '#####'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), spare);
  await page.click('#checkBtn');
  const n = await notes();
  check('after Check the notes offer a trim, said plainly (registers 698, 700)', /Trim to \d+x\d+: the room plays the same\./.test(n) && (await level()).h === 4, n);
  // Registers 745, 746: a line is chosen to preview it, and only the chosen line carries Apply.
  const trimLi = '#designList li:has-text("Trim to")';
  check('before a line is chosen, no Apply shows', await page.locator(`${trimLi} .apply`).isHidden());
  const picture = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(document.getElementById('game').toDataURL())))));
  const before = await picture();
  await page.click(trimLi);
  const pv = await page.evaluate(async () => { const { previewLevel } = await import('/src/app/offers.js'); const l = previewLevel(); return l && l.h; });
  check('choosing a line previews its change on the room, and shows its Apply', pv !== null && pv < 4 && await picture() !== before && await page.locator(`${trimLi} .apply`).isVisible() && (await level()).h === 4, String(pv));
  await page.click(trimLi);
  check('a tap on the chosen line lets it go', await page.locator(`${trimLi} .apply`).isHidden() && await page.evaluate(async () => (await import('/src/app/offers.js')).previewLevel()) === null);
  await page.click(trimLi);
  await page.click(`${trimLi} .apply`);
  check('Apply trims the room', (await level()).h < 4, JSON.stringify([(await level()).w, (await level()).h]));
  await page.click('#undo');
  check('and Undo puts it back', (await level()).h === 4);
  // Register 719: an offer is one line, the sentence beside a small Apply, and nothing scrolls sideways.
  await page.click('#checkBtn'); await notes();
  await page.click('#designList li:has(> .apply)');
  const line = await page.$eval('#designList li:has(> .apply)', li => { const [say, ap] = li.children, lh = parseFloat(getComputedStyle(say).lineHeight) || 16, body = li.closest('.wellBody') || li.parentElement;
    return { oneLine: say.getBoundingClientRect().height < 2 * lh + 12, small: ap.getBoundingClientRect().width < 120, flat: body.scrollWidth <= body.clientWidth + 1 }; });
  check('an offer reads on one line beside a small Apply, and nothing scrolls sideways (register 719)', line.oneLine && line.small && line.flat, JSON.stringify(line));
  // Register 726: an edit makes the notes stale, and a stale note offers no Apply.
  await page.evaluate(() => window.wee.loadLevel({ ...window.wee.getLevel(), cells: window.wee.getLevel().cells.map((c, i) => i === 7 ? 'wall' : c) }));
  await page.waitForTimeout(100);
  check('a note gone stale offers no Apply (register 726)', await page.$$eval('#designList .apply', bs => bs.every(b => !b.offsetParent)));
  // Best spot: a block in the lane makes the way round longer; it is the longest any tile gives.
  const lane = room(['#######', '#.....#', '#P...G#', '#######'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), lane);
  await pickTool(page, 'wall');
  check('Best spot sits with the tool\'s options', await page.locator('#placeBtn').waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false));
  await page.click('#placeBtn');
  const p = await hint();
  const m = p.match(/^Place a block at (\d+), (\d+) and the answer takes (\d+) moves instead of 1\.$/);
  const longest = await page.evaluate(async l => {
    const { search } = await import('/src/solve/solve.js'), { place } = await import('/src/editor/edit.js');
    let best = 0;
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const c = JSON.parse(JSON.stringify(l));
      if (c.cells[y * l.w + x] || (c.start.x === x && c.start.y === y) || !place(c, { tool: 'wall' }, x, y, 'place').length) continue;
      const it = search(c, 5000); let r; while (!(r = it.next()).done); if (r.value.status === 'solved') best = Math.max(best, r.value.moves.length);
    }
    return best;
  }, lane);
  check('Most moves names the tile and the longer count, the longest any tile gives, under its own button (registers 694, 723, 724)', !!m && +m[3] > 1 && +m[3] === longest && await page.locator('#placeSay').isVisible() && (await page.textContent('#placeBtn')) === 'Most moves', p + ' / ' + longest);
  // Register 726: the offer goes when the room changes, and Apply never brings back the room it came from.
  await page.evaluate(l => window.wee.loadLevel(l), spare); await page.waitForTimeout(150);
  const other = JSON.stringify(await level());
  check('opening another room drops the offer: Apply is gone (register 726)', await page.locator('#shapeAsk').isHidden() && await page.locator('#placeBtn').isVisible());
  await page.evaluate(from => dispatchEvent(new CustomEvent('wee:apply', { detail: { level: { w: 1 }, from } })), JSON.stringify(lane));
  check('and an Apply found in another room changes nothing', JSON.stringify(await level()) === other);
  await page.evaluate(l => window.wee.loadLevel(l), lane);
  await page.click('#placeBtn'); await hint();
  await page.click('#shapeNo');
  check('Cancel leaves the room as it was', JSON.stringify((await level()).cells) === JSON.stringify(lane.cells) && await page.locator('#shapeAsk').isHidden() && await page.locator('#placeBtn').isVisible());
  await page.click('#placeBtn'); await hint(); await page.click('#shapeYes');
  check('Apply places it there', m && (await level()).cells[+m[2] * lane.w + +m[1]] === 'wall');
  const walled = await level();
  // Best spot with the Start tool tries the blob on every empty tile (register 705).
  await page.evaluate(l => window.wee.loadLevel(l), lane);
  await pickTool(page, 'start');
  await page.click('#placeBtn');
  const b = await hint();
  check('Most moves moves the blob where the room is longest, and says it moves (register 724)', /^Move the blob to \d+, \d+ and the answer takes \d+ moves instead of 1\.$/.test(b), b);
  await page.click('#shapeNo');
  await pickTool(page, 'wall'); await page.click('#placeBtn'); await hint(); await page.click('#shapeYes');
  // With the blob already where the room is longest, it says so (register 724).
  await page.evaluate(l => window.wee.loadLevel(l), room(['#####', '#P#.#', '#.#.#', '#...#', '#####'], { powers: OFF }));
  await page.evaluate(() => { const l = window.wee.getLevel(); l.cells[1 * l.w + 3] = 'goal'; window.wee.loadLevel(l); });
  await pickTool(page, 'start'); await page.click('#placeBtn');
  const at = await hint();
  check('the blob already at its longest says so', at === 'The blob is already where the answer takes the most moves.', at);
  // Register 728: a one-way is tried every way round; the offer names the way and draws it at half strength.
  const way = room(['#######', '#.....#', '#P...G#', '#....##', '#######'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), way);
  await pickTool(page, 'gate');
  await page.evaluate(() => { const b = document.querySelector('[data-pass=right]'); if (b && !b.classList.contains('on')) b.click(); for (const d of ['up', 'down', 'left']) { const o = document.querySelector(`[data-pass=${d}]`); if (o && o.classList.contains('on')) o.click(); } });
  await page.click('#placeBtn');
  const g = await hint(), want = await page.evaluate(async l => {
    const { search } = await import('/src/solve/solve.js'), { place } = await import('/src/editor/edit.js');
    let best = 0;
    for (const pass of [['up'], ['right'], ['down'], ['left']]) for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const c = JSON.parse(JSON.stringify(l));
      if (c.cells[y * l.w + x] || (c.start.x === x && c.start.y === y) || !place(c, { tool: 'gate', pass }, x, y, 'place').length) continue;
      const it = search(c, 5000); let r; while (!(r = it.next()).done); if (r.value.status === 'solved') best = Math.max(best, r.value.moves.length);
    }
    return best;
  }, way);
  const gm = g.match(/^Place a plain one-way, pointing (up|right|down|left), at (\d+), (\d+) and the answer takes (\d+) moves instead of 1\.$/);
  check('set pointing right, Most moves still finds the way round that is longest and names it (register 728)', !!gm && gm[1] !== 'right' && +gm[4] === want && want > 1, g + ' / ' + want);
  const ghost = await page.evaluate(async () => (await import('/src/app/shape.js')).offerGhost());
  check('and draws the offered one-way at half strength where it would go', !!ghost && gm && ghost.x === +gm[2] && ghost.y === +gm[3] && ghost.paste.cells[0].startsWith('gate:' + gm[1]), JSON.stringify(ghost));
  await page.click('#shapeYes');
  check('Apply places it that way round and sets the tool so', gm && (await level()).cells[+gm[3] * way.w + +gm[2]].startsWith('gate:' + gm[1]) && await page.evaluate(async d => { const { S } = await import('/src/editor/state.js'); return S.ui.pass.join() === d; }, gm[1]));
  await page.evaluate(l => window.wee.loadLevel(l), walled);
  // Remove one: in the notes; taking that block out shortens it, and nothing else lengthens it.
  await page.click('#checkBtn');
  const r = await notes();
  check('Remove one, in the notes, says when nothing makes it longer', /Whichever piece or tile you take out, the answer doesn't get longer\./.test(r), r);
  check('Trim names itself when nothing can be cut (register 748)', await page.evaluate(async () => (await import('/src/app/shape.js')).trimText(null)) === 'Trim: every row and column is needed.');
  await page.click('#shapeNo').catch(() => {});
  await pickTool(page, 'button'); await page.click('#placeBtn');
  const bt = await hint();
  check('Most moves names the piece with its colour (register 764)', /\ba red button\b/.test(bt), bt);
  // Doors are tried plain and inverted, switches off and on (register 767).
  check('Most moves tries a door both ways and a switch off and on (register 767)', await page.evaluate(async () => { const { variants } = await import('/src/editor/variants.js'); const d = variants({ tool: 'door', colour: 'red' }), t = variants({ tool: 'toggle', colour: 'red' }); return d.length === 2 && d.some(u => u.inverted) && t.length === 2 && t.some(u => u.on); }));
  // Never a piece a plain block would match, such as a laser aimed into a wall (register 765).
  const lz = await page.evaluate(async l => {
    const { placeBest } = await import('/src/app/shape.js'), { place } = await import('/src/editor/edit.js'), { search } = await import('/src/solve/solve.js');
    const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
    const r = run(placeBest(l, { tool: 'turret', aim: ['right'], mode: 'input', start: 'right' }));
    if (r.none) return { none: true };
    const w = JSON.parse(JSON.stringify(l)); place(w, { tool: 'wall' }, r.x, r.y, 'place');
    const b = run(search(w)); return { moves: r.moves, block: b.status === 'solved' ? b.moves.length : null };
  }, lane);
  check('Most moves never offers a laser a plain block would match (register 765)', lz.none || lz.moves !== lz.block, JSON.stringify(lz));
  // Another tool drops the answer that was for the first (register 754).
  await page.evaluate(l => window.wee.loadLevel(l), lane);
  await pickTool(page, 'wall'); await page.click('#placeBtn'); await hint();
  await pickTool(page, 'box');
  check('picking another tool drops Most moves\' answer and its Apply (register 754)', await page.locator('#placeSay').isHidden() && await page.locator('#shapeAsk').isHidden());
  check('the size is a plain readout', await page.$eval('#sizeBtn', e => e.tagName === 'SPAN'));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the shape smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
