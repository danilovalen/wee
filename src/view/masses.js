// Joined-up tiles: neighbouring walls, water, sticky puddles and death blocks are drawn as
// one mass each. Every cell is four quarters; a quarter reads its two side neighbours and
// the diagonal between them, so outer corners round, inner corners get a fillet and a
// solid block has no seams. Doors, switches and the rest stay one tile each (tiles.js).
import { INK, T, frame, pxTri } from './ink.js';
import { altSkin } from './look.js';

export const MASSES = ['wall', 'water', 'sticky', 'gravel', 'death'];

// Blocks with something on them (a spring, a laser catcher, cracks) are still walls, and a
// triangle is a wall along its two straight sides.
const BLOCK = /^(spring:|crack$)/;
const OPPOSITE = { nw: 'se', ne: 'sw', sw: 'ne', se: 'nw' };
const member = (c, kind) => kind === 'wall' ? c === 'wall' || BLOCK.test(c) || /^tri:/.test(c) : c === kind;
// Does cell c belong to the mass on its side (n, e, s, w) or corner (nw ...) facing the asker?
export function joins(c, kind, side) {
  if (!member(c, kind)) return false;
  if (!c.startsWith('tri:')) return true;
  const k = c.slice(4);
  return side.length === 1 ? k.includes(side) : side !== OPPOSITE[k];
}
export const inMass = c => !!c && (MASSES.includes(c) || BLOCK.test(c) || c.startsWith('tri:'));
// The ones that keep a drawing of their own on top of the mass.
export const overlay = c => BLOCK.test(c);

// What one quarter of cell (x, y) draws, toward (dx, dy): 'round' (an outer corner),
// 'full', 'tri' for a triangle (drawn whole), or for a cell outside the mass, 'fillet' when
// both sides and the diagonal belong to it, else null. Outside the room counts as wall.
export function quarter(kindAt, kind, x, y, dx, dy) {
  const self = kindAt(x, y), h = dx > 0 ? 'w' : 'e', v = dy > 0 ? 'n' : 's';
  const A = joins(kindAt(x + dx, y), kind, h), B = joins(kindAt(x, y + dy), kind, v), D = joins(kindAt(x + dx, y + dy), kind, v + h);
  if (member(self, kind)) return self.startsWith('tri:') ? 'tri' : !A && !B ? 'round' : 'full';
  return A && B && D ? 'fillet' : null;
}


// A wall cell in pixels (2 units each): the face, a two-step bevel on each side that does not join
// another wall (light above and left, dark below and right), and a two-step stair cut from each outer
// corner. Sides that join draw nothing, so a mass has no seams.
const PX = 2, SHADE = { lite2: '#5b595c', dark2: '#403e41' };
// Each other mass's face and its bevels (null: no bevel on that side).
const LOOK = {
  gravel: { face: INK.gravel, lite: [INK.gravelHi, null], dark: [INK.gravelDot, null] },
  water: { face: INK.water, lite: [INK.waterHi, null], dark: null },
  sticky: { face: INK.goo, lite: [null, null], dark: [INK.gooDark, INK.gooDark] },
  death: { face: INK.deathBg, lite: ['#8f2a45', null], dark: ['#19181a', null] },
};
function drawPixelMass(g, at, w, h, kind) {
  const L = LOOK[kind], open = (x, y) => at(x, y) !== kind;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (at(x, y) !== kind) continue;
    const X = x * T, Y = y * T, n = open(x, y - 1), s = open(x, y + 1), wv = open(x - 1, y), e = open(x + 1, y);
    g.fillStyle = L.face; g.fillRect(X, Y, T, T);
    const band = (cs, horiz, near) => { if (!cs) return; cs.forEach((c, i) => { if (!c) return; g.fillStyle = c; const o = near ? i * PX : T - (i + 1) * PX; if (horiz) g.fillRect(X, Y + o, T, PX); else g.fillRect(X + o, Y, PX, T); }); };
    if (n) band(L.lite, true, true); if (wv) band(L.lite, false, true);
    if (s) band(L.dark, true, false); if (e) band(L.dark, false, false);
    const floor = (cx, cy, sx, sy) => { g.fillStyle = INK.floor; g.fillRect(cx, cy, PX, PX); g.fillRect(cx + sx * PX, cy, PX, PX); g.fillRect(cx, cy + sy * PX, PX, PX); };
    if (n && wv) floor(X, Y, 1, 1);
    if (n && e) floor(X + T - PX, Y, -1, 1);
    if (s && wv) floor(X, Y + T - PX, 1, -1);
    if (s && e) floor(X + T - PX, Y + T - PX, -1, -1);
  }
}
// What sits on each mass cell, in whole pixels: grit, waves across the pool, bubbles, spikes.
function decorate(g, at, w, h, kind) {
  const cellsOf = f => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (at(x, y) === kind) f(x * T, y * T, x, y); };
  const px = (X, Y, x, y, c) => { g.fillStyle = c; g.fillRect(X + x * PX, Y + y * PX, PX, PX); };
  if (kind === 'gravel') cellsOf((X, Y) => { for (const [x, y] of [[3, 3], [9, 2], [12, 6], [5, 8], [10, 10], [3, 12], [8, 13]]) { px(X, Y, x, y, INK.gravelDot); px(X, Y, x + 1, y, INK.gravelHi); } });
  else if (kind === 'sticky') cellsOf((X, Y) => { px(X, Y, 5, 6, '#fcfcfa'); px(X, Y, 10, 8, '#fcfcfa'); });
  else if (kind === 'death') cellsOf((X, Y) => { for (const [cx, cy] of [[4, 4], [11, 4], [8, 8], [4, 11], [11, 11]]) { px(X, Y, cx, cy - 2, INK.deathSpike); for (const dx of [-1, 0]) { px(X, Y, cx + dx, cy - 1, INK.deathSpike); px(X, Y, cx + dx, cy, INK.deathSpike); } for (const dx of [-2, -1, 0, 1]) px(X, Y, cx + dx, cy + 1, INK.deathSpike); px(X, Y, cx, cy - 1, '#fcfcfa'); } });
  else if (kind === 'water') {
    // Waves run across the whole pool, not tile by tile.
    const k = (frame.clock / 900) % 1; g.globalAlpha = 0.55;
    cellsOf((X, Y, x, y) => { for (const wy of [10, 22]) for (let wx = 0; wx < T; wx += PX) { g.fillStyle = INK.waterHi; g.fillRect(X + wx, Y + wy + PX * Math.round(Math.sin(((X + wx) / T + k + y * 0.53) * Math.PI * 2)), PX, PX); } });
    g.globalAlpha = 1;
  }
}
function drawPixelWalls(g, at, w, h) {
  const open = (x, y, dx, dy, side) => !joins(at(x + dx, y + dy), 'wall', side);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = at(x, y);
    if (!member(c, 'wall') || c.startsWith('tri:')) continue;
    const X = x * T, Y = y * T, n = open(x, y, 0, -1, 's'), s = open(x, y, 0, 1, 'n'), wv = open(x, y, -1, 0, 'e'), e = open(x, y, 1, 0, 'w');
    g.fillStyle = INK.wall; g.fillRect(X, Y, T, T);
    const band = (c1, c2, horiz, near) => {
      g.fillStyle = c1;
      if (horiz) g.fillRect(X, near ? Y : Y + T - PX, T, PX); else g.fillRect(near ? X : X + T - PX, Y, PX, T);
      g.fillStyle = c2;
      if (horiz) g.fillRect(X, near ? Y + PX : Y + T - 2 * PX, T, PX); else g.fillRect(near ? X + PX : X + T - 2 * PX, Y, PX, T);
    };
    if (n) band(INK.wallTop, SHADE.lite2, true, true);
    if (wv) band(INK.wallTop, SHADE.lite2, false, true);
    if (s) band(INK.crack, SHADE.dark2, true, false);
    if (e) band(INK.crack, SHADE.dark2, false, false);
    // Outer corners: cut a two-step stair so the floor shows through.
    const floor = (cx, cy, sx, sy) => { g.fillStyle = INK.floor; g.fillRect(cx, cy, PX, PX); g.fillRect(cx + sx * PX, cy, PX, PX); g.fillRect(cx, cy + sy * PX, PX, PX); };
    if (n && wv) floor(X, Y, 1, 1);
    if (n && e) floor(X + T - PX, Y, -1, 1);
    if (s && wv) floor(X, Y + T - PX, 1, -1);
    if (s && e) floor(X + T - PX, Y + T - PX, -1, -1);
    // The block's other skin (register 613): lab tiles, a grout cross on every cell and a shine per tile.
    if (altSkin('block')) {
      g.fillStyle = INK.crack; g.fillRect(X, Y + T / 2 - PX, T, PX); g.fillRect(X + T / 2 - PX, Y, PX, T);
      g.fillStyle = INK.mark; for (const [a, b] of [[3, 3], [11, 3], [3, 11], [11, 11]]) g.fillRect(X + a * PX, Y + b * PX, PX, PX);
    }
  }
}

// cells: the room's cells; skip(x, y): a cell drawn on its own this frame (one popping in).
// The kind at (x, y), with everything outside the room counting as wall, so the border
// joins the room's own walls.
export const kindIn = (cells, w, h) => (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 'wall' : cells[y * w + x];

export function drawMasses(g, cells, w, h, skip = () => false) {
  const kindAt = kindIn(cells, w, h);
  const held = (x, y) => skip(x, y) && kindAt(x, y) !== '';
  const at = (x, y) => held(x, y) ? '' : kindAt(x, y);
  for (const kind of ['gravel', 'water', 'sticky', 'death', 'wall']) {
    if (kind !== 'wall' && !cells.includes(kind)) continue;
    g.save();
    if (kind === 'wall') {
      // Blocks are pixel masses (registers 602, 605); a triangle keeps its smooth shape.
      g.restore(); drawPixelWalls(g, at, w, h); g.save();
      // A triangle is pixel stairs too (register 621): a light slope, the face set in from it.
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const c = at(x, y); if (!c || !c.startsWith('tri:')) continue;
        const k = c.slice(4), X = x * T, Y = y * T, i = 4, ox = k.endsWith('w') ? 0 : i, oy = k.startsWith('n') ? 0 : i;
        g.fillStyle = INK.wallTop; pxTri(g, X, Y, T, k); g.fillStyle = INK.wall; pxTri(g, X + ox, Y + oy, T - i, k);
      }
    } else {
      // Gravel, water, goo and spikes are pixel masses too (register 607), with their marks on top.
      g.restore(); drawPixelMass(g, at, w, h, kind); g.save();
      decorate(g, at, w, h, kind);
    }
    g.restore();
  }
}

// The wall ring round a room (register 672), as the cells of a room two wider and two taller: the room's
// own blocks inside it, so a block on the room's edge joins the ring (682). loose: tiles whose block stands alone.
export function ringCells(level, loose = new Set()) {
  const w = level.w + 2, h = level.h + 2;
  const inner = level.cells.map((c, i) => !loose.has(i) && (c === 'wall' || /^(spring:|crack$|tri:)/.test(c)) ? c : '');
  return Array.from({ length: w * h }, (_, i) => { const x = i % w, y = (i - x) / w; return x === 0 || y === 0 || x === w - 1 || y === h - 1 ? 'wall' : inner[(y - 1) * level.w + x - 1]; });
}
