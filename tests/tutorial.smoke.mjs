// The tutorial (registers 507, 512): a first-time player opening Campaign lands in "How to play"; each
// bubble waits for one thing and only the ringed thing answers; the win leads to Level 1; Skip counts as seen.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('tutorial');
const PORT = 5263;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const fresh = async () => { const p = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true }); const errors = []; p.on('pageerror', e => errors.push(e.message)); await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(500); return { p, errors }; };
const say = p => p.locator('#tutSay').textContent();
try {
  const { p, errors } = await fresh();
  await p.click('#menuCampaign'); await p.waitForTimeout(1200);
  check('a first-time player opening Campaign lands in How to play', (await p.evaluate(() => location.hash)) === '#/level/tutorial' && await p.locator('#tutBox').isVisible());
  check('its goal card is one order', (await p.$$eval('.campReqs li', ls => ls.map(l => l.textContent.trim()).join('|'))).includes('Get the robot to the star.') && await p.locator('.campOpt').isHidden());
  check('step 1: the robot slides on its own', /until a block or a wall stops it/.test(await say(p)) && await p.evaluate(() => document.body.classList.contains('play')));
  await p.evaluate(() => document.getElementById('campBack').click()); await p.waitForTimeout(400);
  check('a tap off the bubble does nothing (Levels stays shut)', (await p.evaluate(() => location.hash)) === '#/level/tutorial');
  await p.click('#tutNext'); await p.waitForTimeout(300);
  check('step 2 rings the star', await p.locator('#tutTile').isVisible());
  await p.click('#tutNext'); await p.waitForTimeout(300);
  check('step 3 rings the block tool, selected', await p.evaluate(() => document.querySelector('.tutRing')?.dataset.tool === 'wall' && !document.body.classList.contains('play')));
  await p.click('#tutNext'); await p.waitForTimeout(300);
  const c = await p.locator('#game').boundingBox(), t = c.width / 5;
  await p.mouse.click(c.x + t * 0.5, c.y + t * 3.5); await p.waitForTimeout(300);
  check('step 4: a block on any other tile is refused', (await p.evaluate(() => window.wee.getLevel().cells.filter(x => x === 'wall').length)) === 0 && /Place a block here/.test(await say(p)));
  await p.mouse.click(c.x + t * 4.5, c.y + t * 1.5); await p.waitForTimeout(400);
  check('the block on the ringed tile moves on to Run', /By tapping Run/.test(await say(p)) && await p.evaluate(() => document.querySelector('.tutRing')?.id === 'campRun'));
  await p.click('#campRun'); await p.waitForTimeout(3500);
  check('the win moves on to the stars, with no win card', /big star/.test(await say(p)) && !(await p.evaluate(() => document.getElementById('winBox').open)));
  await p.click('#tutNext'); await p.waitForTimeout(800);
  check('the last button opens Level 1, and the bubble goes', (await p.evaluate(() => location.hash)) === '#/level/1' && await p.locator('#tutBox').isHidden());
  await p.click('#campBack'); await p.waitForTimeout(500);
  check('How to play is the first card, beaten, with one star and no line', await p.evaluate(() => { const b = document.querySelector('#campList .campRow'); return b.dataset.level === 'tutorial' && b.querySelectorAll('.campStar').length === 1 && b.querySelector('.campStar.on') && !b.querySelector('.campStarLine'); }));
  await p.click('#campMenu'); await p.waitForTimeout(400); await p.click('#menuCampaign'); await p.waitForTimeout(600);
  check('once it is beaten, Campaign opens the list', (await p.evaluate(() => location.hash)) === '#/levels');
  check('no page errors', errors.length === 0, errors.join(' | '));
  await p.close();
  const s = await fresh();
  await s.p.click('#menuCampaign'); await s.p.waitForTimeout(1000); await s.p.click('#tutSkip'); await s.p.waitForTimeout(500);
  check('Skip goes to the list', (await s.p.evaluate(() => location.hash)) === '#/levels' && await s.p.locator('#tutBox').isHidden());
  await s.p.click('#campMenu'); await s.p.waitForTimeout(400); await s.p.click('#menuCampaign'); await s.p.waitForTimeout(600);
  check('after Skip, Campaign opens the list', (await s.p.evaluate(() => location.hash)) === '#/levels');
} catch (err) { check('the tutorial smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
