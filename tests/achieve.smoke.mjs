// Achievements (registers 627-640): their own page with a badge per achievement, the popup a winning Run
// raises (then, once ever, that the stars now cover a look), and the red dots on the menu's buttons.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('achieve');
const PORT = 5276;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
// Level 3's known win (tests/knownRooms.mjs): the first achievement is Level 3 now (register 958).
const WIN = ['P.#.#', '..###', '#..#.', 'Dt...', '..t#G'];
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__toastMs = 600; });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(700);
  const dot = id => p.$eval('#' + id, b => b.classList.contains('dot'));
  check('on a fresh save neither menu button has a dot', !(await dot('menuAchieve')) && !(await dot('menuLooks')));
  // A fresh save has no Achievements button yet (register 958): the page opens by its address.
  await p.evaluate(() => { location.hash = '#/achievements'; }); await p.waitForTimeout(300);
  check('the Achievements page opens', await p.$eval('#achBox', d => d.open) && (await p.evaluate(() => location.hash)) === '#/achievements');
  const rows = await p.$$eval('#achList li', ls => ls.map(l => ({ id: l.dataset.achievement, done: l.classList.contains('done'), icon: l.querySelector('.achBadge > svg').innerHTML, slot: !!l.querySelector('.achSlot svg') })));
  check('every achievement is listed, none done yet', rows.length >= 14 && rows.every(r => !r.done), rows.length);
  check('each has its own picture and a star slot (register 639)', new Set(rows.map(r => r.icon)).size === rows.length && rows.every(r => r.slot));
  check('the seven new ones are there (registers 630-636)', ['cashback', 'moveit', 'oneshot', 'gateway', 'guardrails', 'deadly', 'silver'].every(id => rows.some(r => r.id === id)));
  await p.click('#achMenu'); await p.waitForTimeout(300);

  // A real win on Level 3, levels 1 and 2 beaten before: its popups wait for the robot, then come one after the other.
  await p.evaluate(async () => { const { builders } = await import('/src/campaign/progression.js'), b = builders(), win = { beaten: true, best: { win: 4 }, goals: {} }; localStorage.setItem('wee.campaign', JSON.stringify({ v: 5, last: null, levels: { 0: { beaten: true }, [b[0].id]: win, [b[1].id]: win } })); (await import('/src/app/nav.js')).go('level', b[2].id); });
  await p.waitForTimeout(600);
  await p.evaluate(rows => {
    const l = window.wee.blank(rows[0].length, rows.length);
    l.start = null; for (const k of Object.keys(l.powers)) l.powers[k] = false;
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') l.cells[y * l.w + x] = 'wall'; if (c === 'G') l.cells[y * l.w + x] = 'goal'; if (c === 'D') l.cells[y * l.w + x] = 'door:red'; if (c === 't') l.cells[y * l.w + x] = 'toggle:red'; if (c === 'P') l.start = { x, y }; }));
    window.wee.loadLevel(l);
  }, WIN);
  await p.evaluate(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById('toast'); if (!t.hidden) window.__toasts.push(t.querySelector('b')?.textContent); }).observe(document.getElementById('toast'), { childList: true }); });
  await p.click('#campRun');
  await p.waitForTimeout(300);
  check('no popup while the robot is still playing', !(await p.$eval('#toast', t => !t.hidden)));
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 });
  await p.waitForFunction(() => !document.getElementById('toast').hidden, null, { timeout: 3000 });
  const top = await p.$eval('#toast', t => { const r = t.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return t.contains(e) || [e?.id, e?.className, r.x, r.y, r.width, r.height, getComputedStyle(t).display].join(); });
  check('the popup sits on top, over the win card', top === true, String(top));
  await p.waitForFunction(() => document.getElementById('toast').hidden, null, { timeout: 6000 });
  const seen = await p.evaluate(() => window.__toasts);
  check('beating Level 3 pops First berry, then once that the stars cover a look (registers 627, 958)', seen[0] === 'First berry' && seen.at(-1) === 'New look', JSON.stringify(seen));

  // The dots: both buttons have one, each cleared by opening its page.
  await p.evaluate(() => document.getElementById('winBox').open && document.getElementById('winBox').close());
  await p.evaluate(async () => (await import('/src/app/nav.js')).go('menu')); await p.waitForTimeout(400);
  check('a done achievement not yet seen puts a dot on Achievements', await dot('menuAchieve'));
  check('a look the stars now cover puts a dot on Looks (register 628)', await dot('menuLooks'));
  await p.click('#menuAchieve'); await p.waitForTimeout(300);
  check('the new one has a gold rim and says where it was done', await p.$eval('#achList [data-achievement=first]', l => l.classList.contains('done') && l.classList.contains('new')));
  await p.click('#achMenu'); await p.waitForTimeout(300);
  check('opening Achievements clears its dot', !(await dot('menuAchieve')));
  await p.click('#menuLooks'); await p.waitForTimeout(300); await p.click('#lookMenu'); await p.waitForTimeout(300);
  check('opening Looks clears its dot (register 640)', !(await dot('menuLooks')));

  // The note about looks comes once ever; a tap on a popup opens its page.
  const before = await p.evaluate(() => window.__toasts.length);
  await p.evaluate(async () => { window.__toastMs = 200; (await import('/src/app/achieve.js')).noteEarned(new Set()); });
  await p.waitForTimeout(150);
  await p.waitForFunction(() => document.getElementById('toast').hidden, null, { timeout: 8000 });
  const again = await p.evaluate(n => window.__toasts.slice(n), before);
  check('a second note never says it again', again.length > 0 && !again.includes('New look'), JSON.stringify(again));
  await p.evaluate(async () => { window.__toastMs = 5000; (await import('/src/app/achieve.js')).noteEarned(new Set()); });
  await p.waitForFunction(() => !document.getElementById('toast').hidden, null, { timeout: 3000 });
  await p.click('#toast'); await p.waitForTimeout(400);
  check('a tap on the popup opens Achievements', (await p.evaluate(() => location.hash)) === '#/achievements' && !(await p.$eval('#toast', t => !t.hidden)));

  // A Run records what it did (registers 632, 641): the berry one move away on Level 1 is kept as a count, not One shot.
  await p.evaluate(async () => { const { builders } = await import('/src/campaign/progression.js'); (await import('/src/app/nav.js')).go('level', builders()[0].id); });
  await p.waitForTimeout(600);
  await p.evaluate(() => { const l = window.wee.blank(5, 5); l.start = { x: 0, y: 0 }; for (const k of Object.keys(l.powers)) l.powers[k] = false; l.cells[4] = 'goal'; window.wee.loadLevel(l); });
  await p.click('#campRun');
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 });
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('wee.campaign')));
  check('a Run on Level 1 reaching the berry in 1 move is not One shot', !('oneshot' in (saved.feats || {})), JSON.stringify(saved.feats));
  check('the win before it kept its count toward Move it move it', saved.peak && saved.peak.moveit > 1, JSON.stringify(saved.peak));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the achievements smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
