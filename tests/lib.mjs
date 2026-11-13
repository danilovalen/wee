import { emptyLevel } from '../src/level/format.js';
import { CELL, PIECE, LASER, pushableLaser } from '../tools/legend.mjs';

// A room drawn in text, in the one legend (tools/legend.mjs). Pieces and lasers are 'input' unless
// opts.mode says 'realtime'.
export function room(rows, opts = {}) {
  const h = rows.length, w = rows[0].length;
  const l = emptyLevel(w, h);
  l.clock = opts.clock || 'tile';
  if (opts.powers) l.powers = { ...l.powers, ...opts.powers };
  // opts.crates: [[x, y], ...], tiles made pushable (register 336).
  if (opts.crates) l.crates = opts.crates.map(([x, y]) => ({ x, y }));
  const mode = opts.mode || 'input';
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const i = y * w + x;
    if (ch === '.') return;
    if (ch === 'P') l.start = { x, y };
    else if (CELL[ch]) l.cells[i] = CELL[ch];
    else if (PIECE[ch]) l.entities.push({ ...PIECE[ch], x, y, dir: 1, mode });
    else if (LASER[ch]) l.entities.push({ kind: 'turret', x, y, ...(pushableLaser(ch) ? { crate: true } : {}), turret: { dirs: [LASER[ch]], mode } });
    else throw new Error('Unknown map character: ' + ch);
  }));
  return l;
}

// Every gate ends on one "N/N passed" line; the runner treats a missing total as red.
export { suite } from './suite.mjs';

// Picks a tool as a person would (register 381): its button where it shows, else in a Sandbox its
// group's slot, then the slot's flyout (a right click opens it), or the slot alone when it is the only tool.
export async function pickTool(page, t) {
  const b = page.locator(`#palette [data-tool="${t}"], #campTools [data-tool="${t}"]`).first();
  if (await b.isVisible()) return b.click();
  const g = await page.evaluate(async t => (await import('/src/editor/palette.js')).stripOf(t)[0], t);
  const slot = page.locator(`#strip [data-slot="${g}"]`);
  await slot.click({ button: 'right' });
  if (await b.isVisible()) return b.click();
  await slot.click();
}

// Drags a room grip n tiles out (n > 0 adds lines) or in (n < 0 cuts them), as a finger would (register 540).
export async function dragGrip(page, side, n) {
  const g = await page.locator(`[data-grip="${side}"]`).boundingBox(), lv = await page.evaluate(() => window.wee.getLevel().w), room = await page.locator('#game').boundingBox();
  const t = room.width / lv, [ox, oy] = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[side];
  const x = g.x + g.width / 2, y = g.y + g.height / 2, dx = ox * n * t, dy = oy * n * t;
  await page.mouse.move(x, y); await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x + dx * i / 8, y + dy * i / 8); await page.waitForTimeout(15); }
  await page.mouse.up(); await page.waitForTimeout(120);
}
// Sound, the player, dev mode and progress live in Options (registers 960, 963): open it, then tap.
export async function opt(page, id) {
  await page.evaluate(() => { const d = document.getElementById('optionsBox'); if (!d.open) d.showModal(); });
  await page.click('#' + id);
}
