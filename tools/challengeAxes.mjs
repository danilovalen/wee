// The axes a challenge is judged on before it ships (registers 797, 799-801, 805). Each is measured on the
// level and its one answer; tools/challengeFind.mjs and tools/removalFind.mjs refuse a room that fails one.
//   unique     exactly one answer (placing: one placement of all the pieces; removal: one choice to take out)
//   breadth    how many placements or choices there are to try
//   moves      the answer's length
//   idle       built-in pieces (not blocks) that do nothing: with floor in their place the level has the same answers
//   dead       pieces in the answer's room (not blocks) that only act as a block: a block in their place, the
//              answer wins the same way (a laser aimed at nothing, a door that never opens, a relay never lit)
//   loose      placed pieces of the answer that can be left out and it still wins (placing only)
//   residual   choices left once any one right piece is in (or out): the depth after the first find (799)
//   glance     answer pieces a greedy player gets right with no doubt, always making the move that lets the blob
//              rest on the most tiles, or wins (800, 801, 805); a removal that is all glance is seen, not solved
//   name       the name says nothing about what to place or take out (797)
// Usage: node tools/challengeAxes.mjs [id,id]
import { readFileSync } from 'node:fs';
import { placements, judge, measure, build, measureRemoval, choices, without } from './challenge.mjs';
import { restCells } from './challengeShape.mjs';

const TURNS = { '>': ['>', '<', '^', 'v'], e: ['n', 'e', 's', 'w'] };
const KIND = c => ({ '<': '>', '^': '>', v: '>', n: 'e', s: 'e', w: 'e' })[c] || c;
const PIECE = c => !'.#+PG'.includes(c);
// Words that name a piece or what to do with one: a name holding one says how the level is solved.
export const SPOILERS = /block|box|door|relay|laser|beam|spike|switch|button|one.?way|ways?\b|lit\b|fire|light|lever|clear|spare|less|many|clutter|take|remove|push|press|open|shut|wall|gate/i;

// How far the blob gets: a win counts more than any number of tiles it can rest on.
const score = (ch, rows) => judge(ch, rows).won ? Infinity : restCells(build(ch, rows)).size;

// A built-in piece is idle when floor in its place leaves the level with exactly the same answers.
const sameWins = (a, b) => JSON.stringify(a.map(w => w.rows || w.tiles)) === JSON.stringify(b.map(w => w.rows || w.tiles));
function idle(ch, isFixed, measureOf) {
  const base = measureOf(ch).wins, out = [];
  ch.rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (!PIECE(c) || !isFixed(c)) return;
    const rows = ch.rows.map((rr, yy) => yy === y ? rr.slice(0, x) + '.' + rr.slice(x + 1) : rr);
    const wins = measureOf({ ...ch, rows }).wins;
    if (sameWins(base, ch.remove ? wins : wins.map(w => ({ rows: w.rows.map((rr, yy) => yy === y ? rr.slice(0, x) + c + rr.slice(x + 1) : rr) })))) out.push(`${c}@${x},${y}`);
  }));
  return out;
}

function dead(ch, solved) {
  const base = judge(ch, solved), rest = restCells(build(ch, solved)).size, out = [];
  solved.forEach((r, y) => [...r].forEach((c, x) => {
    if (!PIECE(c) || c === 'B') return;
    const rows = solved.map((rr, yy) => yy === y ? rr.slice(0, x) + '#' + rr.slice(x + 1) : rr), v = judge(ch, rows);
    if (v.won && v.length === base.length && restCells(build(ch, rows)).size === rest) out.push(`${c}@${x},${y}`);
  }));
  return out;
}

export function placingAxes(ch) {
  const m = measure(ch), win = m.wins.length === 1 ? m.wins[0].rows : null;
  const a = { id: ch.id, name: ch.name, kind: 'placing', unique: m.wins.length === 1, breadth: m.placements, moves: win ? m.wins[0].length : 0 };
  a.nameOk = !SPOILERS.test(ch.name);
  if (!win) return a;
  const sol = [];
  ch.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '+' && win[y][x] !== '.') sol.push([[x, y], win[y][x]]); }));
  a.idle = idle(ch, () => true, measure);
  a.dead = dead(ch, win);
  a.loose = sol.filter(([[x, y]]) => judge(ch, without(win, [[x, y]])).won).map(([[x, y], w]) => `${w}@${x},${y}`);
  // Residual: one right piece in its slot, the rest still to place.
  a.residual = Math.min(...sol.map(([[x, y], w], i) => {
    const rows = ch.rows.map((r, yy) => yy === y ? r.slice(0, x) + w + r.slice(x + 1) : r);
    const left = [...ch.pieces]; left.splice(left.indexOf(KIND(w) === 'e' ? 'e' : KIND(w)), 1);
    return placements({ ...ch, rows, pieces: left }).length;
  }));
  // Greedy: each step tries every remaining piece in every free slot and way, keeping the best for the blob.
  let rows = ch.rows.map(r => r), left = [...ch.pieces], glance = 0;
  while (left.length) {
    const cands = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c !== '+') return; for (const p of new Set(left)) for (const w of TURNS[p] || [p]) {
      const next = rows.map((rr, yy) => yy === y ? rr.slice(0, x) + w + rr.slice(x + 1) : rr);
      cands.push({ x, y, w, p, s: score(ch, next.map(q => q.replace(/\+/g, '.'))), next });
    } }));
    const best = Math.max(...cands.map(c => c.s)), top = cands.filter(c => c.s === best);
    const right = c => win[c.y][c.x] === c.w;
    if (!top.every(right)) break;
    glance++; rows = top[0].next; left.splice(left.indexOf(top[0].p), 1);
  }
  a.glance = glance; a.pieces = ch.pieces.length;
  return a;
}

export function removalAxes(ch) {
  const m = measureRemoval(ch), win = m.wins.length === 1 ? m.wins[0] : null;
  const a = { id: ch.id, name: ch.name, kind: 'removal', unique: m.wins.length === 1, breadth: m.choices, moves: win ? win.length : 0 };
  a.nameOk = !SPOILERS.test(ch.name);
  if (!win) return a;
  const solved = without(ch.rows, win.tiles);
  a.idle = idle(ch, c => !(KIND(c) in ch.remove), measureRemoval);
  a.dead = dead(ch, solved);
  a.residual = Math.min(...win.tiles.map(([x, y]) => {
    const k = KIND(ch.rows[y][x]), rest = { ...ch.remove, [k]: ch.remove[k] - 1 };
    return choices(without(ch.rows, [[x, y]]), rest).length;
  }));
  let rows = ch.rows, need = { ...ch.remove }, glance = 0;
  const out = t => win.tiles.some(([x, y]) => x === t[0] && y === t[1]);
  for (let step = 0; step < win.tiles.length; step++) {
    const cands = [];
    rows.forEach((r, y) => [...r].forEach((c, x) => { const k = KIND(c); if (need[k] > 0) cands.push({ t: [x, y], k, s: score(ch, without(rows, [[x, y]])) }); }));
    const best = Math.max(...cands.map(c => c.s)), top = cands.filter(c => c.s === best);
    if (!top.every(c => out(c.t))) break;
    glance++; rows = without(rows, [top[0].t]); need[top[0].k]--;
  }
  a.glance = glance; a.pieces = win.tiles.length;
  return a;
}

// The bar every shipped challenge meets.
export const BAR = { breadth: 30, residualPlacing: 15, residualRemoval: 10 };
export function fails(a) {
  const f = [];
  if (!a.unique) f.push('not one answer');
  if (a.breadth < BAR.breadth) f.push(`breadth ${a.breadth}`);
  if (!a.nameOk) f.push('name spoils');
  if (!a.unique) return f;
  if (a.idle.length) f.push(`idle ${a.idle.join(' ')}`);
  if (a.dead.length) f.push(`dead ${a.dead.join(' ')}`);
  if (a.loose && a.loose.length) f.push(`loose ${a.loose.join(' ')}`);
  if (a.residual < (a.kind === 'placing' ? BAR.residualPlacing : BAR.residualRemoval)) f.push(`residual ${a.residual}`);
  // A placing answer is seen once every piece is a greedy step; a removal one as soon as any piece is.
  if (a.kind === 'placing' ? a.glance >= a.pieces : a.glance > 0) f.push(`glance ${a.glance}/${a.pieces}`);
  return f;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = process.argv[2]?.split(',');
  const list = JSON.parse(readFileSync(new URL('../campaign/challenges.json', import.meta.url))).filter(c => !only || only.includes(c.id));
  for (const ch of list) {
    const a = ch.remove ? removalAxes(ch) : placingAxes(ch), f = fails(a);
    console.log(`${a.id.padEnd(4)} ${a.name.padEnd(16)} breadth ${String(a.breadth).padStart(4)}  moves ${a.moves}  residual ${String(a.residual ?? '-').padStart(3)}  glance ${a.glance ?? '-'}/${a.pieces ?? '-'}  idle ${(a.idle || []).length}  ${f.length ? 'FAIL: ' + f.join('; ') : 'ok'}`);
  }
}
