// Puzzle stars (registers 784, 785): a campaign puzzle gives two stars, one for solving it and one for solving
// it in the fewest moves in one take, each undo counting as one more move.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { PUZZLES } from '../src/campaign/progression.js';
import { search } from '../src/solve/solve.js';
import { splitRoom } from '../src/level/room.js';
import { suite } from './lib.mjs';

const { check, done } = suite('puzzle-stars');
const server = await serve(5297);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const pz = PUZZLES.find(Boolean), lv = splitRoom(pz.room).level;
for (const k of Object.keys(lv.powers)) lv.powers[k] = false;
const run = it => { for (;;) { const r = it.next(); if (r.done) return r.value; } };
const moves = run(search(lv, 200000)).moves.map(m => m.split('@')[0]);
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; });
  const rest = () => page.waitForFunction(() => { const t = JSON.parse(window.renderGameToText()); return !t.player.sliding; }, null, { timeout: 10000 }).then(() => page.waitForTimeout(80));
  const play = async list => { for (const m of list) { await page.keyboard.press(KEY[m]); await page.waitForTimeout(60); await rest(); } };
  const star = () => page.evaluate(id => { const s = document.querySelector(`[data-level="${id}"] [data-goal=fewest]`); return s && s.classList.contains('on'); }, pz.id);
  await page.goto(`http://localhost:5297/#/puzzle/${pz.id}`); await page.waitForTimeout(800);
  check('the puzzle\'s fewest moves are the ones its solver finds', await page.evaluate(async () => (await import('/src/editor/state.js')).S.puzzle.fewest) === moves.length);
  // A first move, taken back, then the shortest way: solved, but not in one take.
  await play([moves[0]]); await page.keyboard.press('z'); await page.waitForTimeout(150);
  await play(moves);
  await page.waitForFunction(() => !document.getElementById('win').hidden, null, { timeout: 10000 });
  const said = await page.textContent('#winText');
  const goal = () => page.$eval('#puzzleBrief [data-req=fewest]', li => ({ text: li.textContent.trim(), cls: li.className }));
  check('the win says only the count (register 789)', said === `Solved in ${moves.length} moves.`, said);
  const g1 = await goal();
  check('the card\'s side goal names the fewest moves, and an undo misses it', g1.text === `Win in ${moves.length} moves or fewer, with no undo.` && /unmet/.test(g1.cls), JSON.stringify(g1));
  await page.evaluate(() => { location.hash = '#/levels'; }); await page.waitForTimeout(500);
  check('the level list shows the puzzle solved, its second star still empty', await page.$eval(`[data-level="${pz.id}"] .campStar.main`, s => s.classList.contains('on')) && !(await star()));
  // The shortest way in one take: both stars.
  await page.goto(`http://localhost:5297/#/puzzle/${pz.id}`); await page.waitForTimeout(800);
  await play(moves);
  await page.waitForFunction(() => !document.getElementById('win').hidden, null, { timeout: 10000 });
  check('in one take, the side goal is met', /\bmet\b/.test((await goal()).cls) && !/unmet/.test((await goal()).cls), JSON.stringify(await goal()));
  await page.evaluate(() => { location.hash = '#/levels'; }); await page.waitForTimeout(500);
  check('and the puzzle\'s second star is on (register 785)', await star());
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the puzzle stars smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
