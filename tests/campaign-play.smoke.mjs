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
const verdict = () => page.locator('#campVerdictText').textContent().catch(() => '');
const score = k => page.locator(`.campScore[data-score="${k}"] b`).textContent();
const marks = () => page.$$eval('.campReqs li', ls => ls.map(l => l.dataset.req + ':' + (l.classList.contains('met') ? 'met' : l.classList.contains('unmet') ? 'unmet' : '-')).join());
const box = () => page.locator('#game').boundingBox().then(b => [b.x, b.y, b.width, b.height].map(Math.round).join());
// Level 1's winning room from tests/campaign.test.mjs: # block, t switch, D door, P start, G goal.
const WIN = ['P.#.#', '.....', '.###.', '.#...', '.#..G'];
const load = rows => page.evaluate(rows => {
  const l = window.wee.blank(rows[0].length, rows.length);
  l.start = null; for (const p of Object.keys(l.powers)) l.powers[p] = false;
  const CELL = { '#': 'wall', t: 'toggle:red', D: 'door:red', G: 'goal' };
  rows.forEach((row, y) => [...row].forEach((c, x) => { if (CELL[c]) l.cells[y * l.w + x] = CELL[c]; if (c === 'P') l.start = { x, y }; }));
  window.wee.loadLevel(l);
}, rows);
try {
  await page.goto('http://localhost:5217/');
  check('the game opens on the main menu', await page.locator('#menuBox').isVisible());
  check('the menu offers Campaign and Sandbox', await page.locator('#menuCampaign').isVisible() && await page.locator('#menuSandbox').isVisible());
  await page.click('#menuCampaign');
  const rows = await page.$$eval('.campRow', rs => rs.map(r => r.dataset.level));
  check('the level list shows every level', rows.length >= 5 && rows[0] === '1', rows.join());
  const parts = await page.$$eval('.campRow', rs => Object.fromEntries(rs.map(r => [r.dataset.level, [...r.querySelectorAll('.campParts [data-part]')].map(c => c.dataset.part).join()])));
  check('each level in the list shows the elements it uses', parts['1'] === 'block' && parts['5'] === 'block,box' && parts['6'] === 'block,box,toggle,door', JSON.stringify(parts));
  await page.click('.campRow[data-level="1"]');
  check('a level hides the sandbox and shows its brief', await page.evaluate(() => document.body.classList.contains('campaign')) && await page.locator('#campBrief').isVisible());
  const tools = await visibleTools();
  check('the palette is the level\'s own, with Move', tools.sort().join() === 'erase,look,move,wall', tools.join());
  check('a priced tool wears its cost', (await page.locator('[data-tool="wall"] .costDot').textContent()) === '1');
  check('a free tool wears none', await page.locator('[data-tool="look"] .costDot').count() === 0 && await page.locator('[data-tool="move"] .costDot').count() === 0);
  check('a level opens on a 7x7 room, start and goal one step in from their corners', await page.evaluate(() => { const l = window.wee.getLevel(); return l.w === 7 && l.h === 7 && l.start.x === 1 && l.start.y === 1 && l.cells[40] === 'goal' && l.cells.filter(c => c).length === 1; }));
  check('the goal card shows the area', (await score('area')) === '49');
  check('every row is unmarked before a run', /^steps:-,best:-$/.test(await marks()), await marks());
  check('a priced tool wears its count too', (await page.locator('[data-tool="wall"] .countDot').textContent()) === '0');
  // Move: press on the start, release two tiles down; then the goal, one tile left.
  await page.click('[data-tool="move"]');
  const tile = async (x, y) => { const b = await page.locator('#game').boundingBox(); const l = await page.evaluate(() => [window.wee.getLevel().w, window.wee.getLevel().h]); return [b.x + (x + 0.5) * b.width / l[0], b.y + (y + 0.5) * b.height / l[1]]; };
  const drag = async (a, b) => { const p = await tile(...a), q = await tile(...b); await page.mouse.move(...p); await page.mouse.down(); await page.mouse.move(...q, { steps: 5 }); await page.mouse.up(); };
  await drag([1, 1], [1, 3]);
  await drag([5, 5], [4, 5]);
  const moved = await page.evaluate(() => { const l = window.wee.getLevel(); return [l.start.x, l.start.y, l.cells.indexOf('goal')].join(); });
  check('Move carries the start and the goal', moved === '1,3,39', moved);
  await page.click('#undo'); await page.click('#undo');
  check('a move undoes in one step', await page.evaluate(() => { const l = window.wee.getLevel(); return l.start.y === 1 && l.cells[40] === 'goal'; }));
  // The grips on the room's edges work as in the sandbox: a tap adds a line.
  check('the room can be resized in a level', await page.locator('[data-plus="bottom"]').isVisible());
  await page.click('[data-plus="bottom"]');
  await page.waitForTimeout(100);
  check('a tap on a grip adds a line and the area follows', (await page.evaluate(() => window.wee.getLevel().h)) === 8 && (await score('area')) === '56');
  await load(['P....', '.....', '.....', '.....', '....G']);
  const before = await box();
  await page.click('#campRun');
  await page.waitForTimeout(200);
  const lost = await verdict();
  check('the verdict floats over the room and moves nothing', await page.locator('#campVerdict').isVisible() && (await box()) === before, before + ' / ' + await box());
  check('a run too short marks the moves row', (await marks()).startsWith('steps:unmet'), await marks());
  check('an empty 5x5 is too short and says so', /takes 4 to 8 moves/.test(lost) && /Watch the robot/.test(lost), lost);
  check('the robot plays the failing path', await page.evaluate(() => document.getElementById('mode').textContent === 'Edit'), await page.locator('#mode').textContent());
  await page.click('#mode');
  await load(WIN);
  await page.click('#campRun');
  await page.waitForTimeout(200);
  const won = await verdict();
  check('a room in range wins and the card marks every row', /Made it in 4 moves/.test(won) && (await marks()).startsWith('steps:met') && (await page.locator('#campLast').textContent()) === 'won in 4', won + ' ' + await marks());
  check('the card shows the scores beside the best', (await score('cost')) === '7' && (await score('area')) === '25' && /best 7/.test(await page.locator('.campScore[data-score="cost"]').textContent()));
  await page.click('#campVerdictClose');
  check('the verdict closes', await page.locator('#campVerdict').isHidden());
  await page.click('#campBack');
  const row = await page.locator('.campRow[data-level="1"] small').textContent();
  check('the list keeps the best of a beaten level', /Beaten/.test(row) && /best cost 7 · area 25/.test(row), row);
  check('the level you were on is selected', await page.locator('.campRow[data-level="1"]').evaluate(b => b.classList.contains('sel')));
  await page.click('.campRow[data-level="1"]');
  const kept = await page.evaluate(() => { const l = window.wee.getLevel(); return [l.w, l.h, l.cells.filter(c => c === 'wall').length].join(); });
  check('your room is kept for next time', kept === '5,5,7', kept);
  // A room saved before rooms lost their border comes back without it.
  await page.click('#campBack');
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem('wee.campaign')), l = window.wee.blank(7, 7);
    for (let i = 0; i < 49; i++) { const x = i % 7, y = (i - x) / 7; if (x === 0 || y === 0 || x === 6 || y === 6) l.cells[i] = 'wall'; }
    l.cells[5 * 7 + 5] = 'goal'; l.cells[2 * 7 + 3] = 'wall'; l.start = { x: 1, y: 1 };
    p.levels['1'] = { ...p.levels['1'], room: l }; localStorage.setItem('wee.campaign', JSON.stringify(p));
  });
  await page.click('.campRow[data-level="1"]');
  const old = await page.evaluate(() => { const l = window.wee.getLevel(); return [l.w, l.h, l.start.x, l.start.y, l.cells.filter(c => c === 'wall').length, l.cells.indexOf('goal')].join(); });
  check('an old framed room comes back without its frame', old === '5,5,0,0,1,24', old);
  await page.click('#campBack');
  await page.click('.campRow[data-level="3"]');
  const counts = [await page.locator('[data-tool="toggle"] .countDot').textContent(), await page.locator('[data-tool="door"] .countDot').textContent()];
  check('an element with a minimum shows its count against it, short until met', counts.join() === '0/1+,0/1+' && await page.locator('[data-tool="toggle"] .countDot.short').count() === 1, counts.join());
  const reqRows = await page.$$eval('.campReqs li', ls => ls.map(l => [l.dataset.req, [...l.querySelectorAll('[data-part]')].map(c => c.dataset.part).join('+')].join('=')));
  check('requirement rows draw objects as icons', reqRows.includes('everyToggleOn=toggle') && reqRows.includes('throughOpenDoor=start+door') && reqRows.includes('doorClosedAtEnd=door'), reqRows.join());
  await page.click('#campBack');
  // Level 3: one switch, one door. With the switch walled off behind the door, Run says why
  // the robot cannot finish and flashes the door and the switch.
  await page.click('.campRow[data-level="3"]');
  await load(['P....', '.....', '##D##', '..t..', '....G']);
  await page.click('#campRun');
  await page.waitForTimeout(150);
  const stuck = await verdict();
  check('a run that cannot finish says why', /red door never opens, because its switch never turns on/.test(stuck), stuck);
  check('and flashes the tiles that stop it', (await page.evaluate(() => window.wee.fxTypes())).filter(t => t === 'flash').length === 2);
  await page.waitForTimeout(1000);
  await page.click('#campVerdictText');
  check('tapping the verdict flashes them again', (await page.evaluate(() => window.wee.fxTypes())).filter(t => t === 'flash').length === 2);
  // Level 2's row says collides, with the door drawn.
  await page.click('#campBack'); await page.click('.campRow[data-level="2"]');
  const hit = await page.locator('.campReqs li[data-req="hitsClosedDoor"]').evaluate(l => l.textContent + '|' + [...l.querySelectorAll('[data-part]')].map(c => c.dataset.part).join());
  check('level 2 says collides with, and draws the robot and the door', /collides with a closed/.test(hit) && hit.endsWith('start,door'), hit);
  // A refused tap: a block on the goal. The room stays, the tile says why.
  const room = await page.evaluate(() => JSON.stringify(window.wee.getLevel()));
  await page.click('[data-tool="wall"]');
  const g = await tile(5, 5); await page.mouse.click(...g);
  check('a refused tap changes nothing and says why on the tile', (await page.evaluate(() => JSON.stringify(window.wee.getLevel()))) === room && await page.locator('#campTip').isVisible() && /goal stays/.test(await page.locator('#campTip').textContent()) && (await page.evaluate(() => window.wee.fxTypes())).includes('refuse'), await page.locator('#campTip').textContent());
  // Move's preview: the tile under a carried start changes while held; over the goal it is red.
  await page.click('[data-tool="move"]');
  const px = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), l = window.wee.getLevel(), d = c.getContext('2d').getImageData(Math.floor((x + 0.5) * c.width / l.w), Math.floor((y + 0.5) * c.height / l.h), 1, 1).data; return [d[0], d[1], d[2]]; }, [x, y]);
  const empty = await px(2, 2), goal = await px(5, 5);
  await page.mouse.move(...await tile(1, 1)); await page.mouse.down();
  await page.mouse.move(...await tile(2, 2), { steps: 4 }); await page.waitForTimeout(80);
  const ghost = await px(2, 2);
  await page.mouse.move(...await tile(5, 5), { steps: 4 }); await page.waitForTimeout(80);
  const red = await px(5, 5);
  await page.evaluate(() => { document.getElementById('campTip').hidden = true; });
  await page.mouse.up();
  check('dragging shows the start where it would land', ghost.join() !== empty.join(), empty + ' -> ' + ghost);
  check('over a tile it cannot take, the copy is red', red.join() !== goal.join() && red[0] > red[1] + 40, goal + ' -> ' + red);
  check('and releasing there leaves the room and says why', (await page.evaluate(() => JSON.stringify(window.wee.getLevel()))) === room && await page.locator('#campTip').isVisible());
  await page.click('#campBack');
  await page.click('#campMenu');
  await page.click('#menuSandbox');
  await page.waitForFunction(() => document.getElementById('roomsBox').open, null, { timeout: 5000 });
  check('Sandbox opens the rooms list', true);
  check('the sandbox has no Move tool', await page.locator('[data-tool="move"]').isHidden());
  check('the sandbox shows the whole palette again', !(await page.evaluate(() => document.body.classList.contains('campaign'))) && (await page.locator('[data-tool="wall"] .costDot').count()) === 0);
  // On a phone, a palette wider than the screen scrolls by itself and the page stays put.
  const phone = await browser.newPage({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  await phone.goto('http://localhost:5217/');
  await phone.click('#menuCampaign'); await phone.click('.campRow[data-level="6"]');
  const fit = await phone.evaluate(() => { const d = document.documentElement, g = document.getElementById('palette'); return { page: [d.scrollWidth, d.clientWidth, d.scrollHeight, d.clientHeight], grid: [g.scrollWidth, g.clientWidth, getComputedStyle(g).overflowX] }; });
  check('on a phone the page never scrolls; the palette row does', fit.page[0] === fit.page[1] && fit.page[2] === fit.page[3] && fit.grid[2] === 'auto', JSON.stringify(fit));
  await phone.close();
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
