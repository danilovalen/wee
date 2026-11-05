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
  await page.click('#stuckText');
  await page.waitForTimeout(200);
  check('a tap anywhere on the bubble, not only its button, takes back the move (register 757), its Undo the last move: the bubble goes and the blob is back', !(await shown()) && await at() === home && (await page.textContent('#moves')) === 'Moves 0', await at());
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
  // Stuck, the bubble stays through moves and Undos that leave you stuck, with no second sound; it goes on the
  // Undo that makes the goal reachable again (register 688).
  const wide = room(['##########', '#...P>...#', '##########']);
  wide.cells[1 * wide.w + 1] = 'goal';
  await page.keyboard.press('e'); await page.waitForTimeout(200);
  await page.evaluate(l => window.wee.loadLevel(l), wide);
  await page.keyboard.press('e'); await page.waitForTimeout(300);
  await page.evaluate(() => { window.__stuckMs = 300; window.__heard = 0; });
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => !document.getElementById('stuck').hidden, null, { timeout: 5000 });
  const flicker = await page.evaluate(async () => {
    let gone = 0; const id = setInterval(() => { if (document.getElementById('stuck').hidden) gone++; }, 10);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft', code: 'ArrowLeft', bubbles: true }));
    await new Promise(r => setTimeout(r, 1200)); clearInterval(id); return gone;
  });
  const moved = await at();
  check('still stuck after another move: the bubble never goes, and no second sound (register 688)', flicker === 0 && moved !== '8,1' && await page.evaluate(() => window.__heard === 1), JSON.stringify({ flicker, moved, heard: await page.evaluate(() => window.__heard) }));
  await page.keyboard.press('z'); await page.waitForTimeout(800);
  check('an Undo that leaves you stuck keeps it up', await shown() && await at() === '8,1', await at());
  await page.keyboard.press('z'); await page.waitForTimeout(800);
  check('the Undo that makes the goal reachable takes it away', !(await shown()) && await page.evaluate(() => window.__heard === 1), await at());
  // A room with no way to its goal from the start is still being built: no bubble (register 681).
  const walled = room(['#######', '#P..#.#', '#######']);
  walled.cells[1 * walled.w + 5] = 'goal';
  await page.keyboard.press('e'); await page.waitForTimeout(200);
  await page.evaluate(l => window.wee.loadLevel(l), walled);
  await page.keyboard.press('e'); await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(2500);
  check('a room that cannot be won from its start never says you are stuck (register 681)', !(await shown()));
  check('no page errors', !errors.length, errors.join(' | '));
  // Dying keeps you dead where you died and asks for Undo, as Baba Is You does (register 775).
  const spikes = room(['#######', '#P...G#', '#######']); spikes.cells[1 * spikes.w + 3] = 'death';
  await page.keyboard.press('e'); await page.waitForTimeout(200);
  await page.evaluate(l => window.wee.loadLevel(l), spikes);
  await page.keyboard.press('e'); await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(900);
  const dead = await page.evaluate(() => !document.getElementById('stuck').hidden && document.getElementById('stuckText').textContent);
  check('a death shows at once that you died, and asks for Undo', /died/.test(dead || '') && /undo/i.test(dead || ''), dead);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(600);
  check('dead, a move does nothing until Undo or Reset', (await page.textContent('#moves')) === 'Moves 1', await page.textContent('#moves'));
  await page.click('#stuckReset'); await page.waitForTimeout(300);
  check('Undo brings you back to before the move that killed you', !(await shown()) && await at() === '1,1' && (await page.textContent('#moves')) === 'Moves 0', await at());
} catch (err) { check('the stuck smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
