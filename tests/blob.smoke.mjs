// The blob comes off like any piece (register 705): Erase takes it, a tap with the Start tool takes it,
// Play and Check wait until it is back, the hint says so, and Undo puts it back. A level allows it too.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite, pickTool } from './lib.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { listed } from '../src/campaign/rules.js';

const { check, done } = suite('blob');
const server = await serve(5283);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; window.__noWinCard = true; });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const start = () => page.evaluate(() => window.wee.getLevel().start);
const tapStart = async () => {
  const s = await start(), T = await page.evaluate(async () => (await import('/src/view/ink.js')).T);
  const p = await page.evaluate(async ([x, y]) => (await import('/src/app/camera.js')).toScreen(x, y), [(s.x + 0.5) * T, (s.y + 0.5) * T]);
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(150);
};
try {
  await page.goto('http://localhost:5283/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  await page.evaluate(l => window.wee.loadLevel(l), room(['#####', '#P.G#', '#####']));
  await pickTool(page, 'erase');
  await tapStart();
  check('Erase takes the blob off', (await start()) === null);
  check('Play and Check wait for it', await page.locator('#mode').isDisabled() && await page.locator('#checkBtn').isDisabled());
  check('and the hint says to place it', (await page.textContent('#placeHint')) === 'Place the blob to play or check this room.', await page.textContent('#placeHint'));
  await page.click('#undo');
  check('Undo puts it back, and the hint goes', !!(await start()) && (await page.textContent('#placeHint')) !== 'Place the blob to play or check this room.' && await page.locator('#mode').isEnabled());
  await pickTool(page, 'start');
  await tapStart();
  check('a tap on the blob with the Start tool takes it off too', (await start()) === null);
  // A level: the blob comes off there as well, with no refusal.
  const lvl = LEVELS.filter(listed)[0];
  await page.goto('http://localhost:5283/'); await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/levels'; }); await page.waitForTimeout(300);
  await page.click(`.campRow[data-level="${lvl.id}"]`); await page.waitForTimeout(300);
  await pickTool(page, 'erase');
  await tapStart();
  check('in a level, Erase takes the blob off as well', (await start()) === null);
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the blob smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
