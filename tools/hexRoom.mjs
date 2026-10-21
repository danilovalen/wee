// A 4-bit counter built only from grey pieces, with a 7-segment display showing its count in hex
// (0 to 9, A, b, C, d, E, F) as closing and opening doors (register 356).
//   Clock and pulse: the 8-stage ring of tools/counterRoom.mjs; the pulse is a wire, E.
//   Counter: four gates, each a relay lit by up to three laser lines (a line passes only when all
//   its doors are open); every door reads a wire, so the bits, E and the carries are wires a router
//   lays. The carries "b0 and b1" (C2) and "b0, b1 and b2" (C3) are wires under those bits' relays.
//   Decoder, a grid: the bits run as four horizontal wires; a column per term (an AND of bits) crosses
//   them with a door wherever its bit matters and lights a relay below. Then a row per segment crosses
//   the term wires with an inverted door at each of its terms, so its relay is lit only when none is
//   on: that wire is "segment off", and the display's doors on it close when the segment is on.
// Usage: node tools/hexRoom.mjs [--out rooms/hex-counter.wee] [--ticks N]
import { writeFileSync } from 'node:fs';
import { createGame, step } from '../src/rules/game.js';
import { parseLevel, emptyLevel } from '../src/level/format.js';
import { solidCell } from '../src/rules/grid.js';

const W = 60, H = 46, COLS = ['teal', 'violet', 'charcoal'];
// Display wires take fixed colours, so segments that meet around the figure always differ.
const PREFER = { sa: 'charcoal', sd: 'charcoal', sg: 'charcoal', sf: 'teal', sc: 'teal', se: 'violet', sb: 'violet' };
// Hex digits on seven segments.
const DIG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg', 'abcefg', 'cdefg', 'adef', 'bcdeg', 'adefg', 'aefg'];
const SEG = { a: [[1, 0], [2, 0], [3, 0]], b: [[4, 1], [4, 2], [4, 3]], c: [[4, 5], [4, 6], [4, 7]], d: [[1, 8], [2, 8], [3, 8]], e: [[0, 5], [0, 6], [0, 7]], f: [[0, 1], [0, 2], [0, 3]], g: [[1, 4], [2, 4], [3, 4]] };
const DX = 50, DY = 30;

// A small shared set of terms (a term: bits that must hold, [mask, value]) covering every segment.
function terms() {
  const on = s => [...Array(16).keys()].filter(n => DIG[n].includes(s)), covers = ([m, v], n) => (n & m) === v, lits = ([m]) => m.toString(2).split('1').length - 1;
  const cubes = []; for (let m = 0; m < 16; m++) for (let v = 0; v < 16; v++) if ((v & ~m) === 0) cubes.push([m, v]);
  const ok = {}; for (const s of 'abcdefg') { const ones = new Set(on(s)); ok[s] = cubes.filter(c => [...Array(16).keys()].every(n => !covers(c, n) || ones.has(n))); }
  const need = new Set([...'abcdefg'].flatMap(s => on(s).map(n => s + n))), out = [];
  while (need.size) {
    let best = null, bs = -1;
    for (const c of cubes) {
      const gain = [...'abcdefg'].filter(s => ok[s].includes(c)).flatMap(s => on(s).filter(n => covers(c, n) && need.has(s + n))).length - lits(c) * 0.01;
      if (gain > bs) { bs = gain; best = c; }
    }
    const segs = [...'abcdefg'].filter(s => ok[s].includes(best));
    out.push({ c: best, segs });
    for (const s of segs) for (const n of on(s)) if (covers(best, n)) need.delete(s + n);
  }
  return out;
}

export function hexRoom() {
  const l = emptyLevel(W, H);
  for (const k of Object.keys(l.powers)) l.powers[k] = false;
  l.wires = [];
  const key = (x, y) => y * W + x;
  const cell = (x, y, c) => { l.cells[key(x, y)] = c; };
  const laser = (x, y, d) => l.entities.push({ kind: 'turret', x, y, turret: { dirs: [d], mode: 'input' } });
  const fixed = (w, net, pts) => { for (const [x, y] of pts) l.wires.push({ x, y, w, net }); };
  const nets = {}, need = (net, ...pts) => (nets[net] ||= []).push(...pts.map(p => [p]));
  const group = (net, pts) => (nets[net] ||= []).push(pts);
  // Clock ring and pulse (the pulse's relay is on the E wire).
  const ys = [2, 4, 6, 8, 10, 12, 14, 16];
  ys.forEach((y, i) => { laser(1, y, 'right'); cell(2, y, i ? 'door:wire' : 'idoor:wire'); cell(3, y, 'sensor:wire'); cell(4, y, 'wall'); });
  ys.slice(0, 7).forEach((y, i) => fixed(i % 2 ? 'violet' : 'teal', 'r' + i, [[3, y], [3, y + 1], [2, y + 1], [2, y + 2]]));
  fixed('charcoal', 'r7', [[3, 16], [3, 17], [2, 17], [1, 17], ...Array.from({ length: 17 }, (_, k) => [0, 17 - k]), [1, 1], [2, 1], [2, 2]]);
  laser(4, 3, 'right'); cell(5, 3, 'door:wire'); cell(6, 3, 'idoor:wire'); cell(7, 3, 'sensor:wire'); cell(8, 3, 'wall');
  fixed('teal', 'r0', [[4, 3], [5, 3]]); fixed('violet', 'r1', [[4, 4], [5, 4], [6, 4], [6, 3]]);
  need('E', [7, 3]);
  // The counter: a relay per bit, a wall to its right, lines from left, top and bottom, doors two apart
  // so the wires reaching them never touch.
  const BITS = [
    { L: [['b0', 0], ['E', 1]], T: [['b0', 1], ['E', 0]] },
    { L: [['b1', 0], ['E', 1], ['b0', 1]], T: [['b1', 1], ['E', 0]], B: [['b1', 1], ['b0', 0]] },
    { L: [['b2', 0], ['E', 1], ['C2', 1]], T: [['b2', 1], ['E', 0]], B: [['b2', 1], ['C2', 0]] },
    { L: [['b3', 0], ['E', 1], ['C3', 1]], T: [['b3', 1], ['E', 0]], B: [['b3', 1], ['C3', 0]] },
  ];
  const GY = 9, relayAt = [];
  BITS.forEach((g, i) => {
    const gx = 18 + 10 * i; relayAt.push([gx, GY]);
    cell(gx, GY, 'sensor:wire'); cell(gx + 1, GY, 'wall');
    for (const [arm, dx, dy, fire] of [['L', -1, 0, 'right'], ['T', 0, -1, 'down'], ['B', 0, 1, 'up']]) {
      const lits = g[arm]; if (!lits) continue;
      lits.forEach(([net, on], j) => { const x = gx + dx * (2 * j + 2), y = GY + dy * (2 * j + 2); cell(x, y, (on ? 'door:' : 'idoor:') + 'wire'); need(net, [x, y]); });
      laser(gx + dx * (2 * lits.length + 1), GY + dy * (2 * lits.length + 1), fire);
    }
    need('b' + i, [gx, GY]);
  });
  need('C2', relayAt[0], relayAt[1]); need('C3', relayAt[0], relayAt[1], relayAt[2]);
  // The decoder's first grid: four bit wires, a column per term.
  const T = terms(), X0 = 12, LY = 18, BY = [20, 22, 24, 26], RY = 28;
  BY.forEach((y, b) => group('b' + b, Array.from({ length: T.length }, (_, k) => [X0 + k, y])));
  T.forEach((t, k) => {
    const x = X0 + k;
    laser(x, LY, 'down');
    for (let b = 0; b < 4; b++) if (t.c[0] >> b & 1) cell(x, BY[b], ((t.c[1] >> b & 1) ? 'door:' : 'idoor:') + 'wire');
    cell(x, RY, 'sensor:wire'); cell(x, RY + 1, 'wall');
  });
  // The second grid: a row per segment; its term wires come straight down from each term's relay.
  // Rows run in the order the wires reach the display, so wires of one colour never have to cross.
  const SEGS = [...'afbgecd'], SY = s => 31 + 2 * SEGS.indexOf(s), SX = X0 + T.length + 1;
  T.forEach((t, k) => { const low = Math.max(...t.segs.map(SY)); fixed(k % 2 ? 'charcoal' : 'violet', 't' + k, Array.from({ length: low - RY + 1 }, (_, j) => [X0 + k, RY + j])); });
  for (const s of SEGS) {
    const y = SY(s);
    laser(X0 - 2, y, 'right');
    T.forEach((t, k) => { if (t.segs.includes(s)) cell(X0 + k, y, 'idoor:wire'); });
    cell(SX, y, 'sensor:wire'); cell(SX + 1, y, 'wall');
    need('s' + s, [SX, y]);
    group('s' + s, SEG[s].map(([x, y]) => [DX + x, DY + y]));
    for (const [x, y] of SEG[s]) cell(DX + x, DY + y, 'door:wire');
  }
  route(l, nets);
  l.wires = l.wires.map(({ x, y, w }) => ({ x, y, w }));
  l.start = { x: W - 2, y: H - 2 };
  return parseLevel(JSON.stringify(l));
}

// Lays each net as one tree: a colour per net, never touching another net of that colour, and never
// under a switch or grey piece that is not its own. Tries nets in other orders when one gets walled in.
function route(l, nets) {
  const key = (x, y) => y * W + x, base = l.wires.slice();
  let seed = 1; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const own = {}; for (const [n, groups] of Object.entries(nets)) own[n] = new Set(groups.flat().map(([x, y]) => key(x, y)));
  // The display's wires first (short and simple), then the carries, the bits and the pulse.
  const rank = n => n === 'sg' ? -1 : n[0] === 's' ? 0 : n[0] === 'C' ? 1 : n[0] === 'b' ? 2 : 3;
  const ids = Object.keys(nets).sort((a, b) => rank(a) - rank(b) || nets[b].length - nets[a].length);
  for (let attempt = 0; attempt < 300; attempt++) {
    const order = attempt ? ids.slice().sort((a, b) => rank(a) - rank(b) || rnd() - 0.5) : ids;
    const used = new Map(), put = (k, w, net) => (used.get(k) || used.set(k, []).get(k)).push({ w, net });
    for (const r of base) put(key(r.x, r.y), r.w, r.net);
    // A net with a fixed colour holds its ends from the start, so no earlier wire crowds them.
    for (const [n, w] of Object.entries(PREFER)) for (const [x, y] of (nets[n] || []).flat()) put(key(x, y), w, n);
    const laid = [];
    let ok = true;
    for (const n of order) {
      const groups = nets[n];
      const piece = k => l.cells[k];
      const blocked = k => (/^(button|toggle|sensor):/.test(piece(k)) || /:wire$/.test(piece(k))) && !own[n].has(k);
      const clash = (x, y, w) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (used.get(key(x + dx, y + dy)) || []).some(u => u.w === w && u.net !== n));
      let done = null;
      for (const w of PREFER[n] ? [PREFER[n]] : COLS.slice().sort(() => attempt ? rnd() - 0.5 : 0)) {
        if (groups.flat().some(([x, y]) => clash(x, y, w))) continue;
        const have = new Set(groups[0].map(([x, y]) => key(x, y))), lay = [...have];
        let good = true;
        for (const g of groups.slice(1)) {
          const goal = new Set(g.map(([x, y]) => key(x, y)));
          if ([...goal].some(k => have.has(k))) { for (const k of goal) if (!have.has(k)) { have.add(k); lay.push(k); } continue; }
          // Cheapest path, where a tile next to another net's wire costs more, so wires spread out.
          const crowd = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]].some(([dx, dy]) => (used.get(key(x + dx, y + dy)) || []).some(u => u.net !== n)) ? 6 : 1;
          const prev = new Map(), dist = new Map(), buckets = [[...have]];
          for (const k of have) { prev.set(k, -1); dist.set(k, 0); }
          let hit = -1;
          for (let d = 0; d < buckets.length && hit < 0; d++) for (const k of buckets[d] || []) {
            if (dist.get(k) !== d) continue;
            if (goal.has(k)) { hit = k; break; }
            const x = k % W, y = (k - x) / W;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy, nk = key(nx, ny);
              if (nx < 0 || ny < 0 || nx >= W || ny >= H || blocked(nk) || clash(nx, ny, w)) continue;
              const nd = d + crowd(nx, ny);
              if (dist.has(nk) && dist.get(nk) <= nd) continue;
              dist.set(nk, nd); prev.set(nk, k); (buckets[nd] ||= []).push(nk);
            }
          }
          if (hit < 0) { good = false; break; }
          for (let k = hit; prev.get(k) !== -1; k = prev.get(k)) if (!have.has(k)) { have.add(k); lay.push(k); }
          for (const k of goal) if (!have.has(k)) { have.add(k); lay.push(k); }
        }
        if (good) { done = { w, lay }; break; }
      }
      if (!done) { ok = false; break; }
      for (const k of done.lay) { put(k, done.w, n); laid.push({ x: k % W, y: Math.floor(k / W), w: done.w, net: n }); }
    }
    if (ok) { l.wires = [...base, ...laid]; return; }
  }
  throw new Error('No routing found');
}

// What the display shows ('?' when the lit segments are no hex digit) and what the counter holds.
export function hexOf(s) {
  const on = [...'abcdefg'].filter(k => SEG[k].every(([x, y]) => solidCell(s, DX + x, DY + y))).join('');
  const d = DIG.indexOf(on);
  return d < 0 ? '?' : d.toString(16).toUpperCase();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const l = hexRoom(), s = createGame(l), seen = [];
  for (let t = 0; t < +arg('--ticks', 560); t++) { step(s); const d = hexOf(s); if (seen.at(-1)?.d !== d) seen.push({ t, d }); }
  console.log(`${l.w}x${l.h}, ${l.wires.length} wire tiles, ${l.entities.length} lasers`);
  console.log(seen.map(e => `${e.d}@${e.t}`).join(' '));
  if (arg('--out')) writeFileSync(arg('--out'), JSON.stringify({ ...l, name: 'Hex counter' }, null, 1));
}
