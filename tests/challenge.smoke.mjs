// A challenge in the game (register 562): only its open tiles take pieces, the room cannot be resized, the
// tools row offers only its given pieces, and placing the solution wins on Run.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { measure } from '../tools/challenge.mjs';
import { readFileSync } from 'node:fs';

const { check, done } = suite('challenge');
const PORT = 5267;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ALL = JSON.parse(readFileSync('campaign/challenges.json', 'utf8')), ch = ALL.find(c => c.id === process.env.CHALLENGE) || ALL[0];  // whichever challenge comes first: nothing here depends on its content (register 581)
const win = measure(ch).wins[0].rows;
const TOOL = { '#': 'wall', B: 'box', t: 'toggle', '>': 'gate', '<': 'gate', '^': 'gate', v: 'gate' };
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 735 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; window.__noWinCard = true; });
  await p.goto(`http://localhost:${PORT}/index.html#/level/${ch.id}`); await p.waitForTimeout(1200);
  check('the tools row offers only the given pieces', JSON.stringify(await p.$$eval('#palette [data-tool]', bs => bs.filter(b => b.offsetParent).map(b => b.dataset.tool).sort())) === JSON.stringify([...new Set(ch.pieces.map(c => TOOL[c]))].sort()), 'tools');
  // Every icon sits in the middle of its button (rows 568, 574: reset's sat on its left edge).
  const off = await p.$$eval('button', bs => bs.filter(b => b.offsetParent && b.querySelector(':scope > svg.glyph')).map(b => { const a = b.getBoundingClientRect(), g = b.querySelector(':scope > svg.glyph').getBoundingClientRect(); return [b.id || b.dataset.tool, Math.abs((g.left - a.left) - (a.right - g.right)), Math.abs((g.top - a.top) - (a.bottom - g.bottom))]; }).filter(([, dx, dy]) => dx > 2 || dy > 2));
  check('every icon is centred in its button', off.length === 0, JSON.stringify(off));
  check('the room cannot be resized', await p.locator('[data-grip]').first().isHidden());
  const g = await p.locator('#game').boundingBox(), t = g.width / ch.rows[0].length, tap = (x, y) => p.mouse.click(g.x + t * (x + .5), g.y + t * (y + .5));
  const fy = ch.rows.findIndex(r => r.includes('.')), fx = ch.rows[fy].indexOf('.'), fi = fy * ch.rows[0].length + fx;
  await p.click(`[data-tool="${TOOL[ch.pieces[0]]}"]`); await tap(fx, fy); await p.waitForTimeout(150);
  check('a fixed tile refuses a piece', await p.evaluate(i => window.wee.getLevel().cells[i] === '', fi));
  // The big star is the goal; the card writes no goal rows and shows the pieces to place (registers 566, 582).
  const reqs = await p.$$eval('#campBrief [data-req]', rs => rs.map(r => r.dataset.req));
  check('the card writes no goal rows for a challenge', reqs.length === 0, JSON.stringify(reqs));
  const shown = () => p.$$eval('#campBrief .campPieces .campIcon', cs => cs.map(c => c.dataset.part + (c.classList.contains('used') ? '-used' : '')));
  check('the card shows one icon per given piece', (await shown()).length === ch.pieces.length, JSON.stringify(await shown()));
  // The solution, placed tile by tile; a one-way goes down pointing right and turns a quarter per tap.
  const turns = { '>': 0, v: 1, '<': 2, '^': 3 };
  for (let y = 0; y < win.length; y++) for (let x = 0; x < win[y].length; x++) {
    const c = win[y][x]; if (!(c in TOOL) || ch.rows[y][x] !== '+') continue;
    await p.click(`[data-tool="${TOOL[c]}"]`); await tap(x, y); await p.waitForTimeout(120);
    for (let k = 0; k < (turns[c] || 0); k++) { await tap(x, y); await p.waitForTimeout(500); }
  }
  // A piece the player placed wears a solid purple frame (registers 565, 576), read off the painted canvas.
  const framed = await p.evaluate(([cells, cols]) => {
    const c = document.getElementById('game'), g = c.getContext('2d'), t = c.width / cols;
    return cells.map(([x, y]) => { const d = g.getImageData(Math.round(x * t + t / 2), Math.round(y * t + t * 0.04), 1, 1).data; return d[2] - d[1] > 60 && d[2] - d[0] > 40; });
  }, [ch.rows.flatMap((r, y) => [...r].map((c, x) => c === '+' && win[y][x] !== '.' ? [x, y] : null)).filter(Boolean), ch.rows[0].length]);
  check('each placed piece wears a purple frame', framed.length > 0 && framed.every(Boolean), JSON.stringify(framed));
  check('a placed piece fades on the card', (await shown()).every(x => x.endsWith('-used')), JSON.stringify(await shown()));
  await p.tap('#campRun');
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 }); await p.waitForTimeout(300);
  check('placing the solution wins on Run', /^won in/.test(await p.locator('#campLast').getAttribute('data-said')), await p.locator('#campLast').getAttribute('data-said'));
  // Register 575: a won challenge shows its star on the level list.
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(600);
  check('the level list shows the challenge beaten', await p.$eval(`[data-level="${ch.id}"] .campStar.main`, s => s.classList.contains('on')));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the challenge smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
