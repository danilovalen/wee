// Lenses on the real page: one lens per group, a tool opening its own lens until you pick one
// in that group, the keys, and each kind of drawing reaching the canvas.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('lens-ui');
const server = await serve(5213);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
const lit = room(['#######', '#T....#', '#P.B..#', '#######'], { powers: OFF });
const oneWay = room(['########', '#...P>.#', '########'], { powers: OFF });
oneWay.cells[1 * 8 + 1] = 'goal';
const deadly = room(['######', '#P..X#', '######'], { powers: OFF });
const legend = () => page.textContent('#lensLegend');
const on = group => page.$eval(`[data-lens-group=${group}].on`, b => b.dataset.lens).catch(() => null);
const pixel = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round((x + 0.5) * t), Math.round((y + 0.5) * t), 1, 1).data]; }, [x, y]);
const settle = () => page.waitForFunction(() => !/Working/.test(document.getElementById('lensLegend').textContent), null, { timeout: 15000 }).then(() => page.waitForTimeout(120));
try {
  await page.goto('http://localhost:5213/');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(l => window.wee.loadLevel(l), lit);
  const floor = await pixel(4, 1);
  await page.click('#stopsBtn');
  check('Lenses open with Stops and Traps on', await on('dots') === 'stops' && await on('frames') === 'traps' && await on('colour') === 'off');
  // The chips under the room carry the lenses; the well stays shut until More opens its rows.
  const chip = g => page.$eval(`[data-chip=${g}]`, b => ({ text: b.querySelector('.n').textContent, auto: b.classList.contains('auto'), on: b.classList.contains('on') }));
  check('four chips appear under the room and the well stays shut', await page.locator('[data-chip]').count() === 4 && await page.locator('#lensChips').isVisible() && await page.locator('#well').isHidden() && (await chip('dots')).text === 'Stops' && (await chip('colour')).text === 'Off');
  await page.click('#chipsMore');
  check('More opens the well on the lens rows', await page.locator('#lensRows').isVisible());
  await page.click('[data-tool=turret]');
  await settle();
  check('picking the turret opens Beams', await on('colour') === 'beams' && (await legend()).includes('red where a laser can ever reach'), await legend());
  check('and its chip reads Beams, dashed as the tool\'s doing', (await chip('colour')).text === 'Beams' && (await chip('colour')).auto && !(await chip('dots')).auto);
  const box = await page.locator('#game').boundingBox(), lv = await page.evaluate(() => window.wee.getLevel());
  await page.mouse.move(box.x + 4.5 * box.width / lv.w, box.y + 1.5 * box.height / lv.h);
  await page.waitForTimeout(120);
  check('hovering a tile names it and what the lenses know', /^Tile 4, 1: Empty floor .*a laser reaches here/.test(await page.textContent('#info')) && await page.locator('#keys').isHidden(), await page.textContent('#info'));
  const beam = await pixel(4, 1);
  check('and the beam\'s tiles turn red', beam[0] > floor[0] + 40 && beam[0] > beam[1] + 30, JSON.stringify([floor, beam]));
  await page.click('[data-tool=box]');
  await settle();
  check('picking a box opens Pieces instead', await on('colour') === 'pieces' && (await legend()).includes('box, block or enemy'), await legend());
  await page.click('[data-lens-group=colour][data-lens=off]');
  await page.click('[data-tool=turret]');
  check('a lens you pick, Off included, beats the tool', await on('colour') === 'off' && !(await chip('colour')).auto);
  await page.click('[data-chip=colour]');
  check('a chip click moves its group to the next lens', await on('colour') === 'distance' && (await chip('colour')).text === 'Distance');
  await page.click('[data-lens-group=colour][data-lens=off]');
  await page.click('[data-tool=look]');
  await page.evaluate(l => window.wee.loadLevel(l), oneWay);
  await page.keyboard.press('3');
  await settle();
  check('key 3 cycles Lines to Solution', await on('lines') === 'solution' && (await legend()).includes('a shortest way, 1 moves'), await legend());
  const arrow = await pixel(2.5, 1);
  check('and the arrow is drawn', arrow[0] > 200 && arrow[1] > 150 && arrow[2] < 140, JSON.stringify(arrow));
  await page.keyboard.press('1');
  await settle();
  check('key 1 cycles Colour to Distance', await on('colour') === 'distance');
  const [near, past] = [await pixel(1.75, 0.75), await pixel(5.75, 0.75)];
  check('near the goal is green, past the one-way is grey', near[1] > near[0] && Math.abs(past[0] - past[1]) < 30 && past[0] > 60, JSON.stringify([near, past]));
  // Passes: a big dot where you stop, a small one where you only slide through.
  await page.click('[data-lens-group=lines][data-lens=off]');
  await page.click('[data-lens-group=colour][data-lens=off]');
  await page.click('[data-lens-group=dots][data-lens=passes]');
  await settle();
  const big = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w, g = c.getContext('2d'); const at = (x, y, dx) => g.getImageData(Math.round((x + 0.5) * t + dx * t / 32), Math.round((y + 0.5) * t), 1, 1).data[2]; return { stopEdge: at(4, 1, 3), passEdge: at(3, 1, 3), passCentre: at(3, 1, 0) }; });
  check('Passes draws a big dot on a stop and a small one where you slide through', (await legend()).includes('small where you only pass') && big.stopEdge > 150 && big.passEdge < 100 && big.passCentre > 80, JSON.stringify(big) + await legend());
  // Moves: arrows between stops; Danger: where a move kills you, framed and crossed.
    await page.click('[data-lens-group=dots][data-lens=off]');
  await page.click('[data-lens-group=lines][data-lens=moves]');
  await settle();
  // The arrows sit a little to each side of the row's centre line, so look across a band.
  const mv = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w, g = c.getContext('2d'); let best = 0; for (let dy = -6; dy <= 6; dy++) { const d = g.getImageData(Math.round(2.5 * t), Math.round(1.5 * t + dy * t / 32), 1, 1).data; best = Math.max(best, Math.min(d[1], d[2])); } return best; });
  check('Moves draws arrows between stops', (await legend()).includes('every move from stop to stop') && mv > 100, String(mv));
  await page.evaluate(l => window.wee.loadLevel(l), deadly);
  await page.click('[data-lens-group=frames][data-lens=danger]');
  await settle();
  const dz = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round(3 * t + 2.5 * t / 32), Math.round(1.5 * t), 1, 1).data]; });
  check('Danger frames the tile where a move kills you', (await legend()).includes('1 tile where a move kills you') && dz[0] > 200 && dz[1] > 100 && dz[2] < 120, JSON.stringify(dz) + await legend());
  await page.keyboard.press('0');
  check('key 0 turns every lens off', !(await legend()).trim() && await on('dots') === 'off');
  await page.click('#stopsBtn');
  // The chips follow on the next frame, so wait for it rather than race it.
  const gone = await page.waitForFunction(() => document.getElementById('lensChips').hidden, null, { timeout: 3000 }).then(() => true, () => false);
  check('the Lenses button hides the chips and the rows', gone && await page.locator('#lensBox').isHidden() && await page.locator('#well').isHidden());
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the lens smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
