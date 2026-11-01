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
const ch = JSON.parse(readFileSync('campaign/challenges.json', 'utf8')).find(c => c.pieces.includes('>'));
const win = measure(ch).wins[0].rows;
const TOOL = { '#': 'wall', '>': 'gate', '<': 'gate', '^': 'gate', v: 'gate' };
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 735 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__noWinCard = true; });
  await p.goto(`http://localhost:${PORT}/index.html#/level/${ch.id}`); await p.waitForTimeout(1200);
  check('the tools row offers only the given pieces', JSON.stringify(await p.$$eval('#palette [data-tool]', bs => bs.filter(b => b.offsetParent).map(b => b.dataset.tool))) === '["wall","gate"]');
  check('the room cannot be resized', await p.locator('[data-grip]').first().isHidden());
  const g = await p.locator('#game').boundingBox(), t = g.width / ch.rows[0].length, tap = (x, y) => p.mouse.click(g.x + t * (x + .5), g.y + t * (y + .5));
  const fy = ch.rows.findIndex(r => r.includes('.')), fx = ch.rows[fy].indexOf('.'), fi = fy * ch.rows[0].length + fx;
  await p.click('[data-tool="wall"]'); await tap(fx, fy); await p.waitForTimeout(150);
  check('a fixed tile refuses a piece', await p.evaluate(i => window.wee.getLevel().cells[i] === '', fi));
  const reqs = await p.$$eval('#campBrief .campMust [data-req]', rs => rs.map(r => r.dataset.req));
  check('the card asks for the star and no move count', reqs[0] === 'star' && !reqs.includes('steps'), JSON.stringify(reqs));
  // The solution, placed tile by tile; a one-way goes down pointing right and turns a quarter per tap.
  const turns = { '>': 0, v: 1, '<': 2, '^': 3 };
  for (let y = 0; y < win.length; y++) for (let x = 0; x < win[y].length; x++) {
    const c = win[y][x]; if (!(c in TOOL) || ch.rows[y][x] !== '+') continue;
    await p.click(`[data-tool="${TOOL[c]}"]`); await tap(x, y); await p.waitForTimeout(120);
    for (let k = 0; k < (turns[c] || 0); k++) { await tap(x, y); await p.waitForTimeout(500); }
  }
  await p.tap('#campRun');
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 }); await p.waitForTimeout(300);
  check('placing the solution wins on Run', /^won in/.test(await p.locator('#campLast').getAttribute('data-said')), await p.locator('#campLast').getAttribute('data-said'));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the challenge smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
