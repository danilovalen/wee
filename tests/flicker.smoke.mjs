// Flicker: watched every frame through one edit and one Check, nothing in the status bar
// moves, the verdict never goes blank between two values, the design notes are swapped in
// once, and the Findings count changes at most once per Check.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite, pickTool } from './lib.mjs';

const { check, done } = suite('flicker');
const PORT = 5219;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const r = room(['##############', '#P...........#', '#..B..#..B...#', '#.#...B...#..#', '#....#....B..#', '#..B.....#...#', '#.....B......#', '##############']);
r.cells[6 * 14 + 11] = 'goal';

// Samples every frame for ms while act runs: where each status-bar control sits, the verdict,
// the Findings label, and how often the design list's children are replaced.
const watch = async (ms, act) => {
  await page.evaluate(ms => {
    const ids = ['wellBtn', 'sizeBtn', 'info', 'keys'], seen = { pos: {}, verdict: [], findings: [], swaps: 0, sheets: 0 };
    new MutationObserver(m => { if (m.some(x => x.type === 'childList')) seen.swaps++; }).observe(document.getElementById('designList'), { childList: true });
    // The phone's sheet panes belong to the sheet; nothing else may hide or show them.
    for (const id of ['sheetRoom', 'sheetPowers']) new MutationObserver(m => { seen.sheets += m.length; }).observe(document.getElementById(id), { attributes: true, attributeFilter: ['hidden'] });
    const t0 = performance.now();
    const sample = () => {
      for (const id of ids) { const e = document.getElementById(id); if (!e.getClientRects().length) continue; (seen.pos[id] ||= new Set()).add(Math.round(e.getBoundingClientRect().left)); }
      const v = document.getElementById('checkText').textContent; if (seen.verdict.at(-1) !== v) seen.verdict.push(v);
      const f = document.getElementById('wellBtn').textContent; if (seen.findings.at(-1) !== f) seen.findings.push(f);
    };
    sample();
    window.__seen = new Promise(res => { const tick = () => { sample(); performance.now() - t0 < ms ? requestAnimationFrame(tick) : res({ pos: Object.fromEntries(Object.entries(seen.pos).map(([k, v]) => [k, [...v]])), verdict: seen.verdict, findings: seen.findings, swaps: seen.swaps, sheets: seen.sheets }); }; tick(); });
  }, ms);
  await act();
  return page.evaluate(() => window.__seen);
};

try {
  await page.goto(`http://localhost:${PORT}/?sandbox`);
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  await page.evaluate(l => window.wee.loadLevel(l), r);
  await page.waitForFunction(() => /^Solvable/.test(document.getElementById('checkText').textContent));
  // Before any Check there is nothing to find: Findings greys out but keeps its place.
  check('with nothing to find, Findings is greyed out, not taken away', await page.locator('#wellBtn').isVisible() && await page.locator('#wellBtn').isDisabled());
  // A first Check, so there are notes and a Findings count to keep steady.
  await page.click('#checkBtn');
  await page.waitForFunction(() => !document.getElementById('designBox').classList.contains('stale') && !document.querySelector('#designList .working') && document.getElementById('designList').children.length > 1, null, { timeout: 20000 });
  await page.click('#wellClose');
  await page.waitForTimeout(300);

  // One edit: a wall placed with the mouse.
  await pickTool(page, 'wall');
  const box = await page.locator('#game').boundingBox(), lv = await page.evaluate(() => window.wee.getLevel());
  const e = await watch(1500, () => page.mouse.click(box.x + 12.5 * box.width / lv.w, box.y + 1.5 * box.height / lv.h));
  check('an edit moves nothing in the status bar', Object.values(e.pos).every(xs => xs.length === 1), JSON.stringify(e.pos));
  check('an edit never blanks the verdict', e.verdict.every(v => v.trim()) && e.verdict.length <= 2, JSON.stringify(e.verdict));
  check('an edit does not empty and refill the design notes', e.swaps === 0, String(e.swaps));
  check('nothing outside the well touches the sheet panes', e.sheets === 0, String(e.sheets));
  check('notes dimmed by the edit are not counted', (await page.textContent('#wellBtn')) === ((n => n ? `Findings ${n}` : 'Findings')(await page.$$eval('#lintBox:not([hidden]) #lintList li', ls => ls.length))), await page.textContent('#wellBtn'));
  check('the edit landed', (await page.evaluate(() => window.wee.getLevel().cells.filter(c => c === 'wall').length)) > lv.cells.filter(c => c === 'wall').length);

  // One Check of the edited room.
  await pickTool(page, 'look');
  await page.waitForFunction(() => !document.getElementById('checkText').classList.contains('stale'), null, { timeout: 10000 });
  const c = await watch(2500, () => page.click('#checkBtn'));
  check('a Check moves nothing in the status bar', Object.values(c.pos).every(xs => xs.length === 1), JSON.stringify(c.pos));
  check('a Check never blanks the verdict, and keeps the old one rather than saying Checking', c.verdict.every(v => v.trim() && !v.startsWith('Checking')), JSON.stringify(c.verdict));
  check('the design notes are swapped in once', c.swaps === 1, String(c.swaps));
  check('the Findings count changes at most once', c.findings.length <= 2, JSON.stringify(c.findings));
  check('nothing outside the well touches the sheet panes on Check either', c.sheets === 0, String(c.sheets));
  // The verdict's slot takes the free width: what follows it stays put whatever it says.
  const keep = await page.evaluate(() => { const t = document.getElementById('checkText'), was = t.textContent, at = () => ['info', 'keys'].map(id => Math.round(document.getElementById(id).getBoundingClientRect().left)).join(); t.textContent = 'x'; const a = at(); t.textContent = 'Too big to tell while editing. Press Check.'; const b = at(); t.textContent = was; return [a, b]; });
  check('a short or long verdict moves nothing after it', keep[0] === keep[1], JSON.stringify(keep));
  // Another room is another room: the old verdict and notes go, rather than dim.
  const old = await page.textContent('#checkText');
  await page.evaluate(l => window.wee.loadLevel(l), room(['#######', '#P....#', '#######']));
  await page.waitForTimeout(100);
  check('opening another room drops the old verdict and notes', (await page.textContent('#checkText')) !== old && await page.locator('#designBox').isHidden(), await page.textContent('#checkText'));
  // A long search says how far it got a few times a second, not every slice.
  const big = room(['####################', '#P.....B......B....#', '#..B.....#....B....#', '#....B......B......#', '#.#....B.....#..B..#', '#....#.....B.......#', '#..B.......B...B...#', '#......B.....#.....#', '#.B..#....B.....B..#', '#.........B.....B..#', '#....B.........#..B#', '####################']);
  big.cells[10 * 20 + 17] = 'goal'; big.cells[10 * 20 + 16] = 'wall'; big.cells[9 * 20 + 17] = 'wall';
  await page.evaluate(l => window.wee.loadLevel(l), big);
  const p = await watch(2000, () => page.click('#checkBtn'));
  const counts = p.verdict.filter(v => v.startsWith('Checking'));
  check('a long check rewrites its progress at most about four times a second', counts.length >= 2 && counts.length <= 10, `${counts.length} in 2 s`);
  // With a verdict already on screen, a long check keeps it (dimmed) instead of counting.
  const big2 = JSON.parse(JSON.stringify(big)); big2.cells[1 * 20 + 3] = 'wall';
  await page.evaluate(l => window.wee.loadLevel(l), big2);
  await page.evaluate(() => { const t = document.getElementById('checkText'); t.textContent = 'Stopped after 5000 positions without finding one.'; t.dataset.verdict = '1'; });
  const q = await watch(1000, () => page.click('#checkBtn'));
  check('a long check keeps the verdict on screen rather than counting over it', q.verdict.every(v => !v.startsWith('Checking')) && await page.$eval('#checkText', e => e.classList.contains('stale')), JSON.stringify(q.verdict.slice(0, 3)));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the flicker smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
