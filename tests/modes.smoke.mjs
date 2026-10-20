// The four modes (register 302): the menu's two sections, the simple Sandbox a person builds in,
// Puzzles played by hand, and the Level maker for the robot.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('modes');
const server = await serve(5241);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const shown = () => page.evaluate(() => [...document.querySelectorAll('[data-tool]')].filter(b => !b.hidden && b.offsetParent).map(b => b.dataset.tool).sort().join());
try {
  await page.goto('http://localhost:5241/');
  await page.click('#menuSandbox'); await page.waitForTimeout(600);
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  check('the Sandbox builds with the campaign\'s elements and tools only', (await shown()) === 'box,button,door,erase,gate,goal,look,move,start,toggle,turret,wall', await shown());
  check('the Sandbox offers two colours and no powers', await page.evaluate(() => document.querySelectorAll('[data-camp-colour]').length === 2 && getComputedStyle(document.querySelector('[data-sheet=powers]')).display === 'none'));
  // Puzzles: a room marked in the Sandbox is offered, played by hand, and the win names the fewest.
  await page.evaluate(async () => {
    const { put } = await import('/src/app/store.js');
    const l = window.wee.blank(5, 3); l.start = { x: 0, y: 0 }; l.cells[2 * 5 + 4] = 'goal'; for (const k of Object.keys(l.powers)) l.powers[k] = false;
    await put({ ...l, id: 'pz1', name: 'Corner', puzzle: true });
    await put({ ...l, id: 'pz2', name: 'Not a puzzle' });
  });
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); document.getElementById('menuBox').showModal(); });
  await page.click('#menuPuzzles'); await page.waitForTimeout(300);
  const names = await page.$$eval('#puzzleList .campRow b', bs => bs.map(b => b.textContent).join());
  check('Puzzles lists the rooms marked as puzzles, and only those', names === 'Corner', names);
  await page.click('#puzzleList .campRow');
  check('a puzzle is played by hand, with a way back and nothing to edit', await page.evaluate(() => document.body.classList.contains('play') && document.body.classList.contains('puzzle')) && await page.locator('#puzzleBack').isVisible() && !(await page.locator('#mode').isVisible()));
  await page.evaluate(() => { window.wee.press('right'); }); await page.waitForTimeout(700);
  await page.evaluate(() => { window.wee.press('down'); }); await page.waitForTimeout(900);
  const won = await page.locator('#winText').textContent();
  check('the win names the fewest moves', /Solved in 2 moves, the fewest there are\./.test(won), won);
  await page.click('#puzzleBack');
  check('the list keeps your best', /Solved in 2/.test(await page.locator('#puzzleList .campRow small').textContent()));
  // The Level maker: pick elements and goals, build it, it plays like a campaign level, and back.
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); document.getElementById('menuBox').showModal(); });
  await page.click('#menuMaker');
  check('the maker offers only goals its palette can meet', !(await page.$$eval('#makerGoals li', ls => ls.map(l => l.dataset.goal))).includes('throughOpenDoor'));
  for (const el of ['door', 'toggle']) await page.check(`#makerPal tr[data-el="${el}"] [data-in]`);
  await page.fill('#makerPal tr[data-el="door"] [data-min]', '1');
  await page.selectOption('#makerGoals li[data-goal="throughOpenDoor"] select', 'require');
  await page.fill('#makerName', 'Door test');
  await page.click('#makerBuild');
  check('Build it opens the level like a campaign one, with its palette and goal', await page.evaluate(() => document.body.classList.contains('campaign')) && await page.locator('#palette [data-tool="door"]').isVisible() && await page.locator('.campReqs li[data-req="throughOpenDoor"]').count() === 1);
  await page.click('#campBack');
  check('Levels from a made level goes back to the maker, which lists it', await page.locator('#makerBox').isVisible() && (await page.$$eval('#madeList .campRow b', bs => bs.map(b => b.textContent).join())) === 'Door test');
  await page.goto('http://localhost:5241/?sandbox');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  check('?sandbox still opens the full sandbox, with its groups', await page.evaluate(() => !document.body.classList.contains('simple') && document.querySelectorAll('[data-group]').length > 3 && getComputedStyle(document.getElementById('groups')).display !== 'none'));
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
