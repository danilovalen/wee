// The solver: a breadth-first search over the room's states, one move of yours per
// edge, using the real rules. A move is a slide you start from rest (or a hide), run
// until you and every piece have stopped. Mid-slide powers (Boomerang, Dive, Laser)
// are tried once per move: 'right@3:left' starts a slide right and presses left on the
// third tick after (here a boomerang).
import { createGame, step, cloneGame } from '../rules/game.js';
import { MOVES, OPPOSITE } from '../rules/base.js';

export const MAX_STATES = 20000;
const KEYS = ['up', 'right', 'down', 'left'];

// What makes two states the same for the search: everything the next move depends on.
// Built as a plain string (it is made for every position searched): fields joined by ',',
// pieces by ';', parts by '|', none of which a field can contain.
export function stateKey(s) {
  const p = s.player, st = p.stuck;
  let k = `${p.x},${p.y},${p.swimming ? 1 : 0},${p.sticky ? 1 : 0},${st ? st.id + (st.ride ? 'r' : 'g') : '-'},${s.checkpoint.x},${s.checkpoint.y}|`;
  for (const e of s.entities) if (!e.dead) k += `${e.id},${e.x},${e.y},${e.dir},${e.axis},${e.sticky ? 1 : 0},${e.glue || 0},${e.turret ? e.turret.aim % e.turret.dirs.length : -1},${e.fuse ?? ''};`;
  k += '|';
  for (const c of Object.keys(s.open).sort()) if (s.open[c]) k += c + ',';
  if (s.broken.length) k += '|' + [...s.broken].sort((a, b) => a - b).join(',');
  if (s.toggled.length) k += '|t' + s.toggled.join(',');
  if (s.crates.size) for (const i of [...s.crates].sort((a, b) => a - b)) k += '|c' + i + s.cells[i];
  return k;
}

export const settled = s => !s.player.dir && !s.player.hidden && !s.entities.some(e => !e.dead && (e.rush || e.slide));

// One move from state s: a fresh copy, the key, then ticks until everything stops.
// Null when the move changes nothing, kills you, or never settles.
export function parseMove(m) {
  const [k, rest] = m.split('@');
  if (!rest) return { k, at: 0, then: null };
  const [n, then] = rest.split(':');
  return { k, at: +n, then };
}

const limit = s => 4 * s.w * s.h + 40;

// onTick, when given, sees the state after every tick, for a caller that maps where moves go.
// before is s's key, passed in by a caller that tries several moves from one position.
export function move(s, m, onTick, before = stateKey(s)) {
  const { k, at, then } = parseMove(m);
  const t = cloneGame(s), deaths = t.deaths;
  step(t, [k]); if (onTick) onTick(t);
  for (let i = 1; i <= limit(t) && !settled(t); i++) { step(t, i === at ? [then] : []); if (onTick) onTick(t); }
  if (t.deaths !== deaths || !settled(t)) return null;
  if (!t.won && stateKey(t) === before) return null;
  return t;
}

// The mid-slide moves worth trying from s: for each slide, each tick it is still going,
// each power that is on (Boomerang turns back, Dive lands, Laser shoots either side).
export function powerMoves(s) {
  const pw = s.powers, out = [];
  for (const d of KEYS) {
    const t = cloneGame(s);
    step(t, [d]);
    for (let i = 1; i <= limit(t) && t.player.dir && !t.won; i++) {
      const pd = t.player.dir;
      if (pw.boomerang) out.push(`${d}@${i}:${OPPOSITE[pd]}`);
      if (pw.dive) out.push(`${d}@${i}:${pd}`);
      if (pw.laser) for (const side of KEYS) if (side !== pd && side !== OPPOSITE[pd]) out.push(`${d}@${i}:${side}`);
      step(t);
    }
  }
  return out;
}

// A laser only matters in a room with something it can change: an enemy, a switch it
// lights, or water it shocks.
const laserMatters = s => s.entities.some(e => !e.dead && (e.kind === 'enemy' || e.kind === 'strong')) ||
  s.cells.some(c => c === 'water' || c.startsWith('sensor:'));

// Settles a state already stepped once; null when it died, never settled, or changed nothing.
function settleFrom(t, deaths, before, at = 0, then = null, from = 1) {
  for (let i = from; i <= limit(t) && !settled(t); i++) step(t, i === at ? [then] : []);
  if (t.deaths !== deaths || !settled(t)) return null;
  if (!t.won && stateKey(t) === before) return null;
  return t;
}

// Every move from s and where it leads: [move, state] pairs. A mid-slide power branches
// from the slide as it is on that tick, instead of replaying the slide from the start.
// A move that leads nowhere yields null, so a caller can hand control back between tries.
// onTick sees the plain moves only: a power branches off a slide on the line it already covers.
export function* successors(s, keys, powers = true, onTick = null) {
  const before = stateKey(s), pw = s.powers, laser = pw.laser && laserMatters(s);
  for (const k of keys) { const t = move(s, k, onTick, before); yield t ? [k, t] : null; }
  if (!powers || (!pw.boomerang && !pw.dive && !laser)) return;
  for (const d of KEYS) {
    const t = cloneGame(s);
    step(t, [d]);
    for (let i = 1; i <= limit(t) && t.player.dir && !t.won; i++) {
      const pd = t.player.dir, thens = [];
      if (pw.boomerang) thens.push(OPPOSITE[pd]);
      if (pw.dive) thens.push(pd);
      if (laser) for (const side of KEYS) if (side !== pd && side !== OPPOSITE[pd]) thens.push(side);
      for (const then of thens) {
        const b = cloneGame(t);
        step(b, [then]);
        const r = settleFrom(b, s.deaths, before, 0, null, i + 1);
        yield r ? [`${d}@${i}:${then}`, r] : null;
      }
      step(t);
    }
  }
}

// Why a room cannot be searched, or null when it can.
export function unsearchable(level) {
  if (!level.cells.includes('goal')) return 'nogoal';
  if (level.entities.some(e => (MOVES.includes(e.kind) && e.mode === 'realtime') || (e.turret && e.turret.mode === 'realtime'))) return 'realtime';
  return null;
}

// A generator, so the page can run it a slice at a time and stay responsive. Yields the
// number of states seen so far; returns { status, moves, states }.
export function* search(level, max = MAX_STATES) {
  const why = unsearchable(level);
  if (why) return { status: why, moves: null, states: 0 };
  return yield* searchFrom(createGame(level), max);
}

// Whether the goal can still be reached from a game at rest, as in play: true, false, or
// null when the search hits its cap.
export function* canWin(s, max = MAX_STATES) {
  if (s.won) return true;
  const r = yield* searchFrom(cloneGame(s), max);
  return r.status === 'solved' ? true : r.status === 'unsolvable' ? false : null;
}

function* searchFrom(start, max) {
  const keys = [...KEYS, ...(start.powers.cycle || start.powers.swim ? ['hide'] : [])];
  const seen = new Map([[stateKey(start), null]]);
  let frontier = [{ s: start, path: [] }];
  while (frontier.length) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const pair of successors(s, keys)) {
        if (!pair) { yield seen.size; continue; }
        const [k, t] = pair;
        if (t.won) return { status: 'solved', moves: [...path, k], states: seen.size };
        const key = stateKey(t);
        if (seen.has(key)) continue;
        seen.set(key, true);
        if (seen.size >= max) return { status: 'capped', moves: null, states: seen.size };
        next.push({ s: t, path: [...path, k] });
        yield seen.size;
      }
      yield seen.size;
    }
    frontier = next;
  }
  return { status: 'unsolvable', moves: null, states: seen.size };
}

// The stop map: every tile you can come to rest on from the start, by any moves.
// Two passes. The first uses plain slides only and treats two positions as the same
// whenever you stand on the same tile, which is fast and finds most stops; the second
// searches the whole room, powers included, until the time budget runs out. out.stops (a Set of cell indexes) fills as it goes, so the page can
// draw it early. Returns { stops, capped }, or { why } for real-time pieces.
export function* reach(level, { max = MAX_STATES, budgetMs = Infinity, out = {} } = {}) {
  if (unsearchable({ ...level, cells: [...level.cells, 'goal'] })) return { why: 'realtime', stops: [] };
  const until = performance.now() + budgetMs;
  const start = createGame(level);
  const keys = [...KEYS, ...(level.powers.cycle || level.powers.swim ? ['hide'] : [])];
  const stops = out.stops = new Set([start.player.y * start.w + start.player.x]);
  const tileKey = s => s.player.y * s.w + s.player.x + (s.player.swimming ? 's' : '');
  let capped = false;
  for (const [keyOf, powers] of [[tileKey, false], [stateKey, true]]) {
    const seen = new Set([keyOf(start)]);
    let frontier = [start];
    while (frontier.length && !capped) {
      const next = [];
      for (const s of frontier) {
        for (const pair of successors(s, keys, powers)) {
          if (pair) {
            const t = pair[1];
            stops.add(t.player.y * t.w + t.player.x);
            const key = keyOf(t);
            if (!seen.has(key)) { seen.add(key); next.push(t); }
          }
          if (seen.size >= max || performance.now() > until) { capped = true; break; }
          yield stops.size;
        }
        if (capped) break;
      }
      frontier = next;
    }
  }
  return { stops: [...stops], capped };
}

// The whole search at once, for tests and tools.
export function solve(level, max) {
  const it = search(level, max);
  for (;;) { const r = it.next(); if (r.done) return r.value; }
}
