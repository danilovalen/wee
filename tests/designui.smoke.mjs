// Design notes on the real page: after Check, what each power and piece does, the routes,
// and on the Stops map, red dots where the goal is out of reach for good.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { suite, pickTool } from './lib.mjs';
import { runMetrics } from '../src/solve/metrics.js';
import { metricLines } from '../src/app/metricLines.js';

const { check, done } = suite('design-ui');
const server = await serve(5189);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const first = JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8'));
const notes = () => page.textContent('#designList');
try {
  await page.goto('http://localhost:5189/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  await page.evaluate(l => window.wee.loadLevel(l), first);
  await page.click('#checkBtn');
  await page.waitForFunction(() => !!document.getElementById('designBox').dataset.done, null, { timeout: 60000 });
  const n = await notes();
  check('a power the room needs says what it saves', n.includes('Turn off Boomerang and the answer takes 19 moves instead of 9.'), n);
  check('the powers that change nothing are named together', n.includes('Turn off Dive, Laser, Cycle and the answer stays the same.'), n);
  // The room's metrics (register 650): ruin, first ruin, places, choices, forced steps, ways to win.
  const want = metricLines(runMetrics(first)).map(l => typeof l === 'string' ? l : l.text);
  const nums = await page.$$eval('#designList .nums > div', ds => Object.fromEntries(ds.map(d => [d.dataset.num, d.querySelector('b').textContent])));
  check('the four numbers the owner reads come first among the measures: moves, routes, traps, reuse (register 730)', nums.moves === '9' && nums.routes === '2' && nums.traps === '103' && /^\d+×$/.test(nums.reuse), JSON.stringify(nums));
  check('the other measures wait behind one tap', await page.$$eval('#designList .metric', ls => ls.every(l => !l.offsetParent)));
  await page.click('#moreMeasures');
  check('the room\'s metrics are in the notes, as measured', await page.$$eval('#designList .metric', ls => ls.every(l => !!l.offsetParent)) && want.length >= 8 && want.every(t => n.includes(t)), JSON.stringify(want.filter(t => !n.includes(t))));
  check('a piece a plain wall could replace is named', n.includes('Swap these for a block and the answer stays the same: box at 3, 1.'), n);
  // A mark explains itself where it is (diagnosis 5): Look on that box says what the notes say.
  check('a checked room says Checked on its button', (await page.textContent('#checkBtn')).trim() === 'Checked', await page.textContent('#checkBtn'));
  await pickTool(page, 'look');
  { const b = await page.locator('#game').boundingBox(), lv = await page.evaluate(() => window.wee.getLevel());
    await page.mouse.click(b.x + 3.5 * b.width / lv.w, b.y + 1.5 * b.height / lv.h); }
  check('Look on a piece a wall could replace says so on the spot', (await page.textContent('#placeHint')).includes('a plain block here would do the same job'), await page.textContent('#placeHint'));
  check('walls the answer does not need are named, each one tested alone (register 686)', /Take out these walls and the answer stays the same: \d+, \d+/.test(n), n);
  // The status bar counts the six notes.
  const col = await page.evaluate(() => { const w = document.getElementById('well').getBoundingClientRect(), r = document.getElementById('roomArea').getBoundingClientRect(); return { right: w.left >= r.right - 1, tall: w.height > 300 }; });
  check('on a wide screen the notes sit in a column right of the room, never over it (register 730)', await page.locator('#designList').isVisible() && col.right && col.tall, JSON.stringify(col));
  check('the notes do not fold', !(await page.$('#well details')));
  await page.waitForTimeout(100);
  check('pieces the answer does not need but that change where you get stuck are named as such (register 692)', /Take these out and the answer stays the same, but where you can get stuck changes: \w/.test(n), n);
  const notesN = await page.$$eval('#designList li:not(.working):not(.metric):not(.nums):not(.more)', ls => ls.length) + await page.$$eval('#lintBox:not([hidden]) #lintList li', ls => ls.length);
  check('the status bar counts the notes', (await page.textContent('#wellBtn')) === `Findings ${notesN}` && notesN >= 6, await page.textContent('#wellBtn'));

  await page.click('[data-lens-icon=stops]'); await page.click('[data-lens-icon=traps]');
  await page.waitForFunction(() => /Frames: \d+/.test(document.getElementById('lensLegend').textContent), null, { timeout: 30000 });
  check('the Traps lens counts its traps', (await page.textContent('#lensLegend')).includes('Frames: 3 tiles where the goal is out of reach for good.'), await page.textContent('#lensLegend'));
  const pixel = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round((x + 0.5) * t), Math.round((y + 0.5) * t), 1, 1).data]; }, [x, y]);
  // The frame's 2-unit stroke, read at its greenest-free pixel across its width, so the canvas scale cannot land the probe on its blended rim.
  const edge = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w, px = [];
    for (let u = 1; u <= 3; u += 0.25) px.push([...c.getContext('2d').getImageData(Math.floor(x * t + u * t / 32), Math.round((y + 0.5) * t), 1, 1).data]);
    return px.reduce((m, p) => (p[0] - p[1] > m[0] - m[1] ? p : m)); }, [x, y]);
  // Read once the drawing has settled, and judge the same pixels the message prints.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  const seen = [await edge(2, 8), await pixel(1, 1), await edge(1, 1)], [[r, gr], [, g2, b2], [r3, g3]] = seen;
  check('a trap is framed red, a stop that can still win is the usual dot with no frame', r > 150 && r - gr > 100 && b2 > 200 && b2 - g2 > 50 && r3 - g3 < 40, JSON.stringify(seen));
  await page.click('[data-lens-icon=stops]'); await page.click('[data-lens-icon=traps]');

  // A box where nothing ever needs it: named in the notes, and framed on the map.
  const extra = { ...first, entities: [...first.entities, { kind: 'box', x: 4, y: 6, dir: 1, mode: 'input' }] };
  await page.evaluate(l => window.wee.loadLevel(l), extra);
  await page.click('#checkBtn');
  await page.waitForFunction(() => !document.getElementById('designBox').classList.contains('stale') && !!document.getElementById('designBox').dataset.done, null, { timeout: 60000 });
  check('a piece the answer does not depend on is named', (await notes()).includes('Take these out and the answer stays the same: box at 4, 6.'), await notes());
  const red = await page.waitForFunction(() => { const c = document.getElementById('game'), g = c.getContext('2d'), k = c.width / window.wee.getLevel().w; for (let v = 2; v < 30; v += 2) { const d = g.getImageData(Math.round(4 * k + 3 * k / 32), Math.round(6 * k + v * k / 32), 1, 1).data; if (d[0] > 200 && d[1] < 120) return true; } return false; }, null, { timeout: 3000 }).then(() => true, () => false);
  check('and framed in red on the map', red);
  // Any edit makes the notes stale: they stay, dimmed, and their marks leave the room.
  await pickTool(page, 'wall').catch(() => {});
  const box = await page.locator('#game').boundingBox(), lv = await page.evaluate(() => window.wee.getLevel());
  await page.mouse.click(box.x + 4.5 * box.width / lv.w, box.y + 3.5 * box.height / lv.h);
  check('an edit dims the notes instead of removing them', await page.locator('#designBox').isVisible() && await page.$eval('#designBox', e => e.classList.contains('stale')));
  // Then the room is solved again by itself, without the design notes.
  const live = await page.waitForFunction(() => /^(Solvable in \d+|No solution|Too big)/.test(document.getElementById('checkText').textContent), null, { timeout: 5000 }).then(() => true, () => false);
  check('after an edit the room is solved again by itself', live, await page.textContent('#checkText'));
  check('and the live check leaves the design notes to Check: still dimmed', await page.$eval('#designBox', e => e.classList.contains('stale')));
  check('no page errors', !errors.length, errors.join(' | '));
  // A Check with no win says why Findings is empty, rather than asking for a Check (register 774).
  { const keep = await page.evaluate(() => window.wee.getLevel());
    await page.evaluate(l => window.wee.loadLevel(l), { ...keep, cells: keep.cells.map(c => c === 'goal' ? 'wall' : c) });
    await page.waitForTimeout(500); await page.click('#checkBtn');
    await page.waitForFunction(() => document.getElementById('checkBtn').textContent === 'Checked', null, { timeout: 30000 });
    const why = await page.textContent('#wellEmpty');
    check('a Check that finds no win says why there are no notes (register 774)', !/press Check/.test(why) && /berry/.test(why), why);
  }
} catch (err) { check('the design smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
