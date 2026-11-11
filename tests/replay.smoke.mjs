// Replay (register 758): after a run, the win line offers Replay, which steps through the run one move at a
// time, back and forward, plays it, and leaves the run as it was; Edit from here opens a position as a new room.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('replay');
const server = await serve(5296);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => d.accept());
// Right to the wall, then down onto the berry: two moves.
const two = room(['#####', '#P..#', '###.#', '#####'], { powers: { boomerang: false, dive: false, laser: false, cycle: false } });
two.cells[2 * 5 + 3] = 'goal';
const shownAt = () => page.evaluate(async () => { const { S } = await import('/src/editor/state.js'); const g = S.replay ? S.replay.frames[S.replay.i].game : S.game; return `${g.player.x},${g.player.y}`; });
try {
  await page.goto('http://localhost:5296/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  await page.evaluate(l => window.wee.loadLevel(l), two);
  await page.keyboard.press('e'); await page.waitForTimeout(300);
  check('while playing, the play bar offers Replay', await page.locator('#replayBtn').isVisible());
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => !document.getElementById('win').hidden, null, { timeout: 5000 });
  check('a won run offers Replay beside Play again', await page.locator('#winReplay').isVisible());
  const end = await shownAt();
  await page.click('#winReplay'); await page.waitForTimeout(150);
  check('Replay opens at the start, counting the run\'s moves', await page.locator('#replayBar').isVisible() && (await page.textContent('#rpAt')) === 'Start, 2 moves' && await shownAt() === '1,1' && await page.locator('#win').isHidden() && await page.locator('#pad').isHidden(), await page.textContent('#rpAt'));
  await page.click('#rpFwd'); await page.waitForTimeout(100);
  check('forward shows where the first move came to rest', await shownAt() === '3,1' && (await page.textContent('#rpAt')) === 'Move 1 of 2' && await page.locator('#rpBack').isEnabled());
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100);
  check('the right arrow steps forward too, to the end', await shownAt() === end && await page.locator('#rpFwd').isDisabled());
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(100);
  check('left steps one move back', await shownAt() === '3,1');
  await page.keyboard.press('Home'); await page.waitForTimeout(150);
  check('Home jumps to the start', await shownAt() === '1,1' && await page.locator('#rpStart').isDisabled());
  // The room draws the replayed position, not the run: the blob is back on its first tile.
  const violet = await page.evaluate(() => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w, d = c.getContext('2d').getImageData(Math.round(1.5 * t), Math.round(1.5 * t), 1, 1).data; return d[2] > 200 && d[2] - d[1] > 50; });
  check('the room draws the replayed position', violet);
  const ticks = await page.evaluate(() => JSON.parse(window.renderGameToText()).tick);
  await page.click('#rpPlay'); await page.waitForTimeout(1200);
  check('Play runs it to the end by itself, and stops there', await shownAt() === end && (await page.textContent('#rpPlay')) === 'Play');
  check('the run itself stands still while it is replayed', await page.evaluate(() => JSON.parse(window.renderGameToText()).tick) === ticks);
  await page.keyboard.press('Home'); await page.click('#rpFwd'); await page.waitForTimeout(100);
  await page.click('#rpEditHere'); await page.waitForTimeout(400);
  const lv = await page.evaluate(() => window.wee.getLevel());
  check('Edit from here opens that position as a new room, Wee starting where it stood', lv.start.x === 3 && lv.start.y === 1 && await page.evaluate(async () => (await import('/src/editor/state.js')).S.mode) === 'edit' && await page.locator('#replayBar').isHidden(), JSON.stringify([lv.start, await page.textContent('#mode'), await page.locator('#replayBar').isHidden()]));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the replay smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
