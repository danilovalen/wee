// The win cards (registers 415, 416): the first win asks Next level or Stay, with the side goals
// and their stars; a later win with no new last star asks nothing; the run that meets the last side
// goal shows the gold card, with its burst of stars; Next level opens the next level.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { KNOWN } from './knownRooms.mjs';

const { check, done } = suite('win');
const PORT = 5253;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const ROOM = KNOWN.small['1'];
// Builds the room from its rows (# block, G goal, P start) and runs it, resolving when the robot is done.
async function runRoom(rows) {
  await page.evaluate(rows => {
    const l = window.wee.blank(rows[0].length, rows.length); l.start = null;
    for (const p of Object.keys(l.powers)) l.powers[p] = false;
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') l.cells[y * l.w + x] = 'wall'; if (c === 'G') l.cells[y * l.w + x] = 'goal'; if (c === 'P') l.start = { x, y }; }));
    window.wee.loadLevel(l);
  }, rows);
  const finished = page.evaluate(() => new Promise(r => addEventListener('wee:demoDone', r, { once: true })));
  await page.click('#campRun');
  await finished; await page.waitForTimeout(150);
}
const card = () => page.evaluate(() => { const b = document.getElementById('winBox'); return { open: b.open, gold: b.classList.contains('gold'), title: document.getElementById('winTitle').textContent, stars: document.querySelectorAll('#winStars .winStar').length, on: document.querySelectorAll('#winStars .winStar.on').length, goals: document.querySelectorAll('#winGoals li').length, next: document.getElementById('winNext').textContent, burst: document.querySelectorAll('#winBox .burst').length }; });
try {
  await page.goto(`http://localhost:${PORT}/#/level/1`); await page.waitForTimeout(600);
  await runRoom(ROOM);
  const c1 = await card();
  check('the first win shows the card, naming the level', c1.open && !c1.gold && c1.title === 'Level 1 beaten', JSON.stringify(c1));
  check('it shows a star per side goal, those met filled, and lists them', c1.stars === 5 && c1.goals === 5 && c1.on >= 1, JSON.stringify(c1));
  check('it offers Next level and Stay', c1.next === 'Next level' && await page.locator('#winStay').isVisible());
  await page.mouse.click(196, 20); await page.waitForTimeout(150);
  check('a tap outside the card closes it, like Stay', !(await card()).open);
  // Beaten afresh: the card comes again, and Stay closes it.
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('wee.campaign')); delete p.levels['1']; localStorage.setItem('wee.campaign', JSON.stringify(p)); });
  await page.reload(); await page.waitForTimeout(600);
  await runRoom(ROOM);
  await page.click('#winStay');
  check('Stay closes the card and keeps the level', !(await card()).open && (await page.evaluate(() => location.hash)) === '#/level/1');
  await runRoom(ROOM);
  check('winning again, with no last star, asks nothing', !(await card()).open);
  // Every side goal but the size one met already: this small room brings the last star.
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('wee.campaign')); p.levels['1'].goals = { best: true, small: false, touchBlockFourTimes: true, robotTwoDirections: true, mix: true }; localStorage.setItem('wee.campaign', JSON.stringify(p)); });
  await page.reload(); await page.waitForTimeout(600);
  await runRoom(ROOM);
  const c2 = await card();
  check('the last side goal shows the gold card', c2.open && c2.gold && c2.title === 'Every side goal met' && c2.on === 5, JSON.stringify(c2));
  check('the gold card bursts stars', c2.burst > 0, String(c2.burst));
  await page.click('#winNext'); await page.waitForTimeout(500);
  check('Next level opens the next level', (await page.evaluate(() => location.hash)) === '#/level/2' && !(await card()).open);
  // Review (register 459): resetting progress shows the first card again in the same session.
  await page.goto(`http://localhost:${PORT}/#/level/1`); await page.waitForTimeout(600);
  await page.evaluate(async () => { (await import('/src/app/winCard.js')).forgetWins(); const p = JSON.parse(localStorage.getItem('wee.campaign')); delete p.levels['1']; localStorage.setItem('wee.campaign', JSON.stringify(p)); });
  await runRoom(ROOM);
  check('the first win of the session shows its card', (await card()).open);
  if ((await card()).open) await page.click('#winStay');
  await page.evaluate(() => { location.hash = '#/levels'; }); await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('progReset').click()); await page.waitForTimeout(150);
  await page.evaluate(() => document.getElementById('progResetYes').click()); await page.waitForTimeout(150);
  await page.evaluate(() => { location.hash = '#/level/1'; }); await page.waitForTimeout(600);
  await runRoom(ROOM);
  check('after a progress reset the first card shows again', (await card()).open, JSON.stringify(await card()));
  if ((await card()).open) await page.click('#winStay');
  // Register 447: a page that cannot save (opened as a file on a phone) still shows the first card once.
  await page.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  await page.goto(`http://localhost:${PORT}/#/level/1`); await page.reload(); await page.waitForTimeout(600);
  await runRoom(ROOM);
  const once = (await card()).open; if (once) await page.click('#winStay');
  await runRoom(ROOM);
  check('without saved progress the first card shows once, not on every win', once && !(await card()).open);
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the win smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
