// The level file: an empty room, resizing, and parsing that refuses what it does not know.
import { CLOCKWISE, COLOURS, CORNERS, KINDS, MODES, MOVES, POWERS } from '../rules/base.js';

export function checkTurret(t) {
  if (!Array.isArray(t.dirs) || t.dirs.length < 1 || t.dirs.length > 4 || t.dirs.some(d => !CLOCKWISE.includes(d)) || new Set(t.dirs).size !== t.dirs.length)
    throw new Error('A turret needs one to four different directions.');
  if (!MODES.includes(t.mode)) throw new Error('Unknown turret clock: ' + t.mode);
  if (t.start !== undefined && !t.dirs.includes(t.start)) throw new Error('A turret starts aiming in one of its directions.');
}

export function emptyLevel(w = 20, h = 12) {
  return {
    format: 'wee-level', version: 1, w, h,
    cells: Array(w * h).fill(''),
    start: { x: 1, y: 1 },
    entities: [],
    powers: { boomerang: true, dive: true, laser: true, cycle: true, swim: false, light: false, armored: false },
    clock: 'tile',
  };
}

export function resizeLevel(level, w, h) {
  const cells = Array(w * h).fill('');
  for (let y = 0; y < Math.min(h, level.h); y++)
    for (let x = 0; x < Math.min(w, level.w); x++) cells[y * w + x] = level.cells[y * level.w + x];
  return {
    ...level, w, h, cells,
    start: { x: Math.min(level.start.x, w - 1), y: Math.min(level.start.y, h - 1) },
    entities: level.entities.filter(e => e.x < w && e.y < h),
  };
}

// Refuses a file it does not understand instead of half-loading it.
export function parseLevel(text) {
  const l = JSON.parse(text);
  if (l.format !== 'wee-level') throw new Error('Not a wee level file.');
  if (!(l.w > 0 && l.h > 0) || !Array.isArray(l.cells) || l.cells.length !== l.w * l.h)
    throw new Error('The room size does not match its cells.');
  for (const c of l.cells) if (!isCell(c)) throw new Error('Unknown tile: ' + c);
  for (const e of l.entities) {
    if (!KINDS.includes(e.kind)) throw new Error('Unknown piece: ' + e.kind);
    if (e.turret) checkTurret(e.turret);
    if (MOVES.includes(e.kind) && e.mode && !MODES.includes(e.mode)) throw new Error('Unknown clock: ' + e.mode);
  }
  if (!['tile', 'slide'].includes(l.clock)) throw new Error('Unknown clock: ' + l.clock);
  // Powers that no longer exist (Hook, the boots) are dropped from old rooms.
  const powers = Object.fromEntries(Object.entries(l.powers || {}).filter(([p]) => POWERS.includes(p)));
  return { ...emptyLevel(l.w, l.h), ...l, powers: { ...emptyLevel().powers, ...powers } };
}

export function isCell(c) {
  if (c === '' || c === 'wall' || c === 'checkpoint') return true;
  if (c.startsWith('receiver:')) return COLOURS.includes(c.slice(9));
  if (c.startsWith('sensor:')) return COLOURS.includes(c.slice(7));
  if (c === 'death' || c === 'water' || c === 'sticky' || c === 'gravel' || c === 'goal') return true;
  if (c.startsWith('spring:')) return CLOCKWISE.includes(c.slice(7));
  if (c.startsWith('gate:')) { const ds = c.slice(5).split(','); return ds.length > 0 && new Set(ds).size === ds.length && ds.every(d => CLOCKWISE.includes(d)); }
  if (c.startsWith('tri:')) return CORNERS.includes(c.slice(4));
  const [kind, colour] = c.split(':');
  return (kind === 'button' || kind === 'door' || kind === 'idoor') && COLOURS.includes(colour);
}

// Adds (delta 1) or cuts (delta -1) one row or column on a side, moving everything with
// it. Returns null when the cut would remove the start or go below 3 tiles.
export function resizeSide(level, side, delta) {
  const dx = side === 'left' ? delta : 0, dy = side === 'top' ? delta : 0;
  const w = level.w + (side === 'left' || side === 'right' ? delta : 0), h = level.h + (side === 'top' || side === 'bottom' ? delta : 0);
  if (w < 3 || h < 3 || w > 40 || h > 30) return null;
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;
  const start = { x: level.start.x + dx, y: level.start.y + dy };
  if (!inside(start.x, start.y)) return null;
  const cells = Array(w * h).fill('');
  for (let y = 0; y < level.h; y++) for (let x = 0; x < level.w; x++) if (inside(x + dx, y + dy)) cells[(y + dy) * w + x + dx] = level.cells[y * level.w + x];
  const entities = level.entities.map(e => ({ ...e, x: e.x + dx, y: e.y + dy })).filter(e => inside(e.x, e.y));
  return { ...level, w, h, cells, start, entities };
}

// A side's grip: n > 0 adds n lines, n < 0 cuts them. When that edge is a wall border, the
// border moves with the grip, so a line goes in or out just inside it and the border stays
// whole. A cut only takes lines that hold nothing you placed; otherwise it returns null.
export function moveSide(level, side, n) {
  let l = level;
  for (let i = 0; i < Math.abs(n); i++) if (!(l = (n > 0 ? growOnce : cutOnce)(l, side))) return null;
  return l;
}

const across = side => side === 'left' || side === 'right';
// The cells of line k on that axis, as [x, y].
const lineOf = (l, side, k) => across(side) ? [...Array(l.h).keys()].map(y => [k, y]) : [...Array(l.w).keys()].map(x => [x, k]);
const edgeIndex = (l, side) => side === 'left' || side === 'top' ? 0 : (across(side) ? l.w : l.h) - 1;
const bordered = (l, side) => lineOf(l, side, edgeIndex(l, side)).every(([x, y]) => l.cells[y * l.w + x] === 'wall');

function cutOnce(l, side) {
  const len = across(side) ? l.w : l.h;
  if (len <= 3) return null;
  const wall = bordered(l, side), k = wall ? (edgeIndex(l, side) === 0 ? 1 : len - 2) : edgeIndex(l, side);
  // Inside a border, the line's two ends sit in the other borders, and those walls may go.
  const end = ([x, y]) => across(side) ? y === 0 || y === l.h - 1 : x === 0 || x === l.w - 1;
  const clear = lineOf(l, side, k).every(([x, y]) => { const c = l.cells[y * l.w + x]; return c === '' || (wall && c === 'wall' && end([x, y])); });
  const at = o => (across(side) ? o.x : o.y) === k;
  if (!clear || at(l.start) || l.entities.some(at)) return null;
  const w = l.w - (across(side) ? 1 : 0), h = l.h - (across(side) ? 0 : 1);
  const keep = (x, y) => (across(side) ? x : y) !== k;
  const shift = o => ({ ...o, x: across(side) && o.x > k ? o.x - 1 : o.x, y: !across(side) && o.y > k ? o.y - 1 : o.y });
  const cells = [];
  for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (keep(x, y)) cells.push(l.cells[y * l.w + x]);
  return { ...l, w, h, cells, start: shift(l.start), entities: l.entities.map(shift) };
}

function growOnce(l, side) {
  if (!bordered(l, side)) return resizeSide(l, side, 1);
  const w = l.w + (across(side) ? 1 : 0), h = l.h + (across(side) ? 0 : 1);
  if (w > 40 || h > 30) return null;
  // The new line goes just inside the border; its ends join the other borders.
  const k = edgeIndex(l, side) === 0 ? 1 : (across(side) ? l.w : l.h) - 1;
  const shift = o => ({ ...o, x: across(side) && o.x >= k ? o.x + 1 : o.x, y: !across(side) && o.y >= k ? o.y + 1 : o.y });
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const isNew = (across(side) ? x : y) === k;
    if (isNew) { const end = across(side) ? y === 0 || y === h - 1 : x === 0 || x === w - 1; cells.push(end && l.cells[0] === 'wall' ? 'wall' : ''); continue; }
    const ox = across(side) && x > k ? x - 1 : x, oy = !across(side) && y > k ? y - 1 : y;
    cells.push(l.cells[oy * l.w + ox]);
  }
  return { ...l, w, h, cells, start: shift(l.start), entities: l.entities.map(shift) };
}

// Walls on every edge tile, except where the start stands.
export function wallBorder(level) {
  const cells = [...level.cells], { w, h } = level;
  for (let i = 0; i < w * h; i++) {
    const x = i % w, y = (i - x) / w;
    if ((x === 0 || y === 0 || x === w - 1 || y === h - 1) && !(x === level.start.x && y === level.start.y)) cells[i] = 'wall';
  }
  const edge = e => e.x === 0 || e.y === 0 || e.x === w - 1 || e.y === h - 1;
  return { ...level, cells, entities: level.entities.filter(e => !edge(e)) };
}
