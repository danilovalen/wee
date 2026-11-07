// The four modes (register 302): the menu's two sections, the simple Sandbox a person builds in,
// Puzzles played by hand, and the Level maker for the robot.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite, pickTool } from './lib.mjs';

const { check, done } = suite('modes');
const server = await serve(5241);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true }); await page.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// Every tool the strip reaches: a slot's own, or its flyout's when it holds more.
async function shown() {
  const tools = new Set();
  for (const slot of await page.locator('#strip .slot:not([hidden])').all()) {
    if (await slot.locator('.more').isHidden()) { tools.add(await slot.getAttribute('data-picks')); continue; }
    await slot.click({ button: 'right' });
    for (const t of await page.$$eval('#palette [data-tool]', bs => bs.filter(b => !b.hidden && b.offsetParent).map(b => b.dataset.tool))) tools.add(t);
    await page.keyboard.press('Escape');
  }
  return [...tools].sort().join();
}
try {
  await page.goto('http://localhost:5241/');
  await page.click('#menuSandbox'); await page.waitForTimeout(600);
  await page.click('#roomNew'); await page.waitForTimeout(300);
  check('the Sandbox paints only its own groups (the strip bug of register 411)', (await page.evaluate(() => [...document.querySelectorAll('#strip .slot')].filter(s => s.getBoundingClientRect().width > 0).length)) === 7);
  check('the Sandbox offers red, blue, wire and plain (773), and no red+blue (register 407)', (await page.evaluate(() => { document.querySelector('#strip [data-slot=doors]').click(); return [...document.querySelectorAll('[data-camp-colour]')].map(b => b.dataset.campColour).join(); })) === 'red,blue,wire,plain');
  // Plus the spring, offered to try out before any level teaches it (register 824).
  check('the Sandbox builds with the campaign\'s elements and tools, and the spring', (await shown()) === 'box,button,death,door,erase,gate,goal,look,move,select,sensor,spring,start,toggle,turret,wall,wire', await shown());
  check('the Sandbox offers red, blue, grey and plain, and no powers', await page.evaluate(() => document.querySelectorAll('[data-camp-colour]').length === 4 && !!document.querySelector('[data-camp-colour=plain]') && getComputedStyle(document.querySelector('[data-sheet=powers]')).display === 'none'));
  // Register 826: in the Sandbox a tap turns a spring a quarter, as it does a one-way.
  await pickTool(page, 'spring');
  const gb = await page.locator('#game').boundingBox(), lv = await page.evaluate(() => window.wee.getLevel()), tw = gb.width / lv.w, sx = 1, sy = 1;
  const cellNow = () => page.evaluate(([x, y]) => { const l = window.wee.getLevel(); return l.cells[y * l.w + x]; }, [sx, sy]);
  await page.mouse.click(gb.x + (sx + 0.5) * tw, gb.y + (sy + 0.5) * tw); const sp1 = await cellNow();
  await page.mouse.click(gb.x + (sx + 0.5) * tw, gb.y + (sy + 0.5) * tw); await page.waitForTimeout(700); const sp2 = await cellNow();
  check('a tap on a placed spring turns it a quarter, like a one-way (register 826)', /^spring:/.test(sp1 || '') && /^spring:/.test(sp2 || '') && sp1 !== sp2, JSON.stringify([sp1, sp2]));
  // Register 831: the simple Sandbox's tools panel is as tall as its tallest tool needs (one option row), not the full Sandbox's three.
  const toolsH = await page.evaluate(() => Math.round(document.getElementById('tools').getBoundingClientRect().height));
  check('on a phone the simple Sandbox\'s tools take no more height than one option row needs (register 831)', toolsH <= 180, String(toolsH));
  // Registers 830, 831: on a phone Check sits in the bottom bar, and its notes wait behind Notes rather than covering the tools.
  await page.evaluate(() => { const l = window.wee.getLevel(); l.cells[0] = 'goal'; l.start = { x: 3, y: 3 }; window.wee.loadLevel(l); }); await page.waitForTimeout(200);
  await page.click('#navCheck'); await page.waitForTimeout(2500);
  const after = await page.evaluate(() => ({ well: document.getElementById('well').hidden, tools: getComputedStyle(document.getElementById('strip')).visibility, notes: document.querySelector('#navNotes span').textContent, check: document.querySelector('#navCheck span').textContent }));
  check('a Check from the bottom bar leaves the tools uncovered, and Notes counts what it found (registers 830, 831)', after.well && after.tools === 'visible' && /^Notes \d+$/.test(after.notes) && after.check === 'Checked', JSON.stringify(after));
  // Register 379: the Sandbox's generator offers only what the Sandbox can place, and no powers.
  const ing = await page.evaluate(() => { document.getElementById('roomGen').click(); const on = [...document.querySelectorAll('#genIng select')].filter(s => s.offsetParent).map(s => s.dataset.id); document.getElementById('genBox').close(); return on; });
  check('the Sandbox\'s generator offers only its own pieces', ing.length > 0 && ing.includes('box') && !['enemy', 'water', 'mover', 'dive', 'laser'].some(id => ing.includes(id)), ing.join());
  // Registers 357 and 358: the Rooms page lists the example rooms and has a way back to the menu.
  await page.evaluate(() => document.getElementById('roomsBtn').click()); await page.waitForTimeout(300);
  const examples = await page.$$eval('#roomList li', ls => ls.map(l => l.textContent).filter(t => t.includes('Example')).join('|'));
  // The examples are every campaign puzzle, from the same rooms (registers 659, 662); the hex counter is dev only (819).
  const puzzleNames = await page.evaluate(async () => (await import('/src/campaign/progression.js')).PUZZLES.filter(Boolean).map(p => p.name));
  check('the Rooms page lists every campaign puzzle as examples, no box room, and no hex counter outside dev mode (register 819)', !/Hex counter/.test(examples) && puzzleNames.length > 0 && puzzleNames.every(n => examples.includes(n)) && !/Box into box/.test(examples) && examples.split('|').length === puzzleNames.length, examples);
  // Opened from the room, Rooms has Close; its first screen, from the menu, has Menu (register 399).
  // Back goes up a place: from the Rooms page to the room, then to the menu (register 665).
  await page.evaluate(() => document.getElementById('logo').click()); await page.waitForTimeout(400); await page.evaluate(() => document.getElementById('logo').click()); await page.click('#menuSandbox'); await page.waitForTimeout(400);
  await page.click('#roomsMenu');
  check('the first Sandbox screen has a Menu button that returns to the menu', await page.evaluate(() => document.getElementById('menuBox').open && !document.getElementById('roomsBox').open));
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  // Puzzles: a room marked in the Sandbox is offered, played by hand, and the win names the fewest.
  await page.evaluate(async () => {
    const { put } = await import('/src/app/store.js');
    const l = window.wee.blank(5, 3); l.start = { x: 0, y: 0 }; l.cells[2 * 5 + 4] = 'goal'; for (const k of Object.keys(l.powers)) l.powers[k] = true;  // saved with powers on: a puzzle still plays with none (register 653)
    await put({ ...l, id: 'pz1', name: 'Corner', puzzle: true });
    await put({ ...l, id: 'pz2', name: 'Not a puzzle' });
  });
  // To the menu the way a player goes: closing pages behind the game's back raced its history (register 463).
  await page.evaluate(() => document.getElementById('logo').click()); await page.waitForTimeout(700);
  // The Puzzles page is off the menu now (register 651); its address still opens it.
  check('the menu has no Puzzles button: the puzzles are in the campaign', await page.locator('#menuPuzzles').isHidden());
  await page.evaluate(() => { location.hash = '#/puzzles'; }); await page.waitForTimeout(400);
  const names = await page.$$eval('#puzzleList .campRow b', bs => bs.map(b => b.textContent).join());
  check('Puzzles lists the rooms marked as puzzles, and only those', names === 'Corner', names);
  await page.click('#puzzleList .campRow');
  check('a puzzle saved with powers plays with none (register 653)', await page.evaluate(() => !Object.values(window.wee.getLevel().powers).some(Boolean)));
  check('a puzzle is played by hand, with a way back and nothing to edit', await page.evaluate(() => document.body.classList.contains('play') && document.body.classList.contains('puzzle')) && await page.locator('#puzzleBack').isVisible() && !(await page.locator('#mode').isVisible()));
  await page.evaluate(() => { window.wee.press('right'); }); await page.waitForTimeout(700);
  await page.evaluate(() => { window.wee.press('down'); }); await page.waitForTimeout(900);
  const won = await page.locator('#winText').textContent();
  check('the win says only the count (register 789)', won === 'Solved in 2 moves.', won);
  await page.click('#puzzleBack');
  check('the list keeps your best', /Solved in 2/.test(await page.locator('#puzzleList .campRow small').textContent()));
  // The Level maker: pick elements and goals, build it, it plays like a campaign level, and back.
  // To the menu the way a player goes: closing pages behind the game's back raced its history (register 463).
  await page.evaluate(() => document.getElementById('logo').click()); await page.waitForTimeout(700);
  // The Level maker is off the menu for now (register 394); it still opens at its own place.
  check('the menu has no Level maker', await page.locator('#menuMaker').isHidden());
  await page.evaluate(() => document.getElementById('menuMaker').click());
  check('the maker offers only goals its palette can meet', !(await page.$$eval('#makerGoals li', ls => ls.map(l => l.dataset.goal))).includes('throughOpenDoor'));
  for (const el of ['door', 'toggle']) await page.check(`#makerPal tr[data-el="${el}"] [data-in]`);
  await page.fill('#makerPal tr[data-el="door"] [data-min]', '1');
  await page.selectOption('#makerGoals li[data-goal="throughOpenDoor"] select', 'require');
  await page.fill('#makerName', 'Door test');
  await page.click('#makerBuild');
  check('Build it opens the level like a campaign one, with its palette and goal', await page.evaluate(() => document.body.classList.contains('campaign')) && await page.locator('#palette [data-tool="door"]').isVisible() && await page.locator('.campReqs li[data-req="throughOpenDoor"]').count() === 1);
  check('in a made level the back button says Maker', (await page.locator('#campBack').getAttribute('data-label')) === 'Maker');
  await page.click('#campBack');
  check('Levels from a made level goes back to the maker, which lists it', await page.locator('#makerBox').isVisible() && (await page.$$eval('#madeList .campRow b', bs => bs.map(b => b.textContent).join())) === 'Door test');
  // One progress code carries the made levels and the Puzzles bests too (question 4).
  await page.click('#makerMenu'); await page.click('#menuCampaign');
  await page.click('#progCopy'); const all = await page.inputValue('#progCode'); await page.click('#progNo');
  await page.evaluate(() => { localStorage.removeItem('wee-made'); localStorage.removeItem('wee-puzzles'); });
  await page.click('#progLoad'); await page.fill('#progCode', all); await page.click('#progYes'); await page.waitForTimeout(200);
  check('a progress code brings back made levels and Puzzles bests', await page.evaluate(() => JSON.parse(localStorage.getItem('wee-made') || '[]').length === 1 && JSON.parse(localStorage.getItem('wee-puzzles') || '{}').pz1 === 2));
  await page.goto('http://localhost:5241/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  // Register 410: a plain ?sandbox and a shared room link open the campaign's pieces only; ?sandbox=full is the tests' full editor.
  const painted = () => page.evaluate(() => [...document.querySelectorAll('#strip .slot')].filter(s => s.getBoundingClientRect().width > 0).map(s => s.dataset.slot).join());
  const code = await page.evaluate(async () => (await import('/src/level/code.js')).encodeRoom(window.wee.getLevel()));
  for (const url of ['http://localhost:5241/?sandbox', 'http://localhost:5241/#room=' + code]) {
    await page.goto('about:blank'); await page.goto(url);
    await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
    await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); }); await page.waitForTimeout(200);
    check(`${url.includes('#room') ? 'a room link' : '?sandbox'} paints only the Sandbox's seven groups: no enemies, no floors`, (await painted()) === 'edit,room,walls,pieces,lasers,switches,doors', await painted());
    if (!url.includes('#room')) {
      await page.dispatchEvent('#strip [data-slot="edit"]', 'contextmenu');
      check('the simple Sandbox\'s Edit slot offers Select (register 711)', await page.locator('#palette [data-tool="select"]').isVisible());
      await page.click('#palette [data-tool="select"]');
      check('and Select shows its Copy and Paste buttons', await page.locator('#selCopy').isVisible() && await page.locator('#selPaste').isVisible());
      await pickTool(page, 'wall'); await page.waitForTimeout(100);
      check('the simple Sandbox offers Best spot with the tool, on a phone too (register 697)', await page.locator('#placeBtn').isVisible());
    }
  }
  await page.goto('about:blank'); await page.goto('http://localhost:5241/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  check('?sandbox=full opens the full editor, its tools grouped in the strip', await page.evaluate(() => !document.body.classList.contains('simple') && document.querySelectorAll('#strip .slot:not([hidden])').length === 9 && getComputedStyle(document.getElementById('strip')).display !== 'none'));
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
