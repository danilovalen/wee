// Design notes on the real page: after Check, what each power and piece does, the routes,
// and on the Stops map, red dots where the goal is out of reach for good.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('design-ui');
const server = await serve(5189);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const first = JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8'));
const notes = () => page.textContent('#designList');
try {
  await page.goto('http://localhost:5189/');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(l => window.wee.loadLevel(l), first);
  await page.click('#checkBtn');
  await page.waitForFunction(() => /changes the answer|nothing changes/.test(document.getElementById('designList').textContent), null, { timeout: 60000 });
  const n = await notes();
  check('a power the room needs says what it saves', n.includes('Without Boomerang: 19 moves instead of 9.'), n);
  check('the powers that change nothing are named together', n.includes('Without Dive, Laser, Cycle: no change.'), n);
  check('routes and dead ends are counted', n.includes('2 shortest routes.') && n.includes('103 of 186 positions can no longer reach the goal.'), n);
  check('a room where everything matters says so', n.includes('Each piece and tile changes the answer.'), n);

  await page.click('#stopsBtn');
  await page.waitForFunction(() => /Red: \d+/.test(document.getElementById('placeHint').textContent), null, { timeout: 30000 });
  check('the stop map counts its traps', (await page.textContent('#placeHint')).includes('Red: 3 where the goal is out of reach for good.'), await page.textContent('#placeHint'));
  const pixel = (x, y) => page.evaluate(([x, y]) => { const c = document.getElementById('game'), t = c.width / window.wee.getLevel().w; return [...c.getContext('2d').getImageData(Math.round((x + 0.5) * t), Math.round((y + 0.5) * t), 1, 1).data]; }, [x, y]);
  const [r, gr] = await pixel(2, 8), [r2, g2, b2] = await pixel(1, 1);
  check('a trap is a red dot, a stop that can still win is the usual dot', r > 200 && gr < 120 && g2 > 150 && b2 > 150, JSON.stringify([await pixel(2, 8), await pixel(1, 1)]));
  await page.click('#stopsBtn');

  // A box where nothing ever needs it: named in the notes, and framed on the map.
  const extra = { ...first, entities: [...first.entities, { kind: 'box', x: 4, y: 6, dir: 1, mode: 'input' }] };
  await page.evaluate(l => window.wee.loadLevel(l), extra);
  await page.click('#checkBtn');
  await page.waitForFunction(() => /changes the answer|nothing changes/.test(document.getElementById('designList').textContent), null, { timeout: 60000 });
  check('a piece the answer does not depend on is named', (await notes()).includes('Without these, nothing changes: box at 4, 6.'), await notes());
  const red = await page.evaluate(() => { const c = document.getElementById('game'), g = c.getContext('2d'), k = c.width / window.wee.getLevel().w; const d = g.getImageData(Math.round(4 * k + 3 * k / 32), Math.round(6 * k + k / 2), 2, 2).data; return d[0] > 200 && d[1] < 120; });
  check('and framed in red on the map', red);
  // Any edit makes the notes stale, and they go.
  await page.click('[data-tool=wall]').catch(() => {});
  const box = await page.locator('#game').boundingBox(), lv = await page.evaluate(() => window.wee.getLevel());
  await page.mouse.click(box.x + 4.5 * box.width / lv.w, box.y + 3.5 * box.height / lv.h);
  check('an edit clears the notes', await page.locator('#designBox').isHidden());
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the design smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
