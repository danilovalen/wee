// Regions: copy a box of the room, clear it, rotate a copy, and paste it back. Pure:
// each takes a level or a clip and returns a new one. The start never moves.
import { CLOCKWISE } from '../rules/base.js';

const cw = d => CLOCKWISE[(CLOCKWISE.indexOf(d) + 1) % 4];
const CORNER_CW = { nw: 'ne', ne: 'se', se: 'sw', sw: 'nw' };

// r: {x0, y0, x1, y1}, corners in any order.
export const norm = r => ({ x0: Math.min(r.x0, r.x1), y0: Math.min(r.y0, r.y1), x1: Math.max(r.x0, r.x1), y1: Math.max(r.y0, r.y1) });
const inR = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

export function copyRegion(level, r) {
  r = norm(r);
  const w = r.x1 - r.x0 + 1, h = r.y1 - r.y0 + 1, cells = [];
  for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) cells.push(level.cells[y * level.w + x]);
  const entities = level.entities.filter(e => inR(r, e.x, e.y)).map(e => ({ ...JSON.parse(JSON.stringify(e)), x: e.x - r.x0, y: e.y - r.y0 }));
  return { w, h, cells, entities };
}

export function clearRegion(level, r) {
  r = norm(r);
  const cells = level.cells.map((c, i) => inR(r, i % level.w, Math.floor(i / level.w)) ? '' : c);
  return { ...level, cells, entities: level.entities.filter(e => !inR(r, e.x, e.y)) };
}

// A quarter turn clockwise, turning everything that has a direction with it.
function turnCell(c) {
  const [kind, v] = c.split(':');
  if (kind === 'spring') return 'spring:' + cw(v);
  if (kind === 'tri') return 'tri:' + CORNER_CW[v];
  if (kind === 'gate') return 'gate:' + CLOCKWISE.filter(d => v.split(',').map(cw).includes(d)).join(',');
  return c;
}
function turnPiece(e, h) {
  const t = { ...e, x: h - 1 - e.y, y: e.x };
  if (e.axis) { // h, +1 is right -> down; v, +1 is down -> left
    t.axis = e.axis === 'h' ? 'v' : 'h';
    t.dir = e.axis === 'h' ? (e.dir || 1) : -(e.dir || 1);
  }
  if (e.turret) t.turret = { ...e.turret, dirs: CLOCKWISE.filter(d => e.turret.dirs.map(cw).includes(d)) };
  return t;
}
export function rotateClip(clip) {
  const { w, h } = clip, cells = Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells[x * h + (h - 1 - y)] = turnCell(clip.cells[y * w + x]);
  return { w: h, h: w, cells, entities: clip.entities.map(e => turnPiece(e, h)) };
}

// Stamps a clip with its top-left at (x, y). What falls outside the room is dropped; a
// piece in the clip replaces one already there; the start's tile stays free.
export function pasteRegion(level, clip, x, y) {
  const cells = [...level.cells], isStart = (cx, cy) => cx === level.start.x && cy === level.start.y;
  const inside = (cx, cy) => cx >= 0 && cy >= 0 && cx < level.w && cy < level.h;
  for (let j = 0; j < clip.h; j++) for (let i = 0; i < clip.w; i++) {
    const cx = x + i, cy = y + j;
    if (inside(cx, cy) && !(isStart(cx, cy) && clip.cells[j * clip.w + i])) cells[cy * level.w + cx] = clip.cells[j * clip.w + i];
  }
  const placed = clip.entities.map(e => ({ ...JSON.parse(JSON.stringify(e)), x: e.x + x, y: e.y + y })).filter(e => inside(e.x, e.y) && !isStart(e.x, e.y));
  const taken = new Set(placed.map(e => e.x + ',' + e.y));
  return { ...level, cells, entities: [...level.entities.filter(e => !taken.has(e.x + ',' + e.y)), ...placed] };
}
