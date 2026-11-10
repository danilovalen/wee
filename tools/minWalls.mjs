// The fewest walls a winning room needs, per campaign level (register 836): from every known winning
// room, walls come out one at a time, in many random orders, while the room still wins the level.
// An upper bound, not a proof: a room built another way may need fewer.
// Usage: node tools/minWalls.mjs [--orders N] [--seed N] [level ...]
import { check, roomOf } from '../src/campaign/rules.js';
import { LEVELS } from '../src/level/campaign.js';
import { emptyLevel } from '../src/level/format.js';
import { CELL, PIECE, LASER, pushableLaser } from './legend.mjs';
import { roomsOf } from '../tests/knownRooms.mjs';
import { arg } from './levelDef.mjs';

// The same reading of a room's rows as the campaign tests use.
function build(def, rows) {
  const full = rows.length >= 2 && rows.every(r => r.length === rows[0].length && r.length >= 2);
  const r = full ? emptyLevel(rows[0].length, rows.length) : roomOf(def);
  r.powers = roomOf(def).powers; r.start = null; r.cells.fill('');
  const only = el => def.pushable && def.pushable[el] === 'only';
  let goal = false;
  rows.forEach((row, y) => [...row].forEach((c, x) => {
    const i = y * r.w + x, cell = CELL[c];
    if (c === 'P') r.start = { x, y };
    else if (cell) {
      r.cells[i] = cell.startsWith('gate:') && def.colours ? cell + '@' + def.colours[0] : cell;
      if (cell === 'goal') goal = true;
      const el = cell.startsWith('gate:') ? 'gate' : cell.startsWith('sensor:') ? 'relay' : cell.split(':')[0];
      if (['gate', 'door', 'idoor', 'relay'].includes(el) && only(el)) (r.crates ||= []).push({ x, y });
    } else if (PIECE[c]) r.entities.push({ ...PIECE[c], x, y, dir: 1, mode: 'input' });
    else if (LASER[c]) r.entities.push({ kind: 'turret', x, y, ...(pushableLaser(c) ? { crate: true } : {}), turret: { dirs: [LASER[c]], mode: 'input' } });
  }));
  if (!r.start) r.start = { x: 1, y: 1 };
  if (!goal) r.cells[(r.h - 2) * r.w + r.w - 2] = 'goal';
  return r;
}

const orders = +arg('--orders', 40), ids = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));
let n = +arg('--seed', 1);
const rnd = () => ((n = (n * 1103515245 + 12345) % 2147483648) / 2147483648);
const walls = r => r.cells.reduce((k, c) => k + (c === 'wall'), 0);
const out = [];
for (const def of LEVELS.filter(l => /^\d+$/.test(l.id) && (!ids.length || ids.includes(l.id))).sort((a, b) => a.id - b.id)) {
  let best = null;
  for (const rows of roomsOf(def.id)) {
    const start = build(def, rows);
    if (!check(def, start).won) continue;
    for (let o = 0; o < orders; o++) {
      const r = JSON.parse(JSON.stringify(start));
      const at = r.cells.map((c, i) => c === 'wall' ? i : -1).filter(i => i >= 0).sort(() => rnd() - 0.5);
      for (const i of at) { r.cells[i] = ''; if (!check(def, r).won) r.cells[i] = 'wall'; }
      const k = walls(r);
      if (!best || k < best.k) best = { k, from: walls(start), w: r.w, h: r.h, rows: Array.from({ length: r.h }, (_, y) => r.cells.slice(y * r.w, (y + 1) * r.w).map((c, x) => r.start.x === x && r.start.y === y ? 'P' : c === 'wall' ? '#' : c === 'goal' ? 'G' : c ? '*' : (r.entities.some(e => e.x === x && e.y === y) ? 'o' : '.')).join('')) };
    }
  }
  out.push({ id: def.id, ...(best || { k: null }) });
  console.log(`Level ${def.id}: ${best ? `${best.k} walls (from ${best.from}, ${best.w}x${best.h})  ${best.rows.join(' / ')}` : 'no known winning room'}`);
}
console.log(JSON.stringify(out.map(o => [o.id, o.k])));
