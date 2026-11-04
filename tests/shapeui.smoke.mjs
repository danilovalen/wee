// The Shape tools in the room-size popover (registers 693, 694): each searches, says what it found, and
// changes the room only on Apply; Cancel leaves it as it was.
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
const said = () => page.waitForFunction(() => { const t = document.getElementById('shapeSay').textContent; return t && !t.endsWith('...'); }, null, { timeout: 30000 }).then(() => page.textContent('#shapeSay'));
try {
  await page.goto('http://localhost:5281/?sandbox=full');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  // Trim: the bottom row is never used, so it goes; the room still solves in one move.
  const spare = room(['#####', '#P.G#', '#...#', '#####'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), spare);
  await page.click('#sizeBtn');
  await page.click('#trimBtn');
  const t = await said();
  check('Trim says what it would cut, and changes nothing yet', /^Trimmed to \d+x\d+, it plays the same\.$/.test(t) && (await level()).h === 4 && await page.locator('#shapeYes').isVisible(), t);
  await page.click('#shapeYes');
  check('Apply trims the room', (await level()).h < 4, JSON.stringify([(await level()).w, (await level()).h]));
  await page.keyboard.press('Control+z');
  check('and Undo puts it back', (await level()).h === 4);
  // Place one: a wall in the lane makes the way round longer.
  const lane = room(['#######', '#.....#', '#P...G#', '#######'], { powers: OFF });
  await page.evaluate(l => window.wee.loadLevel(l), lane);
  await pickTool(page, 'wall');
  if (await page.locator('#sizePop').isHidden()) await page.click('#sizeBtn');
  await page.click('#placeBtn');
  const p = await said();
  const m = p.match(/^A block at (\d+), (\d+) makes it (\d+) moves instead of 1\.$/);
  // Every tile tried by hand: the offered one is the longest any single block makes.
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
  check('Place one names the tile and the longer count, the longest any tile gives (register 694)', !!m && +m[3] > 1 && +m[3] === longest, p + ' / ' + longest);
  await page.click('#shapeNo');
  check('Cancel leaves the room as it was', JSON.stringify((await level()).cells) === JSON.stringify(lane.cells) && await page.locator('#shapeAsk').isHidden());
  await page.click('#placeBtn'); await said(); await page.click('#shapeYes');
  check('Apply places it there', m && (await level()).cells[+m[2] * lane.w + +m[1]] === 'wall');
  // Remove one: taking that wall out shortens it, and nothing else lengthens it.
  await page.click('#removeBtn');
  const r = await said();
  check('Remove one says when nothing makes it longer', r === 'Taking nothing out makes it longer.', r);
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the shape smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
