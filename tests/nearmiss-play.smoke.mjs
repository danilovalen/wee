// A room the blob cannot win (register 642): it still tries, plays the attempt that ends nearest the
// berry, and fails there: a stop bumps toward the berry and the cause flashes; spikes kill it on screen.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('nearmiss-play');
const PORT = 5277;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; window.__noWinCard = true; });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(600);
  const play = async (id, cells) => {
    await p.evaluate(async id => (await import('/src/app/nav.js')).go('level', id), id); await p.waitForTimeout(500);
    await p.evaluate(cells => {
      const l = window.wee.blank(7, 7); l.start = { x: 0, y: 0 }; for (const k of Object.keys(l.powers)) l.powers[k] = false;
      for (let x = 0; x < 7; x++) l.cells[7 + x] = 'wall';  // a one-row corridor
      for (const [i, c] of Object.entries(cells)) l.cells[+i] = c;
      window.wee.loadLevel(l);
    }, cells);
    // Every effect is noted as it is pushed, so a short one is never missed between two polls on a busy machine.
    await p.evaluate(async () => {
      window.__fx = new Set(); clearInterval(window.__fxTimer);
      const { S } = await import('/src/editor/state.js');
      const wrap = a => { if (!a.__noted) { const push = a.push.bind(a); a.push = (...x) => { for (const f of x) window.__fx.add(f.type); return push(...x); }; a.__noted = true; } return a; };
      if (!window.__fxHooked) { let arr = wrap(S.fx); Object.defineProperty(S, 'fx', { configurable: true, get: () => arr, set: v => { arr = wrap(v); } }); window.__fxHooked = true; }
      window.__fxTimer = setInterval(() => { if (window.wee.demoRunning()) window.__fx.add('running'); }, 16);
    });
    await p.click('#campRun');
    await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 });
    await p.waitForTimeout(100);
    const fx = await p.evaluate(() => [...window.__fx]);
    return { ran: fx.includes('running'), fx };
  };
  // A red door with nothing red to open it, between the blob and the berry.
  const door = await play('2', { 4: 'door:red', 5: 'goal', 6: 'wall' });
  check('a door that never opens: the blob tries instead of refusing', door.ran);
  check('it bumps toward the berry, and no tile flashes to point at the cause (register 795)', door.fx.includes('bump') && !door.fx.includes('flash'), JSON.stringify(door.fx));
  check('the sentence says only that the berry cannot be reached', (await p.textContent('#campVerdictText')) === 'The blob cannot reach the berry.', await p.textContent('#campVerdictText'));
  // Bare spikes in the only way to the berry: the blob runs into them.
  const spikes = await play('21', { 3: 'death', 5: 'goal', 6: 'wall' });
  check('spikes in the way: the blob runs into them and dies on screen', spikes.ran && spikes.fx.includes('die') && !spikes.fx.includes('bump'), JSON.stringify(spikes.fx));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the near-miss smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
