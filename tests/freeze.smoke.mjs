// Freezes (registers 274, 446, 451, 508): two ways the game stopped answering, each forced here.
// One error in a frame used to stop the frame loop for good (nothing redrew, a Run never ended);
// a history move that never answers (a viewer inside another app) used to swallow every later move.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('freeze');
const PORT = 5261;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const url = path => `http://localhost:${PORT}/index.html${path}`;
try {
  const page = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true });
  await page.goto(url('#/level/1')); await page.waitForTimeout(600);
  await page.evaluate(() => window.wee.setMode('play')); await page.waitForTimeout(200);
  await page.evaluate(() => { const o = CanvasRenderingContext2D.prototype.fillRect; let once = true; CanvasRenderingContext2D.prototype.fillRect = function (...a) { if (once) { once = false; throw new Error('one bad frame'); } return o.apply(this, a); }; });
  await page.waitForTimeout(200);
  const d1 = await page.evaluate(() => window.wee.draws()); await page.waitForTimeout(500);
  const d2 = await page.evaluate(() => window.wee.draws());
  check('after an error in one frame the game keeps drawing', d2 > d1, `${d1} -> ${d2}`);
  await page.evaluate(() => document.getElementById('menuDebug').click());
  check('the Debug copy carries the error', /one bad frame/.test(await page.inputValue('#reportText')));

  const nav = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true });
  await nav.goto(url('#/level/3')); await nav.waitForTimeout(600);
  // An entry that says the tab is deeper than it is: history.go(-n) then never answers.
  await nav.evaluate(() => history.replaceState({ ...history.state, n: 5 }, '', location.href));
  await nav.click('#logo'); await nav.waitForTimeout(1000);
  check('the logo still reaches the menu when history never answers', await nav.evaluate(() => document.getElementById('menuBox').open));
  await nav.evaluate(() => document.getElementById('menuCampaign').click()); await nav.waitForTimeout(500);
  check('and every move after it still answers', await nav.evaluate(() => document.getElementById('campBox').open));
  await nav.click('.campRow[data-level="2"]'); await nav.waitForTimeout(600);
  check('a level opens from the list after it', await nav.evaluate(() => !document.getElementById('campBox').open && document.body.classList.contains('campaign')));
} catch (err) { check('the freeze smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
