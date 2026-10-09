// The Generator panel on the real page: a recipe makes a room that fits, nothing reaches
// your rooms before Save, opening over an edited room asks twice, and Undo brings it back.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('gen-ui');
const PORT = 5193;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
let dialogs = [], answers = [];
page.on('dialog', d => { dialogs.push(d.message()); const a = answers.shift(); a ? d.accept() : d.dismiss(); });
const level = async () => JSON.stringify(await page.evaluate(() => window.wee.getLevel()));
const shelfLevel = async i => JSON.stringify(await page.evaluate(i => JSON.parse(localStorage.getItem('wee.generated'))[i].level, i));
const openPanel = async () => { await page.click('#roomsBtn'); await page.click('#roomGen'); };

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await openPanel();
  check('Generate a room opens its own panel', await page.locator('#genBox').isVisible() && !(await page.locator('#roomsBox').isVisible()));
  check('a checkpoint cannot be Must use, and says why', await page.evaluate(() => { const s = document.querySelector('#genIng select[data-id=checkpoint]'); return ![...s.options].some(o => o.value === 'must') && /never dies/.test(s.closest('label').title); }));
  check('every ingredient starts Off', await page.evaluate(() => [...document.querySelectorAll('#genIng select')].every(s => s.value === '')));
  await page.locator('#genIng details, .genIngBox summary').first().click();
  await page.selectOption('#genIng select[data-id=receiver]', 'must');
  check('an ingredient brings what it needs, shown as Allowed', await page.evaluate(() => ['turret', 'door'].every(id => document.querySelector(`#genIng select[data-id=${id}]`).value === 'allowed')));
  for (const id of ['receiver', 'turret', 'door']) await page.selectOption(`#genIng select[data-id=${id}]`, '');
  await page.selectOption('#genIng select[data-id=box]', 'must');
  for (const [id, v] of [['genW', 7], ['genH', 7], ['genMin', 3], ['genMax', 10], ['genSeed', 1]]) await page.fill('#' + id, String(v));
  await page.click('#genGo');
  await page.waitForSelector('#genResult:not([hidden])', { timeout: 30000 });
  check('a recipe that can fit, fits', (await page.textContent('#genInfo')).startsWith('Fits.'), await page.textContent('#genInfo'));
  check('the shelf names it by its recipe', (await page.textContent('#genShelf')).includes('7x7 · 3-10 moves · Box'));
  check('nothing reaches your rooms before Save', await page.evaluate(() => JSON.parse(localStorage.getItem('wee.rooms') || '[]').length === 0));

  // Stop keeps the closest room so far.
  await page.fill('#genMin', '40'); await page.fill('#genMax', '40'); await page.fill('#genTime', '60');
  await page.click('#genGo');
  await page.waitForFunction(() => /Trying\.\.\. \d+ rooms/.test(document.getElementById('genSay').textContent));
  await page.click('#genStop');
  await page.waitForSelector('#genResult:not([hidden])', { timeout: 10000 });
  check('Stop shows the closest room and what it missed', (await page.textContent('#genInfo')).startsWith('Closest so far.') && (await page.textContent('#genSay')).includes('closest'), await page.textContent('#genInfo'));
  check('the shelf keeps both runs', await page.locator('#genShelf .roomRow').count() === 2);
  // The time limit ends a run on its own.
  await page.fill('#genTime', '5');
  const t0 = Date.now();
  await page.click('#genGo');
  await page.waitForFunction(() => /^Nothing fit/.test(document.getElementById('genSay').textContent), null, { timeout: 15000 });
  check('a run stops itself when its time is up', Date.now() - t0 >= 4500 && Date.now() - t0 < 12000, `${Date.now() - t0} ms`);

  // Opening over an unedited saved room asks nothing and is one undo step that keeps its name.
  await page.keyboard.press('Escape');
  await page.click('#roomsBtn');
  await page.fill('#roomName', 'Mine');
  await page.click('#roomSave');
  await page.waitForFunction(() => document.getElementById('roomsSay').textContent.startsWith('Saved'));
  await page.keyboard.press('Escape');
  await openPanel();
  const before = await level();
  await page.locator('#genShelf .roomRow', { hasText: '3-10 moves' }).click();
  dialogs = [];
  await page.click('#genOpen');
  check('opening over an unedited room asks nothing', dialogs.length === 0 && !(await page.locator('#genBox').isVisible()), dialogs.join(' | '));
  const gen = await level();
  check('the editor holds the generated room', gen === await shelfLevel(2));
  check('a generated room is unnamed and not marked unsaved', await page.getAttribute('#roomsBtn', 'title') === 'Unsaved room' && !(await page.textContent('#roomsBtn')).includes('\u2022'));
  await page.click('#undo');
  check('undo brings the room before back, name and all', await level() === before && await page.getAttribute('#roomsBtn', 'title') === 'Mine' && !(await page.textContent('#roomsBtn')).includes('\u2022'));
  await page.click('#redo');
  check('redo brings the generated room again, unnamed', await level() === gen && await page.getAttribute('#roomsBtn', 'title') === 'Unsaved room');

  // Edit it, then open a generated room over it: two questions, either No keeps it.
  await page.click('[data-tool=wall]').catch(async () => { await page.click('[data-group=basic]'); await page.click('[data-tool=wall]'); });
  const lv = JSON.parse(gen), box = await page.locator('#game').boundingBox();
  const free = lv.cells.findIndex((c, i) => c === '' && !lv.entities.some(e => e.y * lv.w + e.x === i) && i !== lv.start.y * lv.w + lv.start.x);
  await page.evaluate(() => scrollTo(0, 0));
  await page.mouse.click(box.x + ((free % lv.w) + 0.5) * box.width / lv.w, box.y + (Math.floor(free / lv.w) + 0.5) * box.height / lv.h);
  const edited = await level();
  check('the edit landed', edited !== gen && (await page.textContent('#roomsBtn')).includes('•'));
  await openPanel();
  await page.locator('#genShelf .roomRow', { hasText: '40-40 moves' }).first().click();
  for (const [ans, label] of [[[false], 'No to the first question keeps the edited room'], [[true, false], 'No to the second question keeps it too']]) {
    dialogs = []; answers = [...ans];
    await page.click('#genOpen');
    const now = await level();
    check(label, now === edited && dialogs.length === ans.length, dialogs.join(' | ') + ' :: ' + (now === edited ? 'same' : now.slice(0, 300) + ' VS ' + edited.slice(0, 300)));
  }
  dialogs = []; answers = [true, true];
  await page.click('#genOpen');
  check('two yeses replace it, and the second question says Undo brings it back', await level() === await shelfLevel(0) && dialogs.length === 2 && dialogs[1].includes('Undo'), dialogs.join(' | '));
  await page.click('#undo');
  check('undo brings the edited room back', await level() === edited);

  // Saving keeps the recipe, and the filter finds rooms that started generated.
  await page.click('#roomsBtn');
  await page.fill('#roomName', 'From the generator');
  await page.click('#roomSave');
  await page.waitForFunction(() => document.getElementById('roomsSay').textContent.startsWith('Saved'));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('wee.rooms')).find(r => r.name === 'From the generator'));
  check('a saved generated room keeps its recipe', stored.recipe && stored.recipe.seed === 1 && stored.recipe.ing.box === 'must', JSON.stringify(stored.recipe));
  await page.waitForFunction(() => /^Explored/.test(document.getElementById('exploredSum').textContent));
  check('the filter counts rooms that started generated', (await page.textContent('#tagFilter')).includes('Started generated (1)'));
  await page.reload();
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await openPanel();
  check('the shelf and the last recipe survive a reload', await page.locator('#genShelf .roomRow').count() === 3 && await page.inputValue('#genW') === '7');
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) {
  check('the generator smoke ran to the end', false, err.message);
} finally { await browser.close(); server.close(); }
done();
