// Joined-up tiles: neighbouring walls, water, sticky puddles and death blocks are drawn as
// one mass each. Every cell is four quarters; a quarter reads its two side neighbours and
// the diagonal between them, so outer corners round, inner corners get a fillet and a
// solid block has no seams. Doors, switches and the rest stay one tile each (tiles.js).
import { INK, T, frame } from './ink.js';
import { grit } from './tiles.js';

export const MASSES = ['wall', 'water', 'sticky', 'gravel', 'death'];
// Corner radius per kind, in pixels of a 32 px tile.
export const RADIUS = { wall: 6, water: 8, sticky: 10, gravel: 6, death: 6 };
const LIP = 6;

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

function path(kindAt, kind, w, h) {
  const p = new Path2D(), r = RADIUS[kind], q = T / 2, f = r;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const how = quarter(kindAt, kind, x, y, dx, dy);
      if (!how) continue;
      const qx = x * T + (dx > 0 ? q : 0), qy = y * T + (dy > 0 ? q : 0);
      if (how === 'full') { p.rect(qx, qy, q, q); continue; }
      if (how === 'tri') {
        if (dx > 0 || dy > 0) continue;
        const X = x * T, Y = y * T, pts = { nw: [[0, 0], [T, 0], [0, T]], ne: [[0, 0], [T, 0], [T, T]], sw: [[0, 0], [0, T], [T, T]], se: [[T, 0], [T, T], [0, T]] }[kindAt(x, y).slice(4)];
        p.moveTo(X + pts[0][0], Y + pts[0][1]); p.lineTo(X + pts[1][0], Y + pts[1][1]); p.lineTo(X + pts[2][0], Y + pts[2][1]); p.closePath(); continue;
      }
      if (how === 'round') {
        const radii = [0, 0, 0, 0]; radii[dy < 0 ? (dx < 0 ? 0 : 1) : (dx < 0 ? 3 : 2)] = r;
        p.roundRect(qx, qy, q, q, radii); continue;
      }
      // The fillet sits in this empty cell's corner, curving between the two walls beside it.
      const cx = dx > 0 ? qx + q : qx, cy = dy > 0 ? qy + q : qy;
      p.moveTo(cx, cy); p.lineTo(cx - dx * f, cy);
      p.arcTo(cx, cy, cx, cy - dy * f, f);
      p.closePath();
    }
  }
  return p;
}

// A wall cell in pixels (2 units each): the face, a two-step bevel on each side that does not join
// another wall (light above and left, dark below and right), and a two-step stair cut from each outer
// corner. Sides that join draw nothing, so a mass has no seams.
const PX = 2, SHADE = { lite2: '#666466', dark2: '#4d4b4e' };
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
    const p = path(at, kind, w, h);
    g.save();
    if (kind === 'wall') {
      // Blocks are pixel masses (registers 602, 605); a triangle keeps its smooth shape.
      g.restore(); drawPixelWalls(g, at, w, h); g.save();
      const tris = path((x, y) => { const c = at(x, y); return c && c.startsWith('tri:') ? c : ''; }, kind, w, h);
      g.fillStyle = INK.wallTop; g.fill(tris); g.clip(tris); g.translate(0, LIP); g.fillStyle = INK.wall; g.fill(tris);
    } else if (kind === 'gravel') {
      g.fillStyle = INK.gravel; g.fill(p);
      for (let i = 0; i < cells.length; i++) if (at(i % w, Math.floor(i / w)) === 'gravel') grit(g, (i % w) * T, Math.floor(i / w) * T);
    } else if (kind === 'water') {
      g.fillStyle = INK.water; g.fill(p); g.clip(p);
      // Waves run across the whole pool, not tile by tile.
      g.strokeStyle = INK.waterHi; g.globalAlpha = 0.55; g.lineWidth = 1.5;
      const k = (frame.clock / 900) % 1;
      for (let y = 0; y < h; y++) for (const wy of [10, 22]) {
        g.beginPath();
        for (let wx = 0; wx <= w * T; wx += 4) g.lineTo(wx, y * T + wy + Math.sin((wx / T + k + y * 0.53) * Math.PI * 2) * 2);
        g.stroke();
      }
    } else if (kind === 'sticky') {
      g.fillStyle = INK.gooDark; g.fill(p); g.clip(p); g.translate(0, -3); g.fillStyle = INK.goo; g.fill(p); g.translate(0, 3);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.beginPath();
      for (let i = 0; i < cells.length; i++) if (at(i % w, Math.floor(i / w)) === 'sticky') {
        const X = (i % w) * T, Y = Math.floor(i / w) * T;
        g.moveTo(X + 13.8, Y + 13); g.arc(X + 12, Y + 13, 1.8, 0, Math.PI * 2); g.moveTo(X + 21.2, Y + 17); g.arc(X + 20, Y + 17, 1.2, 0, Math.PI * 2);
      }
      g.fill();
    } else {
      g.fillStyle = INK.deathBg; g.fill(p);
      g.fillStyle = INK.deathSpike; g.beginPath();
      for (let i = 0; i < cells.length; i++) if (at(i % w, Math.floor(i / w)) === 'death') {
        const X = (i % w) * T, Y = Math.floor(i / w) * T;
        for (const [cx, cy] of [[9, 9], [23, 9], [16, 16], [9, 23], [23, 23]]) { g.moveTo(X + cx, Y + cy - 5); g.lineTo(X + cx + 4, Y + cy + 4); g.lineTo(X + cx - 4, Y + cy + 4); g.closePath(); }
      }
      g.fill();
    }
    g.restore();
  }
}
