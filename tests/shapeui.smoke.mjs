// The Shape helpers (registers 693, 694, 698, 700): after Check the design notes offer Trim and Remove one,
// each with Apply; Best spot sits with the tool's options. Nothing changes until Apply, and the size in the
// status bar is a plain readout (704, 707).
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite, pickTool } from './lib.mjs';

const { check, done } = suite('shapeui');
const server = await serve(5281);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const OFF = { boomerang: false, dive: false, laser: false, cycle: false };
const level = () => page.evaluate(() => window.wee.getLevel());
const notes = () => page.waitForFunction(() => /Trim to|Every row and column/.test(document.getElementById('designList').textContent) && /Without the |Removing any one/.test(document.getElementById('designList').textContent), null, { timeout: 60000 }).then(() => page.textContent('#designList'));
const hint = () => page.waitForFunction(() => { const t = document.getElementById('placeHint').textContent; return t && !t.endsWith('...') && !/^(Click|Tap) to place/.test(t); }, null, { timeout: 30000 }).then(() => page.textContent('#placeHint'));
try {
  await page.goto('http://localhost:5281/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  // Trim: the bottom row is never used, so the notes offer to cut it; Apply does, and Undo puts it back.
  const spare = room(['#####', '#P.G#', '#...#', '#####'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), spare);
  await page.click('#checkBtn');
  const n = await notes();
  check('after Check the notes offer a trim, said plainly (registers 698, 700)', /Trim to \d+x\d+: it plays the same\./.test(n) && (await level()).h === 4, n);
  await page.click('#designList li:has-text("Trim to") .apply');
  check('Apply trims the room', (await level()).h < 4, JSON.stringify([(await level()).w, (await level()).h]));
  await page.click('#undo');
  check('and Undo puts it back', (await level()).h === 4);
  // Best spot: a block in the lane makes the way round longer; it is the longest any tile gives.
  const lane = room(['#######', '#.....#', '#P...G#', '#######'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), lane);
  await pickTool(page, 'wall');
  check('Best spot sits with the tool\'s options', await page.locator('#placeBtn').isVisible());
  await page.click('#placeBtn');
  const p = await hint();
  const m = p.match(/^A block at (\d+), (\d+) makes it (\d+) moves instead of 1\.$/);
  const longest = await page.evaluate(async l => {
    const { search } = await import('/src/solve/solve.js'), { place } = await import('/src/editor/edit.js');
    let best = 0;
    for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
      const c = JSON.parse(JSON.stringify(l));
      if (c.cells[y * l.w + x] || (c.start.x === x && c.start.y === y) || !place(c, { tool: 'wall' }, x, y, 'place').length) continue;
      const it = search(c, 5000); let r; while (!(r = it.next()).done); if (r.value.status === 'solved') best = Math.max(best, r.value.moves.length);
    }
    return best;
  }, lane);
  check('Best spot names the tile and the longer count, the longest any tile gives (register 694)', !!m && +m[3] > 1 && +m[3] === longest, p + ' / ' + longest);
  await page.click('#shapeNo');
  check('Cancel leaves the room as it was', JSON.stringify((await level()).cells) === JSON.stringify(lane.cells) && await page.locator('#shapeAsk').isHidden() && await page.locator('#placeBtn').isVisible());
  await page.click('#placeBtn'); await hint(); await page.click('#shapeYes');
  check('Apply places it there', m && (await level()).cells[+m[2] * lane.w + +m[1]] === 'wall');
  // Remove one: in the notes; taking that block out shortens it, and nothing else lengthens it.
  await page.click('#checkBtn');
  const r = await notes();
  check('Remove one, in the notes, says when nothing makes it longer', /Removing any one piece or tile does not make it longer\./.test(r), r);
  check('the size is a plain readout', await page.$eval('#sizeBtn', e => e.tagName === 'SPAN'));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the shape smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
