// The campaign in the page: the menu at launch, the level list, building a level's room with
// its own palette, Run, and the saved best.
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
  // The menu is a screen of its own, not a box over the editor, with the robot playing behind it.
  const menuRect = await page.locator('#menuBox').boundingBox();
  check('the menu fills the whole window', menuRect && menuRect.x === 0 && menuRect.y === 0 && menuRect.width === 1280 && menuRect.height === 800, JSON.stringify(menuRect));
  const robotAt = () => page.$eval('.msRobot', e => getComputedStyle(e).transform).catch(() => null);
  const r0 = await robotAt(); await page.waitForTimeout(600);
  check('the robot behind the menu is moving', !!r0 && r0 !== await robotAt());
  const deskLay = await page.evaluate(() => [document.querySelector('.msGoal').getBoundingClientRect().bottom, document.getElementById('menuCampaign').getBoundingClientRect().top]);
  check('on a wide window the goal still ends above the buttons', deskLay[0] < deskLay[1], JSON.stringify(deskLay));
  check('the room behind the menu has its laser, door and switch', await page.$$eval('.msBeam, .msDoor, .msSwitch', es => es.filter(e => e.getBoundingClientRect().width > 0).length) === 3);
  await page.click('#menuCampaign');
  const rows = await page.$$eval('.campRow', rs => rs.map(r => r.dataset.level));
  check('the level list shows every level', rows.length >= 5 && rows[0] === '1', rows.join());
  const parts = await page.$$eval('.campRow', rs => Object.fromEntries(rs.map(r => [r.dataset.level, [...r.querySelectorAll('.campParts [data-part]')].map(c => c.dataset.part).join()])));
  check('each level in the list shows the elements it uses', parts['1'] === 'block' && parts['5'] === 'block,box' && parts['6'] === 'block,box,toggle,door', JSON.stringify(parts));
  const listing = await page.evaluate(() => { const rows = [...document.querySelectorAll('.campRow')]; return { cols: new Set(rows.map(r => Math.round(r.getBoundingClientRect().left))).size, said: rows.filter(r => /shortest path/i.test(r.textContent)).length }; });
  check('the level list lays its levels out two to a row', listing.cols === 2, JSON.stringify(listing));
  check('no level row repeats the 4-move rule', listing.said === 0, JSON.stringify(listing));
  await page.click('.campRow[data-level="1"]');
  check('a level hides the sandbox and shows its brief', await page.evaluate(() => document.body.classList.contains('campaign')) && await page.locator('#campBrief').isVisible());
  const tools = await visibleTools();
  check('the palette is the level\'s own, with Move', tools.sort().join() === 'erase,look,move,wall', tools.join());
  check('no tool wears a cost', await page.locator('.costDot').count() === 0);
  check('no palette button wears a count', await page.locator('.countDot').count() === 0);
  check('a level opens on a 7x7 room, start and goal one step in from their corners', await page.evaluate(() => { const l = window.wee.getLevel(); return l.w === 7 && l.h === 7 && l.start.x === 1 && l.start.y === 1 && l.cells[40] === 'goal' && l.cells.filter(c => c).length === 1; }));
  check('the card keeps no score', await page.locator('.campScore').count() === 0);
  check('level 1 has four optional goals: the exact count, a room size, its own touch goal and mix', (await page.$$eval('.campOpt li', ls => ls.map(l => l.dataset.req + '=' + l.textContent.trim()).join())) === 'best=★exactly 6,small=★3×3 or smaller,touchBlockFourTimes=★touch one  ×4,mix=★any 2 optional goals at once', await page.$$eval('.campOpt li', ls => ls.map(l => l.dataset.req + '=' + l.textContent.trim()).join()));
  check('every row is unmarked before a run', /^steps:-,best:-,small:-,touchBlockFourTimes:-,mix:-$/.test(await marks()), await marks());
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
  check('a tap on a grip adds a line and the area follows', (await page.evaluate(() => window.wee.getLevel().h)) === 8 );
  await load(['P....', '.....', '.....', '.....', '....G']);
  const before = await box();
  await page.click('#campRun');
  await page.waitForTimeout(200);
  const lost = await verdict();
  check('the verdict shows in its band and moves nothing', await page.locator('#campVerdict').isVisible() && (await box()) === before, before + ' / ' + await box());
  check('a run too short marks the moves row', (await marks()).startsWith('steps:unmet'), await marks());
  check('an empty 5x5 is too short and says so', /takes at least 4 moves/.test(lost) && /Watch the robot/.test(lost), lost);
  check('the robot plays the failing path', await page.evaluate(() => document.getElementById('mode').textContent === 'Edit'), await page.locator('#mode').textContent());
  // F1: a tap on the failed row draws a shortest path that missed it on the room.
  // Back in edit first, so the room is compared with itself and not with the robot playing.
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.waitForTimeout(100);
  // The pixel under the first move's number (the middle of the first move), before and after.
  const badge = at => page.evaluate(([mx, my]) => { const c = document.getElementById('game'), l = window.wee.getLevel(), t = c.width / l.w, d = c.getContext('2d').getImageData(Math.floor((mx + 0.5) * t), Math.floor((my + 0.5) * t), 1, 1).data; return [d[0], d[1], d[2]].join(); }, at);
  await page.click('.campReqs li[data-req="steps"]');
  await page.waitForTimeout(150);
  const trail = await page.evaluate(() => window.wee.trail());
  check('a tap on a failed row draws the path that missed it', trail && trail.robot.length === 3 && await page.locator('.campReqs li[data-req="steps"].shown').count() === 1, JSON.stringify(trail));
  check('and says which goal it missed', /misses it, 2 moves/.test(await page.locator('#campVerdictText').textContent()) && await page.locator('#campVerdict').isVisible());
  const mid = [(trail.robot[0].x + trail.robot[1].x) / 2, (trail.robot[0].y + trail.robot[1].y) / 2];
  const drawn = await badge(mid);
  await page.mouse.click(5, 5);
  check('a touch elsewhere clears it', (await page.evaluate(() => window.wee.trail())) === null && await page.locator('.campReqs li.shown').count() === 0);
  await page.waitForTimeout(100);
  const plain = await badge(mid);
  check('the path is painted on the room: a numbered move where the floor was', drawn !== plain, plain + ' -> ' + drawn);
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await load(WIN);
  await page.click('#campRun');
  await page.waitForTimeout(200);
  const won = await verdict();
  check('a room in range wins and the card marks every row', /Made it in 4 moves/.test(won) && (await marks()).startsWith('steps:met') && (await page.locator('#campLast').textContent()) === 'won in 4', won + ' ' + await marks());
  check('a 5x5 win misses the 3x3 goal', (await marks()).endsWith('small:unmet,touchBlockFourTimes:unmet,mix:unmet'), await marks());
  check('the verdict has no close button: nothing to dismiss', await page.locator('#campVerdict button').count() === 0);
  // The next touch elsewhere puts it away; a touch on it keeps it.
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.click('#campRun'); await page.waitForTimeout(200);
  await page.click('#campVerdictText');
  check('a touch on the verdict keeps it', await page.locator('#campVerdict').isVisible());
  await page.mouse.click(5, 5);
  check('the next touch anywhere else puts the verdict away', await page.locator('#campVerdict').isHidden());
  // And it stays away while the card redraws: a tool, the robot playing and back to edit.
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.click('[data-tool="wall"]'); await page.click('[data-tool="look"]');
  check('a dismissed verdict stays away while the card redraws', await page.locator('#campVerdict').isHidden());
  await page.click('#campRun'); await page.waitForTimeout(200);
  check('the next Run shows its verdict again', await page.locator('#campVerdict').isVisible());
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.mouse.click(5, 5);
  await page.click('#campBack');
  const row = await page.locator('.campRow[data-level="1"] small').textContent();
  check('the list keeps a beaten level and how many optional goals it met', /Beaten · optional 0\/4 · moves 4 · tiles 7 at area 25$/.test(row) && !/cost/.test(row), row);
  check('the level you were on is selected', await page.locator('.campRow[data-level="1"]').evaluate(b => b.classList.contains('sel')));
  await page.click('.campRow[data-level="1"]');
  const kept = await page.evaluate(() => { const l = window.wee.getLevel(); return [l.w, l.h, l.cells.filter(c => c === 'wall').length].join(); });
  check('your room is kept for next time', kept === '5,5,7', kept);
  // A 3x3 win, found by tools/tilesArea.mjs, meets the room-size goal, and the list keeps it.
  await load(['.GP', '...', '..#']);
  await page.click('#campRun'); await page.waitForTimeout(200);
  check('a 3x3 win meets the room-size goal', (await marks()).endsWith('small:met,touchBlockFourTimes:unmet,mix:unmet'), await marks());
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.click('#campBack');
  const row2 = await page.locator('.campRow[data-level="1"] small').textContent();
  await page.click('.campRow[data-level="1"]');
  await load(WIN);
  await page.click('#campRun'); await page.waitForTimeout(200);
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.click('#campBack');
  const row3 = await page.locator('.campRow[data-level="1"] small').textContent();
  check('the list keeps the fewest and most moves, and tiles at the smallest area won', /moves 4\b/.test(row3) && /tiles 1 at area 9/.test(row3), row3);
  await page.click('.campRow[data-level="1"]');
  await page.evaluate(() => { const rows = ['..##P#.', '.#.G...', '....#..', '#.....#', '...#...', '.#...#.', '.......'], l = window.wee.blank(7, 7); l.start = null; for (const p of Object.keys(l.powers)) l.powers[p] = false; rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') l.cells[y * 7 + x] = 'wall'; if (c === 'G') l.cells[y * 7 + x] = 'goal'; if (c === 'P') l.start = { x, y }; })); window.wee.loadLevel(l); });
  await page.click('#campRun'); await page.waitForTimeout(200);
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.click('#campBack');
  const row4 = await page.locator('.campRow[data-level="1"] small').textContent();
  check('a longer win widens the moves; tiles stay at the smallest area won', /moves 4–11/.test(row4) && /tiles 1 at area 9/.test(row4), row4);
  check('a met optional goal stays met after a later win misses it', /optional [12]\/4/.test(row2) && row3.replace(/ · moves.*/, '') === row2.replace(/ · moves.*/, ''), row2 + ' / ' + row3);
  await page.click('.campRow[data-level="1"]');
  // Test: the room played by hand; reaching the goal says so and nothing is judged or saved.
  await load(['P....', '.....', '.....', '.....', '....G']);
  const kept0 = await page.evaluate(() => localStorage.getItem('wee.campaign'));
  await page.click('#campTest');
  check('Test plays the room by hand, with no robot', await page.evaluate(() => document.body.classList.contains('play')) && await page.locator('#campVerdict').isHidden());
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(700);
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(900);
  const said = await page.locator('#campVerdictText').textContent();
  check('reaching the goal in a test says so, and that it does not count', /You reached the goal in 2 moves/.test(said) && /does not count/.test(said), said);
  const kept1 = await page.evaluate(() => JSON.parse(localStorage.getItem('wee.campaign')).levels['1']);
  check('a test changes no record', JSON.stringify(kept1.goals) === JSON.stringify(JSON.parse(kept0).levels['1'].goals) && JSON.stringify(kept1.stats) === JSON.stringify(JSON.parse(kept0).levels['1'].stats));
  await page.click('#mode');
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
  check('a minimum of 1 is no row of its own', await page.locator('.campReqs li[data-req^="min-"]').count() === 0);
  const reqRows = await page.$$eval('.campReqs li', ls => ls.map(l => [l.dataset.req, [...l.querySelectorAll('[data-part]')].map(c => c.dataset.part).join('+')].join('=')));
  const lay = await page.evaluate(() => { const must = document.querySelector('.campMust'), opt = document.querySelector('.campOpt'), xs = new Set([...must.children].map(li => Math.round(li.getBoundingClientRect().left))); return { cols: xs.size, opt: [...opt.children].map(li => li.dataset.req).join(), must: [...must.children].map(li => li.dataset.req).join(), below: opt.getBoundingClientRect().top >= must.getBoundingClientRect().bottom }; });
  check('required goals sit two to a line', lay.cols === 2, JSON.stringify(lay));
  const first = await page.evaluate(() => { const m = document.querySelector('.campMust'), s = m.querySelector('[data-req="steps"]'); return { first: m.firstElementChild === s, full: Math.abs(s.getBoundingClientRect().width - m.getBoundingClientRect().width) < 2, text: s.textContent.trim() }; });
  const sizes = await page.$$eval('.campReqs li', ls => [...new Set(ls.map(l => getComputedStyle(l).fontSize))]);
  check('every goal row has the same type size', sizes.length === 1, sizes.join());
  check('the 4-move minimum comes first, across the whole card', first.first && first.full && first.text.endsWith('at least 4 moves'), JSON.stringify(first));
  check('the optional goal sits apart, below the required ones', lay.opt === 'best,small,mix' && !lay.must.includes('best') && lay.below, JSON.stringify(lay));
  check('the goal card names its sections: goals, and optional goals', (await page.locator('.campLabel').textContent()) === 'Goals' && (await page.locator('.campOpt').getAttribute('data-label')) === 'Optional goals');
  check('requirement rows draw objects as icons', reqRows.includes('throughOpenDoor=start+door') && reqRows.includes('doorClosedAtEnd=door'), reqRows.join());
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
  await page.click('#campBack'); await page.click('.campRow[data-level="4"]');
  const min4 = await page.locator('.campReqs li[data-req="min-toggle"]').evaluate(l => l.textContent.trim() + '|' + [...l.querySelectorAll('[data-part]')].map(c => c.dataset.part).join()).catch(() => 'none');
  check('level 4 lists its 2-switch minimum as a goal, drawn as the switch', min4 === '2 or more|toggle', min4);
  await page.click('#campRun'); await page.waitForTimeout(150);
  check('the minimum row is marked after a run on an empty room', await page.locator('.campReqs li[data-req="min-toggle"].unmet').count() === 1);
  if (await page.locator('#mode').textContent() === 'Edit') await page.click('#mode');
  await page.click('#campBack'); await page.click('.campRow[data-level="2"]');
  // A refused tap: a block on the goal. The room stays, the tile says why.
  const room = await page.evaluate(() => JSON.stringify(window.wee.getLevel()));
  await page.click('[data-tool="wall"]');
  const g = await tile(5, 5); await page.mouse.click(...g);
  check('a refused tap changes nothing and says why on the tile', (await page.evaluate(() => JSON.stringify(window.wee.getLevel()))) === room && await page.locator('#campTip').isVisible() && /goal stays/.test(await page.locator('#campTip').textContent()) && (await page.evaluate(() => window.wee.fxTypes())).includes('refuse'), await page.locator('#campTip').textContent());
  // Move's preview: the tile under a carried start changes while held; over the goal the two
  // swap, so the copy is not red; releasing swaps them, one undo step.
  await page.click('[data-tool="move"]');
  const px = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), l = window.wee.getLevel(), d = c.getContext('2d').getImageData(Math.floor((x + 0.5) * c.width / l.w), Math.floor((y + 0.5) * c.height / l.h), 1, 1).data; return [d[0], d[1], d[2]]; }, [x, y]);
  const empty = await px(2, 2), origin = await px(1, 1);
  await page.mouse.move(...await tile(1, 1)); await page.mouse.down();
  await page.mouse.move(...await tile(2, 2), { steps: 4 }); await page.waitForTimeout(80);
  const ghost = await px(2, 2);
  await page.mouse.move(...await tile(5, 5), { steps: 4 }); await page.waitForTimeout(80);
  const swapping = await px(5, 5), back = await px(1, 1);
  await page.mouse.up();
  check('a swap shows the goal going back where the start was', back.join() !== origin.join(), origin + ' -> ' + back);
  check('dragging shows the start where it would land', ghost.join() !== empty.join(), empty + ' -> ' + ghost);
  check('over the goal the copy is not red: they will swap', !(swapping[0] > swapping[1] + 40), String(swapping));
  const swapped = await page.evaluate(() => { const l = window.wee.getLevel(); return [l.start.x, l.start.y, l.cells.indexOf('goal')].join(); });
  check('dropping the start on the goal swaps them', swapped === '5,5,8', swapped);
  await page.click('#undo');
  check('a swap undoes in one step', (await page.evaluate(() => JSON.stringify(window.wee.getLevel()))) === room);
  // A swap that would leave something where it cannot stand is refused: a block onto a box on a switch.
  await page.evaluate(() => { const l = window.wee.getLevel(); l.cells[3 * 7 + 3] = 'wall'; l.cells[3 * 7 + 4] = 'toggle:red'; l.entities.push({ kind: 'box', x: 4, y: 3, dir: 1, mode: 'input' }); window.wee.loadLevel(l); });
  const busy = await page.evaluate(() => JSON.stringify(window.wee.getLevel())), wallPx = await px(4, 3);
  await page.mouse.move(...await tile(3, 3)); await page.mouse.down();
  await page.mouse.move(...await tile(4, 3), { steps: 4 }); await page.waitForTimeout(80);
  const red = await px(4, 3);
  await page.evaluate(() => { document.getElementById('campTip').hidden = true; });
  await page.mouse.up();
  check('over a tile it cannot take, the copy is red', red.join() !== wallPx.join() && red[0] > red[1] + 40, wallPx + ' -> ' + red);
  check('and releasing there leaves the room and says why', (await page.evaluate(() => JSON.stringify(window.wee.getLevel()))) === busy && await page.locator('#campTip').isVisible());
  // 213: after a Run the robot plays its path, then the level is back in editing by itself.
  await page.click('#campBack'); await page.click('.campRow[data-level="1"]');
  await load(WIN);
  await page.click('#campRun');
  const editing = await page.waitForFunction(() => !document.body.classList.contains('play'), null, { timeout: 15000 }).then(() => true).catch(() => false);
  check('after a Run the robot plays, then the level is back in editing by itself', editing);
  const hRun = await page.evaluate(() => window.wee.getLevel().h);
  await page.click('[data-plus="bottom"]'); await page.waitForTimeout(150);
  check('and the grips work again', (await page.evaluate(() => window.wee.getLevel().h)) === hRun + 1);
  await page.click('#undo');
  await page.click('#campTest'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(2500);
  check('a Test stays in play until the player leaves it', await page.evaluate(() => document.body.classList.contains('play')));
  await page.click('#mode');
  // The report: the state as the level was left, and the last taps.
  await page.click('#campBack'); await page.click('#campMenu'); await page.click('#menuDebug');
  const rep = JSON.parse(await page.evaluate(() => document.getElementById('reportText').value));
  check('Report a problem shows the level as it was left and the last taps', rep.format === 'wee-debug' && rep.leftLevel && rep.leftLevel.level === '1' && rep.leftLevel.mode === 'edit' && rep.leftLevel.onTop.room === '#game' && rep.events.some(e => e.type === 'pointerdown'), JSON.stringify(rep.leftLevel));
  await page.click('#reportBox form button');
  check('closing the report leaves the menu open', await page.locator('#menuBox').isVisible());
  await page.click('#menuCampaign'); await page.click('.campRow[data-level="1"]');
  await page.click('#campBack');
  await page.click('#campMenu');
  await page.click('#menuSandbox');
  await page.waitForFunction(() => document.getElementById('roomsBox').open, null, { timeout: 5000 });
  check('Sandbox opens the rooms list', true);
  check('the sandbox has no Move tool', await page.locator('[data-tool="move"]').isHidden());
  check('the sandbox shows the whole palette again', !(await page.evaluate(() => document.body.classList.contains('campaign'))) && (await page.locator('[data-tool="wall"] .countDot').count()) === 0);
  // On a phone, a palette wider than the screen scrolls by itself and the page stays put.
  const phone = await browser.newPage({ viewport: { width: 412, height: 915 }, hasTouch: true, isMobile: true });
  await phone.goto('http://localhost:5217/');
  const phoneLay = await phone.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { goal: r('.msGoal').bottom, door: r('.msDoor').left, btn: r('#menuCampaign').top, logo: r('.menuLogo').height, w: innerWidth }; });
  check('on a phone the menu shows the wordmark, and the goal and door sit above the buttons', phoneLay.logo > 0 && phoneLay.goal < phoneLay.btn && phoneLay.door < phoneLay.w, JSON.stringify(phoneLay));
  await phone.click('#menuCampaign'); await phone.click('.campRow[data-level="6"]');
  const fit = await phone.evaluate(() => { const d = document.documentElement, g = document.getElementById('palette'); return { page: [d.scrollWidth, d.clientWidth, d.scrollHeight, d.clientHeight], grid: [g.scrollWidth, g.clientWidth, getComputedStyle(g).overflowX] }; });
  check('on a phone the page never scrolls; the palette row does', fit.page[0] === fit.page[1] && fit.page[2] === fit.page[3] && fit.grid[2] === 'auto', JSON.stringify(fit));
  await phone.close();
  // Level 9: a one-way is placed pointing right, and a tap on it with its tool turns it; the robot is drawn as a robot.
  const nine = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  nine.on('pageerror', e => errors.push(e.message));
  await nine.goto('http://localhost:5217/');
  await nine.click('#menuCampaign'); await nine.click('.campRow[data-level="9"]'); await nine.click('[data-tool="gate"]');
  const gb = await nine.locator('#game').boundingBox(), gt = gb.width / 7, gateAt = () => nine.evaluate(() => window.wee.getLevel().cells[3 * 7 + 3]);
  await nine.mouse.click(gb.x + 3.5 * gt, gb.y + 3.5 * gt); const g1 = await gateAt();
  const hint = await nine.evaluate(() => { const t = document.getElementById('campTip'); return t.hidden ? '' : t.textContent; });
  check('the first one-way placed says a tap turns it', hint === 'Tap it again to turn it.', hint);
  await nine.mouse.click(gb.x + 3.5 * gt, gb.y + 3.5 * gt); const g2 = await gateAt();
  check('a one-way goes down pointing right, and a tap on it turns it a quarter clockwise', g1 === 'gate:right' && g2 === 'gate:down', g1 + ' ' + g2);
  // The robot's antenna tip is the one pink on its tile.
  const tip = await nine.evaluate(() => { const c = document.getElementById('game'), g = c.getContext('2d'), t = c.width / 7, d = g.getImageData(t, t, t, t).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 230 && d[i + 1] > 90 && d[i + 1] < 130 && d[i + 2] > 110 && d[i + 2] < 150) n++; return n; });
  check('the start is drawn as the robot (its antenna tip shows)', tip > 3, String(tip));
  await nine.close();
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
