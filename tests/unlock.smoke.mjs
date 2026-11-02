// Unlock everything for this session (registers 589, 606): the menu's corner button shows every level the
// list hides, puts a badge in the top bar, writes nothing to saved progress, and a reload ends it.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { listed } from '../src/campaign/rules.js';

const { check, done } = suite('unlock');
const PORT = 5273;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const hidden = LEVELS.filter(l => !listed(l) && !l.tutorial).map(l => l.id);
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 800 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(800);
  const saved = await p.evaluate(() => localStorage.getItem('wee.campaign'));
  const rows = () => p.$$eval('#campList [data-level]', bs => bs.map(b => b.dataset.level));
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  check('there are hidden levels to unlock', hidden.length > 0, hidden.join());
  check('locked, the list leaves them out', (await rows()).every(id => !hidden.includes(id)));
  // The floor plan's locks (registers 558, 616): a fresh player has only the first builder level open.
  const shut = await p.$$eval('#campList .campRow', bs => bs.map(b => [b.dataset.level, b.disabled]));
  check('a fresh player can open only the first level; the rest are shut', shut.length > 2 && !shut[0][1] && shut.slice(1).every(([, off]) => off), JSON.stringify(shut.slice(0, 4)));
  await p.click(`#campList [data-level="${shut[0][0]}"]`); await p.waitForTimeout(500);
  check('an unbeaten level shows no side goals yet', await p.$$eval('.campReqs .optional', o => o.length === 0));
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(500);
  await p.click('#menuUnlock'); await p.waitForTimeout(150);
  check('the corner button says it is on', (await p.getAttribute('#menuUnlock', 'aria-pressed')) === 'true');
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  check('unlocked, the list shows every hidden level', (await rows()).filter(id => hidden.includes(id)).length === hidden.length, JSON.stringify(await rows()));
  check('unlocked, no room is shut', await p.$$eval('#campList .campRow', bs => bs.every(b => !b.disabled)));
  await p.click(`#campList [data-level="${(await rows())[0]}"]`); await p.waitForTimeout(500);
  check('a padlock badge shows in the top bar while it is on', await p.locator('#unlockBadge').isVisible());
  check('nothing about it is saved', (await p.evaluate(() => localStorage.getItem('wee.campaign'))) === saved || !/unlock/i.test(await p.evaluate(() => localStorage.getItem('wee.campaign') || '')));
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  check('a reload locks it again', (await rows()).every(id => !hidden.includes(id)) && (await p.getAttribute('#menuUnlock', 'aria-pressed')) === 'false');
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the unlock smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
