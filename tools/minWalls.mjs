// The fewest walls a winning room needs, per campaign level (register 836): from every known winning
// room, walls come out one at a time, in many random orders, while the room still wins the level.
// An upper bound, not a proof: a room built another way may need fewer.
// With --all, everything placed may come out, not just walls, and the count is the star's own: the
// blob and the berries are left out (registers 837, 838).
// Usage: node tools/minWalls.mjs [--all] [--orders N] [--seed N] [level ...]
import { check, roomOf, tilesOf } from '../src/campaign/rules.js';
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
const all = process.argv.includes('--all');
// Everything placed, as the star counts it: no blob, no berry.
const walls = r => all ? tilesOf(def0, r) : r.cells.reduce((k, c) => k + (c === 'wall'), 0);
let def0;
// Take one thing out of a room: a cell (with its pushable mark) or a piece; null when it may not go.
const things = r => [...r.cells.map((c, i) => c && c !== 'goal' && (all || c === 'wall') ? ['c', i] : null), ...(all ? r.entities.map((e, k) => ['e', k]) : [])].filter(Boolean);
function without(r, [t, i]) {
  const q = JSON.parse(JSON.stringify(r));
  if (t === 'e') q.entities.splice(i, 1);
  else { q.cells[i] = ''; if (q.crates) q.crates = q.crates.filter(c => c.y * q.w + c.x !== i); }
  return q;
}
const out = [];
for (const def of LEVELS.filter(l => /^\d+$/.test(l.id) && (!ids.length || ids.includes(l.id))).sort((a, b) => a.id - b.id)) {
  let best = null; def0 = def;
  for (const rows of roomsOf(def.id)) {
    const start = build(def, rows);
    if (!check(def, start).won) continue;
    for (let o = 0; o < orders; o++) {
      let r = JSON.parse(JSON.stringify(start));
      // Keep trying until nothing more can come out: a piece's index moves as others go.
      for (let more = true; more;) {
        more = false;
        for (const t of things(r).sort(() => rnd() - 0.5)) {
          if (t[0] === 'e' && t[1] >= r.entities.length) continue;
          const q = without(r, t);
          if (check(def, q).won) { r = q; more = true; break; }
        }
      }
      const k = walls(r);
      if (!best || k < best.k) best = { k, from: walls(start), w: r.w, h: r.h, rows: Array.from({ length: r.h }, (_, y) => r.cells.slice(y * r.w, (y + 1) * r.w).map((c, x) => r.start.x === x && r.start.y === y ? 'P' : c === 'wall' ? '#' : c === 'goal' ? 'G' : c ? '*' : (r.entities.some(e => e.x === x && e.y === y) ? 'o' : '.')).join('')) };
    }
  }
  out.push({ id: def.id, ...(best || { k: null }) });
  console.log(`Level ${def.id}: ${best ? `${best.k} ${all ? 'things' : 'walls'} (from ${best.from}, ${best.w}x${best.h})  ${best.rows.join(' / ')}` : 'no known winning room'}`);
}
console.log(JSON.stringify(out.map(o => [o.id, o.k])));
