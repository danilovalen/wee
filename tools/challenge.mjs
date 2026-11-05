// Challenges (registers 558-562): a semi-built room, a few open tiles ('+'), and a handful of given pieces
// that must ALL be placed. Run judges it, as in a builder level: the robot plays every shortest path and
// must reach the star, meeting the challenge's goals on each. A good challenge has exactly one winning
// placement. This tries every placement and reports how many win, how many come close, and the solution.
// Usage: node tools/challenge.mjs [id,id]        (no ids: every challenge in campaign/challenges.json)
//        node tools/challenge.mjs --write     writes src/level/challenges.js for the game
//        node tools/challengeFind.mjs [--seed S]   searches random arenas for single-solution ones
import { readFileSync, writeFileSync } from 'node:fs';
import { room } from '../tests/lib.mjs';
import { allShortest } from '../src/campaign/robot.js';
import { REQUIREMENTS } from '../src/campaign/requirements.js';

// A given piece in the legend; a one-way or a laser may be placed facing any way.
const TURNS = { '>': ['>', '<', '^', 'v'], e: ['n', 'e', 's', 'w'] };
const ways = p => TURNS[p] || [p];

export function placements(ch) {
  const open = [];
  ch.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '+') open.push([x, y]); }));
  const pieces = [...ch.pieces].sort(), out = [];
  // Each piece to a distinct open tile; equal pieces are taken in tile order so a swap is not counted twice.
  const go = (i, used, lastSame, acc) => {
    if (i === pieces.length) { out.push(acc.slice()); return; }
    const same = i > 0 && pieces[i] === pieces[i - 1];
    for (let t = same ? lastSame + 1 : 0; t < open.length; t++) {
      if (used.has(t)) continue;
      for (const w of ways(pieces[i])) { used.add(t); acc.push([open[t], w]); go(i + 1, used, t, acc); acc.pop(); used.delete(t); }
    }
  };
  go(0, new Set(), -1, []);
  return out;
}

export const rowsWith = (ch, placed) => {
  const g = ch.rows.map(r => [...r.replace(/\+/g, '.')]);
  for (const [[x, y], w] of placed) g[y][x] = w;
  return g.map(r => r.join(''));
};

// Run's verdict on one placement: won, or how close it came.
// A level's robot has no powers unless it names them, as roomOf gives it.
export const build = (ch, rows) => { const r = room(rows); for (const k of Object.keys(r.powers)) r.powers[k] = !!(ch.powers || []).includes(k); return r; };
export function judge(ch, rows) {
  const r = build(ch, rows), res = allShortest(r);
  if (res.status !== 'solved' || res.capped) return { won: false, reach: false };
  const min = ch.min ?? 1;
  const met = (ch.require || []).map(id => res.paths.every(p => REQUIREMENTS[id].judge(r, p)));
  return { won: res.length >= min && met.every(Boolean), reach: true, length: res.length, met };
}

export function measure(ch) {
  const all = placements(ch), wins = [];
  let reach = 0, close = 0;
  for (const pl of all) {
    const rows = rowsWith(ch, pl), v = judge(ch, rows);
    if (v.reach) reach++;
    if (v.won) wins.push({ rows, length: v.length });
    else if (v.reach && v.met.filter(Boolean).length >= Math.max(1, v.met.length - 1) && v.length >= (ch.min ?? 1) - 1) close++;
  }
  return { placements: all.length, reach, close, wins };
}

// A legend letter's element, for the tools row and the counts.
const EL = { '#': 'block', B: 'box', t: 'toggle', '>': 'gate', D: 'door', o: 'button', e: 'laser', r: 'relay', x: 'spikes' };
// A challenge as a level the game can open (register 562): its built room, its open tiles, exactly its pieces.
export function toLevel(ch) {
  const open = [];
  ch.rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '+') open.push([x, y]); }));
  const palette = {};
  for (const p of ch.pieces) { const el = EL[p]; palette[el] = [(palette[el]?.[0] || 0) + 1, (palette[el]?.[1] || 0) + 1]; }
  const room = build(ch, rowsWith(ch, []));
  return { id: ch.id, name: ch.name, ...(ch.waiting ? { waiting: true } : {}), challenge: { open }, room, size: [room.w, room.h], palette, steps: { min: ch.min ?? 1 }, rules: [], require: ch.require || [], optional: [] };
}

// A removal challenge (register 787): every piece of a kind it names can be taken out, and the level keeps
// exactly the rest; its card says how many of each to take out.
const KIND = c => ({ '<': '>', '^': '>', v: '>', n: 'e', s: 'e', w: 'e' })[c] || c;
export function removalLevel(ch) {
  const open = [], palette = {}, remove = {};
  ch.rows.forEach((r, y) => [...r].forEach((c, x) => { const k = KIND(c); if (k in ch.remove) { open.push([x, y]); const el = EL[k]; palette[el] = [(palette[el]?.[0] || 0) + 1, (palette[el]?.[1] || 0) + 1]; } }));
  for (const [k, n] of Object.entries(ch.remove)) { const el = EL[k]; remove[el] = n; palette[el] = [palette[el][0] - n, palette[el][1] - n]; }
  const room = build(ch, ch.rows);
  return { id: ch.id, name: ch.name, ...(ch.waiting ? { waiting: true } : {}), challenge: { open, remove }, room, size: [room.w, room.h], palette, steps: { min: ch.min ?? 1 }, rules: [], require: ch.require || [], optional: [] };
}

// Every way to take out exactly the asked number of each kind: lists of tiles.
export function choices(rows, remove) {
  const at = {};
  rows.forEach((r, y) => [...r].forEach((c, x) => { const k = KIND(c); if (k in remove) (at[k] ||= []).push([x, y]); }));
  const combos = (list, k, from = 0) => k === 0 ? [[]] : list.slice(from).flatMap((t, i) => combos(list, k - 1, from + i + 1).map(c => [t, ...c]));
  return Object.entries(remove).reduce((acc, [k, n]) => acc.flatMap(a => combos(at[k] || [], n).map(c => [...a, ...c])), [[]]);
}
export const without = (rows, tiles) => rows.map((r, y) => [...r].map((c, x) => tiles.some(([tx, ty]) => tx === x && ty === y) ? '.' : c).join(''));

export function measureRemoval(ch) {
  const all = choices(ch.rows, ch.remove), wins = [];
  for (const t of all) { const v = judge(ch, without(ch.rows, t)); if (v.won) wins.push({ tiles: t, length: v.length }); }
  return { choices: all.length, wins };
}

const LIST = () => JSON.parse(readFileSync(new URL('../campaign/challenges.json', import.meta.url)));

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : null;
  if (process.argv.includes('--write')) {
    writeFileSync('src/level/challenges.js', '// Generated from campaign/challenges.json by tools/challenge.mjs --write. Do not edit by hand.\nexport const CHALLENGES = ' + JSON.stringify(LIST().map(c => c.remove ? removalLevel(c) : toLevel(c))) + ';\n');
    console.log('src/level/challenges.js written');
  } else {
    // Loaded after this module finishes: challengeShape imports it back.
    import('./challengeShape.mjs').then(({ shape }) => {
    for (const ch of LIST().filter(c => !c.remove && (!arg || arg.includes(String(c.id))))) {
      const m = measure(ch);
      const sh = m.wins.length === 1 ? shape(ch, placements(ch).find(pl => rowsWith(ch, pl).join() === m.wins[0].rows.join())) : null;
      console.log(`${ch.id} ${ch.name}: ${m.wins.length === 1 ? 'ONE solution' : m.wins.length + ' solutions'}; ${m.placements} placements` + (sh ? `; ${sh.forks} ways to rest on the star${sh.trap ? ', a trap slot' : ''}${sh.twoJob ? ', a two-job piece' : ''}` : ''));
      for (const w of m.wins.slice(0, 3)) console.log('   ' + w.rows.join(' / ') + `  (${w.length} moves)`);
    }
    });
  }
}
