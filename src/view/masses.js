// Joined-up tiles: neighbouring walls, water, sticky puddles and death blocks are drawn as
// one mass each. Every cell is four quarters; a quarter reads its two side neighbours and
// the diagonal between them, so outer corners round, inner corners get a fillet and a
// solid block has no seams. Doors, switches and the rest stay one tile each (tiles.js).
import { INK, T, frame, pxTri } from './ink.js';
import { altSkin } from './look.js';
import { lineOf, tint, dk, lt, WHITE } from './crayon.js';
import { P } from './crayonSprites.js';

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


// A mass in the crayon look (docs/THEME.md): each cell is its face; a side that joins another cell of the
// mass draws nothing, so a mass has no seams. Every open side, whichever way it faces, gets the same line:
// 2 pixels outside it in a dark tint of the face, straight and whole (registers 861, 869). Inside the line an open side is lit (above and left) or shaded (below and right) 3 deep.
const B = 2, V = 3;
const FACE = { wall: P.wall, gravel: lt(P.wood, 0.3), water: P.blue, sticky: P.green, death: P.redS };
function drawMass(g, at, w, h, kind, isIn, opens) {
  const F = FACE[kind], face = tint(F), line = lineOf(F), hi = tint(lt(F, 0.45)), hi2 = tint(lt(F, 0.28)), lo = tint(dk(F, 0.28)), lo2 = tint(dk(F, 0.16));
  const cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isIn(x, y)) cells.push([x, y, opens(x, y)]);
  // The line first, under every face, so it is whole round the mass and a face never has line on it.
  g.fillStyle = line;
  for (const [x, y, [n, e, s, wv]] of cells) {
    const X = x * T, Y = y * T;
    if (n) { g.fillRect(X - (wv ? B : 0), Y - B, T + (wv ? B : 0) + (e ? B : 0), B); }
    if (s) { g.fillRect(X - (wv ? B : 0), Y + T, T + (wv ? B : 0) + (e ? B : 0), B); }
    if (wv) { g.fillRect(X - B, Y, B, T); }
    if (e) { g.fillRect(X + T, Y, B, T); }
  }
  for (const [x, y, [n, e, s, wv]] of cells) {
    const X = x * T, Y = y * T;
    g.fillStyle = face; g.fillRect(X, Y, T, T);
    if (n) { g.fillStyle = hi; g.fillRect(X, Y, T, V); }
    if (wv) { g.fillStyle = hi2; g.fillRect(X, Y + (n ? V : 0), V, T - (n ? V : 0)); }
    if (s) { g.fillStyle = lo; g.fillRect(X, Y + T - V, T, V); }
    if (e) { g.fillStyle = lo2; g.fillRect(X + T - V, Y + (n ? V : 0), V, T - (n ? V : 0) - (s ? V : 0)); }
    // An outer corner is cut one step: its cell goes to the line, so a block is never quite square.
    g.fillStyle = line;
    if (n && wv) g.fillRect(X, Y, B, B); if (n && e) g.fillRect(X + T - B, Y, B, B);
    if (s && wv) g.fillRect(X, Y + T - B, B, B); if (s && e) g.fillRect(X + T - B, Y + T - B, B, B);
  }
}
// What sits on each mass cell: vents and rivets, stones, bubbles, spikes, waves across the whole pool.
function decorate(g, at, w, h, kind, isIn = (x, y) => at(x, y) === kind) {
  const each = f => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (isIn(x, y)) f(x * T, y * T, x, y); };
  const px = (X, Y, x, y, c, ww = 1, hh = 1) => { g.fillStyle = c; g.fillRect(X + x, Y + y, ww, hh); };
  const F = FACE[kind];
  if (kind === 'wall') each((X, Y, x, y) => {
    // The block's other skin (register 613): lab tiles, a grout cross on every cell and a shine per tile.
    if (altSkin('block')) { px(X, Y, 0, 15, tint(dk(F, 0.3)), T, 2); px(X, Y, 15, 0, tint(dk(F, 0.3)), 2, T); for (const [a, b] of [[4, 4], [20, 4], [4, 20], [20, 20]]) px(X, Y, a, b, tint(lt(F, 0.5)), 3, 2); return; }
    // A rivet in each corner that an open side reaches (the sketch's wall, register 858).
    const o = (dx, dy) => at(x + dx, y + dy) !== 'wall' && !member(at(x + dx, y + dy), 'wall');
    for (const [cx, cy, a, b] of [[5, 5, -1, -1], [T - 7, 5, 1, -1], [5, T - 7, -1, 1], [T - 7, T - 7, 1, 1]]) if (o(a, 0) || o(0, b)) { px(X, Y, cx, cy, tint(dk(F, 0.4)), 2, 2); px(X, Y, cx, cy, tint(lt(F, 0.6)), 1, 1); }
    // One block in three wears vent slits, so a long wall is not a row of the same tile.
    if ((x * 7 + y * 13 + 100) % 3 === 0) for (const vy of [12, 15, 18]) { px(X, Y, 10, vy, tint(dk(F, 0.3)), 12, 1); px(X, Y, 10, vy + 1, tint(lt(F, 0.25)), 12, 1); }
  });
  else if (kind === 'gravel') each((X, Y) => { for (const [x, y] of [[6, 6], [18, 4], [25, 11], [10, 16], [21, 19], [5, 25], [16, 26]]) { px(X, Y, x, y, tint(P.mid), 4, 3); px(X, Y, x, y, tint(lt(P.mid, 0.5)), 2, 1); } });
  else if (kind === 'sticky') each((X, Y) => { px(X, Y, 10, 12, tint(lt(F, 0.6)), 3, 2); px(X, Y, 20, 17, tint(lt(F, 0.6)), 2, 2); px(X, Y, 14, 22, tint(dk(F, 0.3)), 3, 2); });
  else if (kind === 'death') each((X, Y) => { for (const [cx, cy] of [[8, 8], [24, 8], [16, 16], [8, 24], [24, 24]]) for (let r = 0; r < 8; r++) { const half = (r >> 1) + 1; for (let xx = -half; xx < half; xx++) px(X, Y, cx + xx, cy - 4 + r, tint(xx < 0 ? WHITE : P.top)); }  });
  else if (kind === 'water') {
    // Waves run across the whole pool, not tile by tile.
    const k = (frame.clock / 900) % 1; g.globalAlpha = 0.55;
    each((X, Y, x, y) => { for (const wy of [10, 22]) for (let wx = 0; wx < T; wx += 2) { g.fillStyle = INK.waterHi; g.fillRect(X + wx, Y + wy + 2 * Math.round(Math.sin(((X + wx) / T + k + y * 0.53) * Math.PI * 2)), 2, 2); } });
    g.globalAlpha = 1;
  }
}
function drawPixelMass(g, at, w, h, kind) {
  const isIn = (x, y) => at(x, y) === kind, o = (x, y) => at(x, y) !== kind;
  drawMass(g, at, w, h, kind, isIn, (x, y) => [o(x, y - 1), o(x + 1, y), o(x, y + 1), o(x - 1, y)]);
}
// The room's edge (register 869): outside the room is wall, so a tile at the edge that is not wall itself
// has that wall's line along its outer side, drawn here inside the tile. Without it the ring round a room
// had no line where it met the floor.
function drawEdgeLine(g, at, w, h) {
  if (!member(at(-1, 0), 'wall')) return;
  g.fillStyle = lineOf(FACE.wall);
  const open = (x, y) => !member(at(x, y), 'wall');
  for (let x = 0; x < w; x++) { if (open(x, 0)) g.fillRect(x * T, 0, T, B); if (open(x, h - 1)) g.fillRect(x * T, h * T - B, T, B); }
  for (let y = 0; y < h; y++) { if (open(0, y)) g.fillRect(0, y * T, B, T); if (open(w - 1, y)) g.fillRect(w * T - B, y * T, B, T); }
}
function drawPixelWalls(g, at, w, h) {
  const isIn = (x, y) => { const c = at(x, y); return member(c, 'wall') && !c.startsWith('tri:'); };
  const open = (x, y, dx, dy, side) => !joins(at(x + dx, y + dy), 'wall', side);
  drawMass(g, at, w, h, 'wall', isIn, (x, y) => [open(x, y, 0, -1, 's'), open(x, y, 1, 0, 'w'), open(x, y, 0, 1, 'n'), open(x, y, -1, 0, 'e')]);
  decorate(g, at, w, h, 'wall', (x, y) => at(x, y) === 'wall');
  drawEdgeLine(g, at, w, h);
}

// cells: the room's cells; skip(x, y): a cell drawn on its own this frame (one popping in).
// The kind at (x, y), with everything outside the room counting as wall, so the border
// joins the room's own walls.
export const kindIn = (cells, w, h, outside = 'wall') => (x, y) => x < 0 || y < 0 || x >= w || y >= h ? outside : cells[y * w + x];

// outside: what lies past the room's edge. 'wall' joins the edge walls to it; '' gives them a line there.
export function drawMasses(g, cells, w, h, skip = () => false, outside = 'wall') {
  const kindAt = kindIn(cells, w, h, outside);
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
        g.fillStyle = lineOf(P.wall); pxTri(g, X, Y, T, k); g.fillStyle = tint(lt(P.wall, 0.45)); pxTri(g, X + (ox ? 2 : 0), Y + (oy ? 2 : 0), T - 2, k); g.fillStyle = tint(P.wall); pxTri(g, X + ox + (ox ? 1 : 0), Y + oy + (oy ? 1 : 0), T - i - 1, k);
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
