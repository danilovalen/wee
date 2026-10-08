// The one-file build opens straight from disk on a phone and plays.
import { chromium } from 'playwright-core';
import { execFileSync } from 'node:child_process';
import { suite } from './lib.mjs';

const { check, done } = suite('single');
execFileSync('node', ['tools/build-single.mjs']);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('file://' + process.cwd() + '/dist/wee.html');
  await page.waitForFunction(() => window.wee, null, { timeout: 5000 });
  check('the file opens from disk', true);
  check('nothing scrolls sideways', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.click('#sample');
  const lv = await page.evaluate(() => window.wee.getLevel());
  check('Sample loads the sample room', lv.entities.length > 5 && lv.w === 20, `${lv.w}x${lv.h}`);
  await page.click('#mode');
  await page.evaluate(() => { window.__manualClock = true; });
  const box = await page.locator('#game').boundingBox();
  await page.mouse.move(box.x + 100, box.y + 60); await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 140, { steps: 6 }); await page.mouse.up();
  await page.evaluate(() => window.advanceTime(900));
  const s = JSON.parse(await page.evaluate(() => window.renderGameToText()));
  check('a swipe down slides the player', s.player.y > 1, JSON.stringify(s.player));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  check('the smoke ran to the end', false, err.message);
} finally { await browser.close(); }
done();
