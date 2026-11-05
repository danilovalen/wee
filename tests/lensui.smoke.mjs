// Lenses on the real page (registers 720-722, 725, 730): every lens an on/off icon on the room's top edge,
// two that draw the same way never on together, no lens opened by a tool, the keys, each kind of drawing
// reaching the canvas, the old line kept while a new one is worked out and cut where an edit stops it.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite, pickTool } from './lib.mjs';

const { check, done } = suite('lens-ui');
const server = await serve(5213);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
const lit = room(['#######', '#e....#', '#P.B..#', '#######'], { powers: OFF });
const oneWay = room(['########', '#...P>.#', '########'], { powers: OFF });
oneWay.cells[1 * 8 + 1] = 'goal';
const deadly = room(['######', '#P..x#', '######'], { powers: OFF });
const legend = () => page.textContent('#lensLegend');
const on = group => page.$eval(`[data-lens-icon][data-group=${group}].on`, b => b.dataset.lensIcon).catch(() => 'off');
const tap = id => page.click(`[data-lens-icon=${id}]`).then(() => page.waitForTimeout(80));
const pixel = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round((x + 0.5) * t), Math.round((y + 0.5) * t), 1, 1).data]; }, [x, y]);
const settle = () => page.waitForFunction(() => !/Working/.test(document.getElementById('lensLegend').textContent), null, { timeout: 15000 }).then(() => page.waitForTimeout(120));
try {
  await page.goto('http://localhost:5213/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  await page.evaluate(l => window.wee.loadLevel(l), lit);
  const floor = await pixel(4, 1);
  const bar = await page.evaluate(() => { const b = document.getElementById('lensBar'), redo = document.getElementById('redo').getBoundingClientRect(), q = b.getBoundingClientRect();
    return { n: b.querySelectorAll('[data-lens-icon]').length, header: b.parentElement.tagName, right: q.left >= redo.right, row: Math.abs((q.top + q.bottom) / 2 - (redo.top + redo.bottom) / 2) < 8, seps: b.querySelectorAll('.lensSep').length, tips: [...b.querySelectorAll('[data-lens-icon]')].every(x => x.title.length > 10), on: b.querySelectorAll('.on').length }; });
  check('ten lens icons sit in the header right of Redo, four groups split by three lines, all off, each saying what it shows (registers 749, 755, 770)', bar.n === 10 && bar.header === 'HEADER' && bar.right && bar.row && bar.seps === 3 && bar.tips && bar.on === 0, JSON.stringify(bar));
  check('the chips row is hidden, and the old Lenses tab, Lenses button and Show lenses button are gone (register 771)', await page.locator('#lensChips').isHidden() && await page.locator('[data-well=lenses], #stopsBtn, #lensOff').count() === 0);
  await pickTool(page, 'turret');
  check('a tool in hand turns no lens on by itself', await on('colour') === 'off');
  await tap('beams'); await settle();
  check('a tap turns Beams on', await on('colour') === 'beams' && (await legend()).includes('red where a laser can ever reach'), await legend());
  const box = await page.locator('#game').boundingBox(), lv = await page.evaluate(() => window.wee.getLevel());
  await page.mouse.move(box.x + 4.5 * box.width / lv.w, box.y + 1.5 * box.height / lv.h);
  await page.waitForTimeout(120);
  check('hovering a tile names it and what the lenses know', /^Tile 4, 1: Empty floor, .*a laser reaches here/.test(await page.textContent('#info')), await page.textContent('#info'));
  const beam = await pixel(4, 1);
  check('and the beam\'s tiles turn the laser\'s orange-red (register 354)', beam[3] > 0 && beam[0] - beam[2] > 50 && beam[0] > beam[1] + 30, JSON.stringify([floor, beam]));
  await tap('pieces');
  check('Pieces on turns Beams off: they draw the same way', await on('colour') === 'pieces' && await page.$eval('[data-lens-icon=beams]', b => !b.classList.contains('on')));
  await tap('pieces');
  check('a second tap turns it off', await on('colour') === 'off');
  // With no berry there is no win to measure by: a stop's ring keeps the player's violet, not a verdict colour.
  await tap('stops'); await settle();
  const plain = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round(1.5 * t + 7 * t / 32), Math.round(2.5 * t), 1, 1).data]; });
  check('with no berry the rings are plain violet', Math.abs(plain[0] - 0xab) < 12 && Math.abs(plain[1] - 0x9d) < 12 && Math.abs(plain[2] - 0xf2) < 12, JSON.stringify(plain));
  check('and the legend says nothing about wins', !/ice|orange/.test(await legend()), await legend());
  await tap('stops');
  // While you play the icons hide but keep their place, so the header does not move (register 680).
  await page.keyboard.press('e'); await page.waitForTimeout(150);
  const idle = await page.evaluate(() => ({ vis: getComputedStyle(document.getElementById('lensBar')).visibility, w: document.getElementById('lensBar').getBoundingClientRect().width }));
  await page.keyboard.press('e'); await page.waitForTimeout(150);
  check('while you play the lens icons hide and keep their place', idle.vis === 'hidden' && idle.w > 100, JSON.stringify(idle));
  await pickTool(page, 'look');
  await page.evaluate(l => window.wee.loadLevel(l), oneWay);
  await page.keyboard.press('3');
  await settle();
  check('key 3 cycles Lines to Solution', await on('lines') === 'solution' && (await legend()).includes('a shortest way, 1 moves'), await legend());
  const along = []; for (const x of [2.1, 2.2, 2.3, 2.7, 2.8, 2.9]) along.push(await pixel(x, 1));
  const arrow = along.find(p => p[0] > 200 && p[1] > 150 && p[2] < 140) || along[0];
  check('and the arrow is drawn', arrow[0] > 200 && arrow[1] > 150 && arrow[2] < 140, JSON.stringify(along));
  // Register 725: each move's number is white on a dark disc, so it reads.
  const num = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w, g = c.getContext('2d'), cx = 3 * t, cy = 1.5 * t, r = 8 * t / 32;
    let white = 0, dark = 0; for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const d = g.getImageData(Math.round(cx + dx), Math.round(cy + dy), 1, 1).data; if (d[0] > 220 && d[1] > 220 && d[2] > 220) white++; else if (d[0] < 60 && d[1] < 60 && d[2] < 70) dark++; } return { white, dark }; });
  check('the move\'s number is white bitmap digits on a dark plate (registers 725, 741)', num.white > 3 && num.dark > num.white, JSON.stringify(num));
  // Register 722: an edit that leaves no way keeps the last line, cut where the room now stops it.
  const cut = await page.evaluate(async () => {
    const { lensMarks } = await import('/src/app/lenses.js'), { S } = await import('/src/editor/state.js'), { change } = await import('/src/app/undo.js');
    change(() => { S.level.cells[1 * S.level.w + 2] = 'wall'; });
    lensMarks(); await new Promise(r => setTimeout(r, 1500));
    const after = lensMarks();
    // While a new map is worked out (a big room takes a while; this one is instant, so the wait is set up).
    const done = S.lensData.d; S.lensData.d = undefined; const now = lensMarks(); S.lensData.d = done;
    return { stale: !!now.stale && now.lines && now.lines.length > 1, after };
  });
  check('right after an edit the old line stays, dimmed, until the new one is ready (register 720)', cut.stale, JSON.stringify(cut));
  check('with no way left, the old line stays, cut where the new wall stops it, the wall marked (register 722)', cut.after.lines && cut.after.cutAt === 0 && cut.after.stopper === 1 * 8 + 2, JSON.stringify(cut.after));
  await page.keyboard.press('1');
  await page.evaluate(l => window.wee.loadLevel(l), oneWay);
  await settle();
  check('key 1 cycles Colour to Distance', await on('colour') === 'distance');
  const [near, past] = [await pixel(1.75, 0.75), await pixel(5.75, 0.75)];
  check('near the goal is not the hopeless grey, past the one-way is grey', Math.abs(past[0] - past[1]) < 30 && past[0] > floor[0] + 20 && Math.abs(near[0] - past[0]) + Math.abs(near[2] - past[2]) > 20, JSON.stringify([near, past, floor]));
  await tap('solution'); await tap('distance'); await tap('passes');
  await settle();
  if (await page.$eval('[data-lens-icon=stops]', b => !b.classList.contains('on'))) { await tap('stops'); await settle(); }
  const big = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w, g = c.getContext('2d'); const at = (x, y, dx) => [...g.getImageData(Math.round((x + 0.5) * t + dx * t / 32), Math.round((y + 0.5) * t), 1, 1).data]; return { stopRing: at(4, 1, 7), stopCentre: at(4, 1, 0), pass: at(3, 1, 0), passOff: at(3, 1, 6) }; });
  const ice = p => p[2] > 200 && p[1] > 180 && p[0] < 150;
  // Every shortest win here stops on the blob's tile and slides through the one beside it: both are ice.
  check('a stop is a ring and a slide-through a dot, both ice where every shortest win uses them (registers 750, 769)', /Dots: .*slide through/.test(await legend()) && ice(big.stopRing) && !ice(big.stopCentre) && ice(big.pass) && !ice(big.passOff), JSON.stringify(big));
  check('Stops and Passes are on together, each by itself (register 770)', await page.$$eval('[data-group=dots].on', b => b.length) === 2);
  const sq = room(['#####', '#P..#', '#...#', '#...#', '#####'], { powers: OFF }); sq.cells[3 * 5 + 3] = 'goal';
  await page.evaluate(l => window.wee.loadLevel(l), sq); await settle();
  const corner = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round(3.5 * t + 7 * t / 32), Math.round(1.5 * t), 1, 1).data]; });
  check('a stop only some shortest wins use rings orange (register 750)', corner[0] > 200 && corner[1] > 120 && corner[1] < 180 && corner[2] < 140, JSON.stringify(corner));
  const focused = await page.evaluate(async () => { const { lensMarks } = await import('/src/app/lenses.js'), { S } = await import('/src/editor/state.js');
    S.hover = { x: 2, y: 2 }; const m = lensMarks(); S.hover = null; return m.focus; });
  check('pointing at a tile focuses the line lenses on it (register 752)', focused === 2 * 5 + 2, String(focused));
  await tap('passes'); await tap('moves');
  await settle();
  const mv = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w, g = c.getContext('2d'); let best = 0; for (let dy = -6; dy <= 6; dy++) { const d = g.getImageData(Math.round(2.5 * t), Math.round(1.5 * t + dy * t / 32), 1, 1).data; best = Math.max(best, Math.min(d[1], d[2])); } return best; });
  check('Moves draws arrows between stops', (await legend()).includes('every move from stop to stop') && mv > 100, String(mv));
  await page.evaluate(l => window.wee.loadLevel(l), deadly);
  await tap('danger');
  await settle();
  const dz = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round(3 * t + 1 * t / 32), Math.round(1.5 * t), 1, 1).data]; });
  check('Danger frames the tile where a move kills you', (await legend()).includes('1 tile where a move kills you') && dz[0] > 200 && dz[1] > 100 && dz[2] < 120, JSON.stringify(dz) + await legend());
  await page.keyboard.press('0'); await page.waitForTimeout(80);
  // What if (755): with a block in hand, each lane tile shows what a block there does to the answer.
  const lane = room(['#######', '#.....#', '#P...G#', '#######'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), lane);
  await pickTool(page, 'wall');
  await tap('whatif');
  await page.waitForFunction(() => /warm tiles make the answer longer/.test(document.getElementById('lensLegend').textContent), null, { timeout: 30000 });
  const warm = await pixel(2.65, 1.65), bare = await pixel(0.65, 0.65);
  check('What if tints a tile warm where a block there makes the answer longer (register 755)', warm[0] > warm[2] + 40 && JSON.stringify(warm) !== JSON.stringify(bare), JSON.stringify([warm, bare]));
  const lb = await page.locator('#game').boundingBox(), llv = await page.evaluate(() => window.wee.getLevel());
  await page.mouse.move(lb.x + 3.5 * lb.width / llv.w, lb.y + 2.5 * lb.height / llv.h);
  const t0 = Date.now(); await page.waitForFunction(() => /\d+ routes?, \d+ traps/.test(document.getElementById('info').textContent), null, { timeout: 30000 }).catch(() => {}); const took = Date.now() - t0;
  check('pointing at a tile says what the change does, with its routes, traps and reuse (register 755)', /Place a block here and the answer takes \d+ moves instead of 1, .*routes?, .*traps, reuse/.test(await page.textContent('#info')), took + 'ms: ' + await page.textContent('#info'));
  await page.mouse.move(lb.x - 40, lb.y - 40);
  await tap('whatif');
  check('key 0 turns every lens off', !(await legend()).trim() && await page.locator('#lensBar .on').count() === 0);
  // The simple Sandbox has the same icons.
  const simple = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await simple.goto('http://localhost:5213/?sandbox');
  await simple.waitForFunction(() => window.wee && window.wee.roomsReady); await simple.evaluate(() => window.wee.roomsReady);
  await simple.evaluate(() => document.getElementById('roomsBox').close());
  check('the simple Sandbox shows the same ten icons', await simple.locator('#lensBar [data-lens-icon]').count() === 10 && await simple.locator('#lensBar').isVisible());
  await simple.close();
  // A phone folds the icons into one Lenses button (register 749).
  const phone = await browser.newPage({ viewport: { width: 390, height: 800 } });
  await phone.goto('http://localhost:5213/?sandbox=full');
  await phone.waitForFunction(() => window.wee && window.wee.roomsReady); await phone.evaluate(() => window.wee.roomsReady);
  await phone.evaluate(() => document.getElementById('roomsBox').close());
  const folded = await phone.locator('#lensFold').isVisible() && await phone.locator('#lensBar').isHidden();
  await phone.click('#lensFold');
  check('on a phone the icons fold into a Lenses button that opens them (register 749)', folded && await phone.locator('#lensBar [data-lens-icon=stops]').isVisible());
  // A campaign level has no lenses, and draws none even when they were on in the Sandbox (register 760).
  await phone.close();
  await page.goto('http://localhost:5213/#/level/1');
  await page.waitForFunction(() => document.body.classList.contains('campaign'));
  await page.waitForTimeout(300);
  const campMarks = await page.evaluate(async () => { const { lensMarks, toggleLens } = await import('/src/app/lenses.js'); toggleLens('passes'); const m = lensMarks(); return Object.keys(m).filter(k => m[k] && k !== 'focus'); });
  check('a campaign level shows no lens icons and draws no lens, even one turned on (register 760)', await page.locator('#lensFold').isHidden() && await page.locator('#lensBar').isHidden() && !campMarks.length, campMarks.join());
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the lens smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
