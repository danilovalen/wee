// The level file: an empty room, resizing, and parsing that refuses what it does not know.
import { CLOCKWISE, COLOURS, CORNERS, KINDS, MODES, MOVES } from '../rules/base.js';

export function checkTurret(t) {
  if (!Array.isArray(t.dirs) || t.dirs.length < 1 || t.dirs.length > 4 || t.dirs.some(d => !CLOCKWISE.includes(d)) || new Set(t.dirs).size !== t.dirs.length)
    throw new Error('A turret needs one to four different directions.');
  if (!MODES.includes(t.mode)) throw new Error('Unknown turret clock: ' + t.mode);
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
