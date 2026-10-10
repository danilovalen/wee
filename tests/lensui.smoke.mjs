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
  await page.click('[data-tool=turret]');
  await settle();
  check('picking the turret opens Beams', await on('colour') === 'beams' && (await legend()).includes('red where a laser can ever reach'), await legend());
  const beam = await pixel(4, 1);
  check('and the beam\'s tiles turn red', beam[0] > floor[0] + 40 && beam[0] > beam[1] + 30, JSON.stringify([floor, beam]));
  await page.click('[data-tool=box]');
  await settle();
  check('picking a box opens Pieces instead', await on('colour') === 'pieces' && (await legend()).includes('box, block or enemy'), await legend());
  await page.click('[data-lens-group=colour][data-lens=off]');
  await page.click('[data-tool=turret]');
  check('a lens you pick, Off included, beats the tool', await on('colour') === 'off');
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
  await page.keyboard.press('0');
  check('key 0 turns every lens off', !(await legend()).trim() && await on('dots') === 'off');
  await page.click('#stopsBtn');
  check('the Lenses button hides the rows', await page.locator('#lensBox').isHidden());
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the lens smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
