// Onboarding as two rooms (register 955): no Tutorial button; the list opens on Build 0 and Puzzle 0; Level 1
// waits for Build 0; a nudge shows only after the player is still, and stays until its thing is done; an old
// save counts both rooms done.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { listed } from '../src/campaign/rules.js';

const { check, done } = suite('onboarding');
const server = await serve(5288);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const B = 'http://localhost:5288/', ONE = LEVELS.filter(listed)[0].id;
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(B); await p.waitForTimeout(900);
  const inks = await p.evaluate(() => { const c = document.querySelector('.logoArt'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, seen = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) seen.add(d[i] + ',' + d[i + 1] + ',' + d[i + 2]); return seen.size; });
  check('the logo is one flat colour and its line, no emboss (register 950)', inks === 2, String(inks));
  check('the menu has no Tutorial button', !(await p.$('#menuTutorial')));
  check('the menu bar has one Options button where Sound, Player and Dev mode were; they and the progress buttons live in it (registers 960, 963)', await p.evaluate(() => { const head = document.querySelector('.menuHead'), box = document.getElementById('optionsBox'); return !!head.querySelector('#menuOptions') && ['menuSound', 'menuSlot', 'menuUnlock', 'progCopy', 'progLoad', 'progReset'].every(id => box.contains(document.getElementById(id))); }));
  await p.click('#menuOptions'); await p.waitForTimeout(200);
  check('Options opens on a tap', await p.locator('#optionsBox').isVisible());
  await p.click('#optionsClose');
  check('a new player sees no Achievements or Looks button yet, and their places are kept (registers 958, 959)', await p.evaluate(() => ['menuAchieve', 'menuLooks'].every(id => { const b = document.getElementById(id); return getComputedStyle(b).visibility === 'hidden' && b.getBoundingClientRect().width > 0; })));
  const ground = await p.evaluate(async () => { const { MENU_MARGIN: M } = await import('/src/app/menuScene.js'), { T } = await import('/src/view/ink.js'); const c = document.getElementById('menuRoom'), g = c.getContext('2d'), at = (x, y) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data].join(); const floor = [at((M + 1.5) * T, (M + 0.5) * T), at((M + 2.5) * T, (M + 0.5) * T)]; const low = [at(c.width * 0.25, c.height - T * 0.5), at(c.width * 0.75, c.height - T * 2.5)]; return { floor, low }; });
  check('the menu room\'s walls go on down to the bottom of the screen (register 962)', ground.low.every(v => !ground.floor.includes(v)), JSON.stringify(ground));
  await p.click('#menuCampaign'); await p.waitForTimeout(700);
  const rows = await p.$$eval('.campRow', rs => rs.map(r => `${r.dataset.level}:${r.disabled ? 'shut' : 'open'}`));
  check('the list opens on Build 0 and Puzzle 0, both open, and Level 1 shut', rows[0] === '0:open' && rows[1] === 'p0:open' && rows[2] === `${ONE}:shut`, rows.slice(0, 3).join());
  // Register 956: only the next thing to open shows what it is; every other shut card is blank.
  const fog = await p.$$eval('.campRow.locked', bs => bs.map(b => ({ id: b.dataset.level, blank: b.classList.contains('blank'), words: b.textContent.trim() })));
  check('the next level to open shows its name; the shut cards after it are blank (register 956)', fog[0] && !fog[0].blank && fog.slice(1).length > 3 && fog.slice(1).every(f => f.blank && !f.words), JSON.stringify(fog.slice(0, 3)));
  // Puzzle 0: still for a while, a finger swipes across the room; a slide puts it away.
  await p.click('.campRow[data-level="p0"]'); await p.waitForTimeout(600);
  check('Puzzle 0 shows no finger at first', await p.locator('#nudgeHand').isHidden());
  await p.waitForTimeout(4400);
  check('still for 4 s in Puzzle 0, a finger swipes across the room', await p.locator('#nudgeHand').isVisible());
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600);
  check('a slide puts the finger away', await p.locator('#nudgeHand').isHidden());
  // Build 0: the block tool pulses once the player is still, and keeps pulsing after a tap elsewhere.
  await p.goto(B + '#/level/0'); await p.waitForTimeout(900);
  check('Build 0 nudges nothing at first', !(await p.$('.nudge')));
  check('Build 0 is called Build 0, with one side goal: 3x3 or smaller', await p.evaluate(() => getComputedStyle(document.getElementById('campNum'), '::before').content === 'none' && document.getElementById('campNum').textContent === 'Build 0' && [...document.querySelectorAll('#campBrief .campOpt li')].map(l => l.dataset.req).join() === 'small'), await p.evaluate(() => [...document.querySelectorAll('#campBrief .campOpt li')].map(l => l.dataset.req).join()));
  await p.waitForTimeout(6400);
  check('still for 6 s, the block tool pulses', await p.evaluate(() => !!document.querySelector('[data-tool="wall"].nudge')));
  await p.mouse.click(5, 300); await p.waitForTimeout(400);
  check('a tap elsewhere keeps it pulsing (register 955: until it is done)', await p.evaluate(() => !!document.querySelector('[data-tool="wall"].nudge')));
  // The block that wins it: Wee stops above the berry.
  await p.evaluate(async () => { const { S } = await import('/src/editor/state.js'); const l = structuredClone(S.level); l.cells[1 * l.w + 4] = 'wall'; window.wee.loadLevel(l); });
  await p.waitForTimeout(400);
  check('with a block placed, the block tool stops pulsing', !(await p.$('[data-tool="wall"].nudge')));
  await p.waitForTimeout(6400);
  check('then, still again, Run pulses', await p.evaluate(() => !!document.querySelector('#campRun.nudge')));
  await p.click('#campRun');
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  await p.goto(B + '#/levels'); await p.waitForTimeout(700);
  check('beating Build 0 opens Level 1', await p.evaluate(id => !document.querySelector(`.campRow[data-level="${id}"]`).disabled, ONE));
  check('no page errors', errors.length === 0, errors.join(' | '));
  // An old save: Level 1 beaten before Build 0 existed counts both new rooms done.
  const q = await browser.newPage();
  await q.addInitScript(() => localStorage.setItem('wee.campaign', JSON.stringify({ v: 4, last: '1', levels: { 1: { beaten: true, best: { win: 2 }, goals: {} } } })));
  await q.goto(B + '#/levels'); await q.waitForTimeout(800);
  await q.goto(B); await q.waitForTimeout(800);
  const corners = await q.evaluate(() => ['menuAchieve', 'menuLooks'].map(id => getComputedStyle(document.getElementById(id)).visibility).join());
  check('with stars for a look but no achievement yet, Looks shows and Achievements stays hidden (registers 958, 959)', corners === 'hidden,visible', corners);
  check('an old save counts Build 0 and Puzzle 0 done (register 955)', await q.evaluate(() => { const p = JSON.parse(localStorage.getItem('wee.campaign')); return p.v === 5 && !!p.levels['0']?.beaten && !!p.levels.p0?.beaten; }));
} finally {
  await browser.close(); server.close();
}
done();
