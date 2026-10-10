// Softlock while playing: once you can no longer reach the goal, the room says so, and its
// Reset button starts you over.
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
  await page.goto('http://localhost:5211/');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(l => window.wee.loadLevel(l), oneWay);
  await page.keyboard.press('e');
  await page.waitForTimeout(300);
  check('at the start nothing is said', !(await shown()));
  await page.keyboard.press('ArrowRight');
  const said = await page.waitForFunction(() => !document.getElementById('stuck').hidden, null, { timeout: 4000 }).then(() => true, () => false);
  check('past the one-way the room says the goal is out of reach', said);
  await page.click('#stuckReset');
  const gone = await page.waitForFunction(() => document.getElementById('stuck').hidden, null, { timeout: 4000 }).then(() => true, () => false);
  check('its Reset starts you over and the message goes', gone);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => !document.getElementById('stuck').hidden, null, { timeout: 4000 });
  await page.keyboard.press('e');
  check('going back to editing takes the message away', !(await shown()));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the stuck smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
