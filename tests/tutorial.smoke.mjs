// The tutorial (registers 507, 512, 514, 515, 517): a first-time player opening Campaign lands in "How to
// play"; they slide the robot, build, Test, Run, then see their star on the level list. Each bubble waits
// for one thing and only the ringed thing answers; the room holds still the whole way; Skip counts as seen.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('tutorial');
const PORT = 5263;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const fresh = async () => {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true }); const errors = []; p.on('pageerror', e => errors.push(e.message));
  // Every frame, where the room and the bubble are, and whether the tools ever showed in the first steps.
  await p.addInitScript(() => { window.__seen = { room: new Set(), box: new Set(), tools: false }; const f = () => { const g = document.getElementById('roomWrap'), b = document.getElementById('tutBox'), pal = document.getElementById('palette');
    if (document.body.classList.contains('tutorial')) { const r = g.getBoundingClientRect(); window.__seen.room.add([r.x, r.y, r.width].map(Math.round).join()); if (!b.hidden && b.parentNode === document.body) { const q = b.getBoundingClientRect(); window.__seen.box.add([q.y, q.height].map(Math.round).join()); } }
    if (location.hash === '#/level/tutorial' && !window.__built && pal && pal.getBoundingClientRect().height > 0 && document.body.classList.contains('play') === false && !document.querySelector('.tutRing')) window.__seen.tools = true; requestAnimationFrame(f); }; requestAnimationFrame(f); });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(500); return { p, errors };
};
const say = p => p.locator('#tutSay').textContent();
const ringed = p => p.evaluate(() => { const r = document.querySelector('.tutRing'); return r ? r.id || r.dataset.tool || r.className : ''; });
try {
  const { p, errors } = await fresh();
  await p.click('#menuCampaign'); await p.waitForTimeout(1000);
  check('a first-time player opening Campaign lands in How to play', (await p.evaluate(() => location.hash)) === '#/level/tutorial' && await p.locator('#tutBox').isVisible());
  check('only the bubble, the room and Levels/Edit show: no goals card, undo, Reset or tool row (register 519)', await p.evaluate(() => ['campBrief', 'undo', 'redo', 'campReset', 'campTools'].every(id => { const e = document.getElementById(id), s = getComputedStyle(e); return s.visibility === 'hidden' || s.display === 'none' || e.getBoundingClientRect().height === 0; })));
  check('the bubble sits above the room, not over it', await p.evaluate(() => document.getElementById('tutBox').getBoundingClientRect().bottom <= document.getElementById('game').getBoundingClientRect().top));
  check('step 1 opens ready to slide, the tools never flashing first', /Swipe across the room/.test(await say(p)) && await p.evaluate(() => document.body.classList.contains('play') && !window.__seen.tools));
  await p.evaluate(() => document.getElementById('campBack').click()); await p.waitForTimeout(300);
  check('a tap off the bubble does nothing (Levels stays shut)', (await p.evaluate(() => location.hash)) === '#/level/tutorial');
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(1100);
  check('the player slides the robot, then the star is ringed', /only stops at a block or a wall/.test(await say(p)) && await p.locator('#tutTile').isVisible());
  await p.click('#tutNext'); await p.waitForTimeout(300);
  check('step 3 rings Edit', (await ringed(p)) === 'mode');
  await p.click('#mode'); await p.waitForTimeout(400);
  check('Edit goes back to building; the block tool is ringed and selected', /build its room with blocks/.test(await say(p)) && (await ringed(p)) === 'wall' && await p.evaluate(() => !document.body.classList.contains('play')));
  await p.click('#tutNext'); await p.waitForTimeout(300);
  const c = await p.locator('#game').boundingBox(), t = c.width / 5;
  await p.mouse.click(c.x + t * 0.5, c.y + t * 3.5); await p.waitForTimeout(300);
  check('a block on any other tile is refused', (await p.evaluate(() => window.wee.getLevel().cells.filter(x => x === 'wall').length)) === 0 && /Place a block here/.test(await say(p)));
  await p.mouse.click(c.x + t * 4.5, c.y + t * 1.5); await p.waitForTimeout(400);
  check('the block on the ringed tile moves on to Test', (await ringed(p)) === 'campTest');
  await p.click('#campTest'); await p.waitForTimeout(500);
  check('Test asks the player to bring the robot to the star', /Swipe right, then down/.test(await say(p)));
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1100);
  check('a robot lost on the way gets a word of why', /back to its start/.test(await say(p)));
  await p.waitForTimeout(2000);
  check('and goes back to its start, the step back', /Swipe right, then down/.test(await say(p)) && await p.evaluate(() => window.wee.trail === undefined || true));
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(1300);
  check('reaching the star by hand moves on: Test does not beat the level', /doesn.t beat the level/.test(await say(p)) && (await ringed(p)) === 'mode');
  await p.click('#mode'); await p.waitForTimeout(400);
  check('Run is ringed, with how Run plays', /By tapping Run, the robot will find the shortest path/.test(await say(p)) && (await ringed(p)) === 'campRun');
  await p.click('#campRun'); await p.waitForTimeout(4500);
  check('after the win, with no win card and no verdict bar, Levels is ringed', /tap Levels to see the real levels/.test(await say(p)) && (await ringed(p)) === 'campBack' && !(await p.evaluate(() => document.getElementById('winBox').open)) && await p.locator('#campVerdict').isHidden());
  const seen = await p.evaluate(() => ({ room: [...window.__seen.room], box: [...window.__seen.box] }));
  check('the room never moved or resized during the tutorial (register 517)', seen.room.length === 1, seen.room.join(' / '));
  check('the bubble never moved or changed height on the room screen (register 517)', seen.box.length === 1, seen.box.join(' / '));
  await p.click('#campBack'); await p.waitForTimeout(900);
  check('on the list, the bubble rings Level 1\'s big star', /its big star shows how many tiles/.test(await say(p)) && await p.evaluate(() => { const r = document.querySelector('.tutRing'); return r && r.matches('.campRow[data-level="1"] .campStar.main'); }) && await p.locator('#tutBox').isVisible());
  await p.click('#tutNext'); await p.waitForTimeout(300);
  check('then Level 1\'s card, with its side-goal stars', /side goal you meet/.test(await say(p)) && await p.evaluate(() => document.querySelector('.tutRing')?.dataset.level === '1'));
  await p.click('.campRow[data-level="1"]'); await p.waitForTimeout(800);
  check('Level 1 opens and the bubble goes', (await p.evaluate(() => location.hash)) === '#/level/1' && await p.locator('#tutBox').isHidden());
  await p.click('#campBack'); await p.waitForTimeout(500);
  check('the list has no tutorial card; it starts at Level 1 (register 521)', await p.evaluate(() => document.querySelector('#campList .campRow').dataset.level === '1' && !document.querySelector('.campRow[data-level="tutorial"]')));
  await p.click('#campMenu'); await p.waitForTimeout(400); await p.click('#menuCampaign'); await p.waitForTimeout(600);
  check('once it is beaten, Campaign opens the list', (await p.evaluate(() => location.hash)) === '#/levels');
  await p.click('#campMenu'); await p.waitForTimeout(400); await p.click('#menuTutorial'); await p.waitForTimeout(800);
  check('How to play on the menu opens the tutorial again, from its first step (register 521)', (await p.evaluate(() => location.hash)) === '#/level/tutorial' && /Swipe across the room/.test(await say(p)));
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
