// A challenge in the game (register 562): only its open tiles take pieces, the room cannot be resized, the
// tools row offers only its given pieces, and placing the solution wins on Run.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { measure } from '../tools/challenge.mjs';
import { measureRemoval } from '../tools/challenge.mjs';
import { readFileSync } from 'node:fs';

const { check, done } = suite('challenge');
const PORT = 5267;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ALL = JSON.parse(readFileSync('campaign/challenges.json', 'utf8')), ch = ALL.find(c => c.id === process.env.CHALLENGE) || ALL.find(c => !c.remove);  // whichever challenge comes first: nothing here depends on its content (register 581)
const win = measure(ch).wins[0].rows;
const TOOL = { '#': 'wall', B: 'box', t: 'toggle', '>': 'gate', '<': 'gate', '^': 'gate', v: 'gate' };
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 735 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; window.__noWinCard = true; });
  await p.goto(`http://localhost:${PORT}/index.html#/level/${ch.id}`); await p.waitForTimeout(1200);
  check('the tools row offers only the given pieces', JSON.stringify(await p.$$eval('#palette [data-tool]', bs => bs.filter(b => b.offsetParent).map(b => b.dataset.tool).sort())) === JSON.stringify([...new Set(ch.pieces.map(c => TOOL[c]))].sort()), 'tools');
  // Every icon sits in the middle of its button (rows 568, 574: reset's sat on its left edge); one with a word beside it (Test, 645) does not.
  const off = await p.$$eval('button', bs => bs.filter(b => b.offsetParent && b.querySelector(':scope > svg.glyph') && getComputedStyle(b, '::after').content === 'none').map(b => { const a = b.getBoundingClientRect(), g = b.querySelector(':scope > svg.glyph').getBoundingClientRect(); return [b.id || b.dataset.tool, Math.abs((g.left - a.left) - (a.right - g.right)), Math.abs((g.top - a.top) - (a.bottom - g.bottom))]; }).filter(([, dx, dy]) => dx > 2 || dy > 2));
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
  const counts = await p.$$eval('#campBrief .campPieces .campKind', ks => ks.map(k => [k.querySelector('.campCount').textContent, k.querySelectorAll('.campIcon').length]));
  check('each kind says how many, 1x included (register 761)', counts.length > 0 && counts.every(([t, n]) => t === `${n}×`), JSON.stringify(counts));
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
  // Register 794: a block placed beside the room's own block joins it as one mass, no seam between them.
  const seam = await p.evaluate(async () => {
    const { drawEdit } = await import('/src/view/scene.js'), { T } = await import('/src/view/ink.js'), { emptyLevel } = await import('/src/level/format.js');
    const l = emptyLevel(3, 3); l.start = null; l.cells[3] = 'wall'; l.cells[4] = 'wall';
    const c = document.createElement('canvas'); c.width = 3 * T; c.height = 3 * T; const g = c.getContext('2d');
    drawEdit(g, l, null, [], 0, { open: [[1, 1]] });
    const px = (x, y) => [...g.getImageData(Math.round(x), Math.round(y), 1, 1).data].slice(0, 3).join();
    return { seam: px(T - 1.5, T * 1.5), face: px(T * 0.5, T * 1.5) };
  });
  check('a placed block beside the room\'s own block joins it, no seam (register 794)', seam.seam === seam.face, JSON.stringify(seam));
  check('a placed piece fades on the card', (await shown()).every(x => x.endsWith('-used')), JSON.stringify(await shown()));
  await p.tap('#campRun');
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 }); await p.waitForTimeout(300);
  check('placing the solution wins on Run', /^won in/.test(await p.locator('#campLast').getAttribute('data-said')), await p.locator('#campLast').getAttribute('data-said'));
  // Register 575: a won challenge shows its star on the level list.
  await p.evaluate(() => { location.hash = '#/levels'; }); await p.waitForTimeout(600);
  check('the level list shows the challenge beaten', await p.$eval(`[data-level="${ch.id}"] .campStar.main`, s => s.classList.contains('on')));
  // Registers 786, 787: a challenge slot shows its two challenges side by side, each half as wide.
  const pairs = await p.$$eval('#campList li.side.pair', ls => ls.map(l => { const bs = [...l.querySelectorAll('.campRow')], w = l.getBoundingClientRect().width; return { n: bs.length, half: bs.every(b => b.getBoundingClientRect().width < w * 0.55), ids: bs.map(b => b.dataset.level) }; }));
  check('each challenge slot shows its placing and removal challenges side by side, each half as wide (register 786)', pairs.length === ALL.filter(c => !c.remove).filter((c, i) => !c.waiting && !ALL.filter(r => r.remove)[i].waiting).length && pairs.every(q => q.n === 2 && q.half && /^c/.test(q.ids[0]) && /^r/.test(q.ids[1])), JSON.stringify(pairs.slice(0, 2)));
  // A removal challenge: the card says how many to take out; taking out the right pieces wins on Run.
  const rm = ALL.find(c => c.remove), out = measureRemoval(rm).wins[0].tiles;
  await p.goto(`http://localhost:${PORT}/index.html#/level/${rm.id}`); await p.waitForTimeout(1200);
  const rcounts = await p.$$eval('#campBrief .campPieces.out .campKind', ks => ks.map(k => [k.querySelector('.campCount').textContent, k.querySelectorAll('.campIcon').length]));
  check('a removal challenge\'s card says how many of each kind to take out (register 787)', rcounts.length === Object.keys(rm.remove).length && rcounts.every(([t, n]) => t === `−${n}×`), JSON.stringify(rcounts));
  check('the room as given has its pieces in it', await p.evaluate(() => window.wee.getLevel().cells.filter(c => c === 'wall').length) >= Object.values(rm.remove).reduce((a, b) => a + b, 0));
  const rg = await p.locator('#game').boundingBox(), rt = rg.width / rm.rows[0].length;
  // Register 804: a removal level offers only Look and Erase, and refuses a piece placed anywhere, by key or not.
  const tools = await p.$$eval('[data-tool]', bs => [...new Set(bs.filter(b => b.offsetParent).map(b => b.dataset.tool))].sort().join());
  check('a removal level offers only Look and Erase (register 804)', tools === 'erase,look', tools);
  const free = (() => { for (let y = 0; y < rm.rows.length; y++) for (let x = 0; x < rm.rows[0].length; x++) if (rm.rows[y][x] === '.') return [x, y]; })();
  const walls0 = await p.evaluate(() => window.wee.getLevel().cells.filter(c => c === 'wall').length);
  await p.evaluate(async () => { const { S } = await import('/src/editor/state.js'); S.ui.tool = 'wall'; });
  await p.mouse.click(rg.x + rt * (free[0] + .5), rg.y + rt * (free[1] + .5)); await p.waitForTimeout(150);
  check('and a block tapped onto an empty tile is refused', await p.evaluate(() => window.wee.getLevel().cells.filter(c => c === 'wall').length) === walls0);
  await p.locator('[data-tool="erase"]:visible').click();
  for (const [x, y] of out) { await p.mouse.click(rg.x + rt * (x + .5), rg.y + rt * (y + .5)); await p.waitForTimeout(150); }
  check('each piece taken out is crossed off on the card', (await p.$$eval('#campBrief .campPieces.out .campIcon', cs => cs.every(c => c.classList.contains('used')))), JSON.stringify(await p.$$eval('#campBrief .campPieces.out .campIcon', cs => cs.map(c => c.className))));
  await p.tap('#campRun');
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 }); await p.waitForTimeout(300);
  check('taking out the right pieces wins on Run', /^won in/.test(await p.locator('#campLast').getAttribute('data-said')), await p.locator('#campLast').getAttribute('data-said'));
  // A room saved before the challenge was rebuilt does not come back over the new one.
  const stale = await p.evaluate(async id => {
    const { progress, write } = await import('/src/app/progress.js'), { CHALLENGES } = await import('/src/level/challenges.js');
    const def = CHALLENGES.find(c => c.id === id), room = structuredClone(def.room), open = new Set(def.challenge.open.map(([x, y]) => y * room.w + x));
    const i = room.cells.findIndex((c, k) => !c && !open.has(k) && !(room.start && room.start.y * room.w + room.start.x === k));
    room.cells[i] = 'wall'; const pr = progress(); (pr.levels[id] ||= {}).room = room; write(pr);
    location.hash = '#/levels'; await new Promise(r => setTimeout(r, 400)); location.hash = '#/level/' + id; await new Promise(r => setTimeout(r, 800));
    return { i, now: window.wee.getLevel().cells[i] };
  }, ch.id);
  check('a room saved before a challenge was rebuilt does not reopen over the new one', stale.now === '', JSON.stringify(stale));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the challenge smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
