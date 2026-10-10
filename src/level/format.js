// The level file: an empty room, resizing, and parsing that refuses what it does not know.
import { CLOCKWISE, COLOURS, CORNERS, KINDS, MODES, MOVES } from '../rules/base.js';

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
    powers: { boomerang: true, dive: true, laser: true, cycle: true, hook: false, swim: false, light: false, armored: false },
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
  return { ...emptyLevel(l.w, l.h), ...l, powers: { ...emptyLevel().powers, ...l.powers } };
}

export function isCell(c) {
  if (c === '' || c === 'wall' || c === 'checkpoint') return true;
  if (c.startsWith('receiver:')) return COLOURS.includes(c.slice(9));
  if (c.startsWith('sensor:')) return COLOURS.includes(c.slice(7));
  if (c === 'death' || c === 'water' || c === 'sticky' || c === 'goal') return true;
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
