// Softlock while playing (register 661): once you can no longer reach the goal, a few seconds later a quiet
// bubble suggests Undo, which takes back your last move, as Z and the play bar's Undo do.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('stuck');
const server = await serve(5211);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const oneWay = room(['########', '#...P>.#', '########']);
oneWay.cells[1 * oneWay.w + 1] = 'goal';
const shown = () => page.locator('#stuck').isVisible();
try {
  await page.goto('http://localhost:5211/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  await page.evaluate(l => window.wee.loadLevel(l), oneWay);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  check('at the start nothing is said, and Undo has nothing to take back', !(await shown()) && await page.locator('#playUndo').isDisabled());
  const at = () => page.evaluate(() => { const t = JSON.parse(window.renderGameToText()); return `${t.player.x},${t.player.y}`; });
  const home = await at();
  await page.evaluate(async () => { window.__stuckMs = 1500; window.__heard = 0; const m = await import('/src/app/sound.js'); m.VOICES.stuck = () => { window.__heard++; }; });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(700);
  check('stuck, the bubble waits a few seconds before it speaks (register 661)', !(await shown()));
  const said = await page.waitForFunction(() => !document.getElementById('stuck').hidden, null, { timeout: 5000 }).then(() => true, () => false);
  check('then a quiet bubble suggests Undo, with its sound', said && /Undo your last move/.test(await page.textContent('#stuck')) && (await page.textContent('#stuckReset')) === 'Undo' && await page.evaluate(() => window.__heard === 1), String(await page.evaluate(() => window.__heard)));
  await page.click('#stuckReset');
  await page.waitForTimeout(200);
  check('its Undo takes back the last move: the bubble goes and the blob is back', !(await shown()) && await at() === home && (await page.textContent('#moves')) === 'Moves 0', await at());
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600);
  check('after a move, Undo in the play bar is ready', await page.locator('#playUndo').isEnabled());
  await page.keyboard.press('z'); await page.waitForTimeout(200);
  check('Z takes back the last move too', await at() === home && await page.locator('#playUndo').isDisabled());
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => !document.getElementById('stuck').hidden, null, { timeout: 6000 });
  await page.keyboard.press('e');
  check('going back to editing takes the bubble away', !(await shown()));
  // A move, its Undo, then the way that wins: the copied report replays to the win, not to the undone move.
  await page.keyboard.press('e'); await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600); await page.click('#playUndo'); await page.waitForTimeout(200);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(900);
  const same = await page.evaluate(() => { const r = JSON.parse(window.wee.report()); const end = JSON.parse(window.wee.gameText(window.wee.replay(r.level, r.keys, r.ticks))); return r.end.won && JSON.stringify(end) === JSON.stringify(r.end); });
  check('after an Undo, the copied report replays to the same end', same);
  await page.waitForFunction(() => !document.getElementById('win').hidden, null, { timeout: 3000 }).catch(() => {});
  await page.click('#playUndo'); await page.waitForTimeout(200);
  check('Undo after a win takes the win back: its card goes, the moves count drops', await page.locator('#win').isHidden() && (await page.textContent('#moves')) === 'Moves 0', await page.textContent('#moves'));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the stuck smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
