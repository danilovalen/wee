// Dev mode (registers 589, 606, 780): the menu's corner lock shows every level the list hides and the
// tester's extras, puts a badge in the top bar, writes nothing to saved progress, and stays on after a reload.
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
  // The floor plan's locks (registers 558, 616, 673): a fresh player has the first three builder levels open, and no side room.
  const shut = await p.$$eval('#campList li.main .campRow', bs => bs.map(b => [b.dataset.level, b.disabled]));
  const sides = await p.$$eval('#campList li.side .campRow', bs => bs.map(b => b.disabled));
  check('a fresh player can open the first three levels; the rest, and every side room, are shut', shut.length > 4 && shut.slice(0, 3).every(([, off]) => !off) && shut.slice(3).every(([, off]) => off) && sides.length > 0 && sides.every(Boolean), JSON.stringify(shut.slice(0, 5)));
  await p.click(`#campList [data-level="${shut[0][0]}"]`); await p.waitForTimeout(500);
  check('an unbeaten level shows no side goals yet', await p.$$eval('.campReqs .optional', o => o.length === 0));
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(500);
  const extras = ['#menuDebug', '#reportBtn', '#roomDownload', '#importBtn', '#exportAll'];
  const shownExtras = () => p.evaluate(ids => ids.filter(id => { const e = document.querySelector(id); return e && getComputedStyle(e).display !== 'none'; }), extras);
  check('locked, Debug, Copy report, Download, Import and Export all are hidden (register 780)', (await shownExtras()).length === 0, (await shownExtras()).join());
  // Turning it on asks first (register 818); Cancel leaves it off.
  await p.click('#menuUnlock'); await p.waitForTimeout(150);
  check('turning dev mode on asks first', await p.isVisible('#devBox') && /unlocks everything/.test(await p.textContent('#devBox')) && (await p.getAttribute('#menuUnlock', 'aria-pressed')) === 'false');
  await p.click('#devNo'); await p.waitForTimeout(150);
  check('Cancel leaves it off', !(await p.isVisible('#devBox')) && (await p.getAttribute('#menuUnlock', 'aria-pressed')) === 'false');
  const beforeDev = await p.evaluate(() => localStorage.getItem('wee.campaign'));
  await p.click('#menuUnlock'); await p.click('#devYes'); await p.waitForLoadState('load'); await p.waitForTimeout(900);
  check('in dev mode they come back', (await shownExtras()).length === extras.length, (await shownExtras()).join());
  check('the corner button says it is on', (await p.getAttribute('#menuUnlock', 'aria-pressed')) === 'true');
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  check('unlocked, the list shows every level unlock opens, and still leaves out the ones marked hidden (register 731)', (ids => hidden.every(id => ids.includes(id) === !LEVELS.find(l => l.id === id).hidden))(await rows()), JSON.stringify(await rows()));
  check('unlocked, no room is shut', await p.$$eval('#campList .campRow', bs => bs.every(b => !b.disabled)));
  await p.click(`#campList [data-level="${(await rows())[0]}"]`); await p.waitForTimeout(500);
  check('a level does not show the padlock (register 798)', await p.locator('#unlockBadge').isHidden());
  // In the Sandbox it shows, floating over the corner: the header's buttons keep their boxes either way (register 791).
  const heads = () => p.$$eval('header > *', es => es.filter(e => e.id !== 'unlockBadge' && e.getBoundingClientRect().width).map(e => { const r = e.getBoundingClientRect(); return `${e.id}:${Math.round(r.x)},${Math.round(r.y)}`; }).join());
  await p.evaluate(() => { location.hash = '#/rooms/start'; }); await p.waitForTimeout(500);
  await p.click('#roomNew'); await p.waitForTimeout(500);
  const on = await heads(), shown = await p.locator('#unlockBadge').isVisible();
  await p.evaluate(async () => (await import('/src/app/unlock.js')).setDev(false)); await p.waitForTimeout(150);
  const off = await heads();
  await p.evaluate(async () => (await import('/src/app/unlock.js')).setDev(true)); await p.waitForTimeout(150);
  check('in the Sandbox the padlock shows, and turning dev mode on or off moves no header button (register 791)', shown && on === off, `${on} / ${off}`);
  check('nothing about it is saved', (await p.evaluate(() => localStorage.getItem('wee.campaign'))) === saved || !/unlock/i.test(await p.evaluate(() => localStorage.getItem('wee.campaign') || '')));
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  check('dev mode stays on after a reload, its levels still open (register 780)', (ids => hidden.every(id => ids.includes(id) === !LEVELS.find(l => l.id === id).hidden))(await rows()) && (await p.getAttribute('#menuUnlock', 'aria-pressed')) === 'true');
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(400);
  // Register 835: whatever was won with every level open, locking again brings back what you had.
  await p.evaluate(() => localStorage.setItem('wee.campaign', '{"v":4,"last":null,"levels":{"won-in-dev":{"won":true}},"owned":[],"spent":0}'));
  await p.click('#menuUnlock'); await p.waitForLoadState('load'); await p.waitForTimeout(900); await p.reload(); await p.waitForTimeout(800);
  check('locking again brings back the progress you had, not what was won unlocked (register 835)', (await p.evaluate(() => localStorage.getItem('wee.campaign'))) === beforeDev, String(await p.evaluate(() => localStorage.getItem('wee.campaign'))).slice(0, 80));
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(500);
  check('locked again, it stays locked after a reload', (await rows()).every(id => !hidden.includes(id)) && (await p.getAttribute('#menuUnlock', 'aria-pressed')) === 'false' && (await shownExtras()).length === 0);
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the unlock smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
