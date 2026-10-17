// The campaign in the page: the menu at launch, the level list, building a level's room with
// its own palette and costs, Run, and the saved best.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('campaign-play');
const server = await serve(5217);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const visibleTools = () => page.$$eval('[data-tool]', bs => bs.filter(b => !b.hidden).map(b => b.dataset.tool));
const verdict = () => page.locator('#campVerdict').textContent().catch(() => '');
// Level 1's winning room from tests/campaign.test.mjs, as blocks inside the frame.
const WIN = ['#######', '#P.#.##', '#.....#', '#.###.#', '#.#...#', '#.#..G#', '#######'];
try {
  await page.goto('http://localhost:5217/');
  check('the game opens on the main menu', await page.locator('#menuBox').isVisible());
  check('the menu offers Campaign and Sandbox', await page.locator('#menuCampaign').isVisible() && await page.locator('#menuSandbox').isVisible());
  await page.click('#menuCampaign');
  const rows = await page.$$eval('.campRow', rs => rs.map(r => r.dataset.level));
  check('the level list shows every level', rows.length >= 5 && rows[0] === '1', rows.join());
  await page.click('.campRow[data-level="1"]');
  check('a level hides the sandbox and shows its brief', await page.evaluate(() => document.body.classList.contains('campaign')) && await page.locator('#campBrief').isVisible());
  const tools = await visibleTools();
  check('the palette is the level\'s own', tools.sort().join() === 'erase,look,wall', tools.join());
  check('a priced tool wears its cost', (await page.locator('[data-tool="wall"] .costDot').textContent()) === '1');
  check('a free tool wears none', await page.locator('[data-tool="look"] .costDot').count() === 0);
  await page.click('#campRun');
  await page.waitForTimeout(200);
  const lost = await verdict();
  check('an empty room is too short and says so', /takes 4 to 8 moves/.test(lost) && /Watch the robot/.test(lost), lost);
  check('the robot plays the failing path', await page.evaluate(() => document.getElementById('mode').textContent === 'Edit'), await page.locator('#mode').textContent());
  await page.click('#mode');
  await page.evaluate(rows => {
    const l = window.wee.getLevel();
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#' && !l.cells[y * l.w + x]) l.cells[y * l.w + x] = 'wall'; }));
    window.wee.loadLevel(l);
  }, WIN);
  await page.click('#campRun');
  await page.waitForTimeout(200);
  const won = await verdict();
  check('a room in range wins and reports its scores', /made it in 4 moves/.test(won) && /Cost 7/.test(won), won);
  await page.click('#campBack');
  const row = await page.locator('.campRow[data-level="1"] small').textContent();
  check('the list keeps the best of a beaten level', /Beaten/.test(row) && /best cost 7/.test(row), row);
  check('the level you were on is selected', await page.locator('.campRow[data-level="1"]').evaluate(b => b.classList.contains('sel')));
  await page.click('.campRow[data-level="1"]');
  const kept = await page.evaluate(() => window.wee.getLevel().cells.filter(c => c === 'wall').length);
  check('your room is kept for next time', kept === 24 + 7, String(kept));
  await page.click('#campBack');
  // Level 4: one switch, one door. With the switch walled off behind the door, Run says why
  // the robot cannot finish and flashes the door and the switch.
  await page.click('.campRow[data-level="4"]');
  await page.evaluate(() => {
    const l = window.wee.getLevel(), at = (x, y, c) => { l.cells[y * l.w + x] = c; };
    for (let x = 1; x <= 5; x++) at(x, 3, 'wall');
    at(3, 3, 'door:red'); at(3, 4, 'toggle:red');
    window.wee.loadLevel(l);
  });
  await page.click('#campRun');
  await page.waitForTimeout(150);
  const stuck = await verdict();
  check('a run that cannot finish says why', /red door never opens, because its switch never turns on/.test(stuck), stuck);
  check('and flashes the tiles that stop it', (await page.evaluate(() => window.wee.fxTypes())).filter(t => t === 'flash').length === 2);
  await page.waitForTimeout(1000);
  await page.click('#campVerdict');
  check('tapping the verdict flashes them again', (await page.evaluate(() => window.wee.fxTypes())).filter(t => t === 'flash').length === 2);
  await page.click('#campBack');
  await page.click('#campMenu');
  await page.click('#menuSandbox');
  await page.waitForFunction(() => document.getElementById('roomsBox').open, null, { timeout: 5000 });
  check('Sandbox opens the rooms list', true);
  check('the sandbox shows the whole palette again', !(await page.evaluate(() => document.body.classList.contains('campaign'))) && (await page.locator('[data-tool="wall"] .costDot').count()) === 0);
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
