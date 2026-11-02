// Pixel sprites of the neon lab look (register 602, docs/lab-neon-sketch.html): 16x16 art pixels on a
// 32-unit tile, so one art pixel is 2 units. Each sprite is built once from simple shapes, kept as runs
// of one colour per row, and drawn with whole-unit rectangles so it stays sharp at any zoom.
import { INK } from './ink.js';

const N = 16, PX = 2;
const grid = () => Array.from({ length: N }, () => Array(N).fill(null));
const inside = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
function ellipse(g, cx, cy, rx, ry, c) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (inside(x, y, cx, cy, rx, ry)) g[y][x] = c; }
function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = c; }
function line(g, x0, y0, x1, y1, c) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / (n || 1)), y = Math.round(y0 + (y1 - y0) * i / (n || 1)); if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; }
}

const C = {
  blobH: '#e6f8d0', blobM: '#c3eb9a', blob: '#a9dc76', blobS: '#6f9e45', blobD: '#4f7432', eye: '#221f22', white: '#fcfcfa',
  berryH: '#c9f4fa', berry: '#78dce8', berryS: '#3f9aa6', berryD: '#2b6f78', leaf: '#6f9e45',
  boxL: '#a59f85', box: '#857f6a', boxD: '#5e5a4a',
};

const BUILD = {
  // A gel drop: dark rim, body, lighter belly, a shine, two eyes, a squashed base.
  blob() {
    const g = grid();
    ellipse(g, 8, 9.5, 7.5, 6.5, C.blobD); ellipse(g, 8, 9.2, 6.6, 5.7, C.blob); ellipse(g, 8, 10.4, 4.5, 3.4, C.blobM);
    ellipse(g, 5, 6.5, 1.8, 1.3, C.blobH); g[5][4] = C.white; box(g, 2, 14, 13, 14, C.blobS); box(g, 4, 15, 11, 15, C.blobD);
    box(g, 6, 9, 6, 10, C.eye); box(g, 10, 9, 10, 10, C.eye); g[9][6] = C.white;
    return g;
  },
  // A cyan berry (register 604): round, a crown on top, a shine, a small leaf.
  berry() {
    const g = grid();
    ellipse(g, 8, 9.5, 6.6, 6, C.berryS); ellipse(g, 7.7, 9.2, 5.8, 5.2, C.berry);
    ellipse(g, 5.4, 7.6, 1.7, 1.3, C.berryH); g[7][5] = C.white;
    box(g, 7, 4, 9, 4, C.berryD); g[3][7] = C.berryD; g[3][9] = C.berryD; g[5][8] = C.berryD;
    line(g, 9, 3, 11, 1, C.leaf); box(g, 11, 1, 13, 2, C.leaf);
    return g;
  },
  // A crate: 1-pixel outline, light top-left edge, plank seams, a brace, nails.
  box() {
    const g = grid(); box(g, 0, 0, 15, 15, C.box);
    box(g, 0, 0, 15, 0, C.boxD); box(g, 0, 15, 15, 15, C.boxD); box(g, 0, 0, 0, 15, C.boxD); box(g, 15, 0, 15, 15, C.boxD);
    box(g, 1, 1, 14, 1, C.boxL); box(g, 1, 1, 1, 14, C.boxL);
    box(g, 1, 5, 14, 5, C.boxD); box(g, 1, 10, 14, 10, C.boxD); box(g, 2, 6, 14, 6, C.boxL); box(g, 2, 11, 14, 11, C.boxL);
    line(g, 2, 13, 13, 2, C.boxD); line(g, 2, 12, 12, 2, C.boxL);
    for (const [x, y] of [[3, 3], [12, 3], [3, 8], [12, 8], [3, 13], [12, 13]]) g[y][x] = C.boxD;
    return g;
  },
};

// Colour-keyed pieces take their colour (an INK colour name's hex) and derive a dark and a light step.
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixHex = (a, b, t) => '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
const steps = col => ({ c: col, d: mixHex(col, '#221f22', 0.45), l: mixHex(col, '#fcfcfa', 0.45) });
Object.assign(BUILD, {
  // A shut door: a frame, slats and a lit top edge in its colour.
  doorShut(col) {
    const { c, d, l } = steps(col), g = grid();
    box(g, 0, 0, 15, 15, d); box(g, 1, 1, 14, 14, c); box(g, 1, 1, 14, 1, l);
    for (const x of [4, 7, 10, 13]) box(g, x, 2, x, 14, d);
    box(g, 1, 8, 14, 8, d); box(g, 2, 9, 14, 9, l);
    return g;
  },
  // An open door: only its dashed frame.
  doorOpen(col) {
    const g = grid();
    for (let i = 1; i < 15; i++) if (i % 4 < 2) { g[1][i] = col; g[14][i] = col; g[i][1] = col; g[i][14] = col; }
    return g;
  },
  // A switch plate: a pill with a knob, left and hollow while off, right and filled while on.
  switchOff(col) {
    const { c, d } = steps(col), g = grid();
    box(g, 3, 5, 12, 10, c); box(g, 4, 6, 11, 9, d); g[5][3] = null; g[5][12] = null; g[10][3] = null; g[10][12] = null;
    box(g, 4, 6, 6, 9, c); box(g, 5, 6, 5, 6, mixHex(col, '#fcfcfa', 0.45));
    return g;
  },
  switchOn(col) {
    const { c, d } = steps(col), g = grid();
    box(g, 3, 5, 12, 10, c); g[5][3] = null; g[5][12] = null; g[10][3] = null; g[10][12] = null;
    box(g, 9, 6, 11, 9, '#fcfcfa'); g[9][11] = d;
    return g;
  },
  // A floor button: a faint ring and a cap, sunk lower while pressed.
  buttonUp(col) {
    const { c, d, l } = steps(col), g = grid();
    ellipse(g, 8, 8.5, 6, 6, d); ellipse(g, 8, 7.8, 4, 4, c); g[6][6] = l; g[6][7] = l;
    return g;
  },
  buttonDown(col) {
    const { c, d } = steps(col), g = grid();
    ellipse(g, 8, 8.5, 6, 6, d); ellipse(g, 8, 8.8, 3, 3, c);
    return g;
  },
  // A laser: only its barrels (register 493), one per direction it fires, the next to fire lit orange
  // (register 603). key: "right,down|right".
  laser(key) {
    const [dirs, next] = key.split('|'), g = grid();
    const turn = { right: (x, y) => [x, y], down: (x, y) => [15 - y, x], left: (x, y) => [15 - x, 15 - y], up: (x, y) => [y, 15 - x] };
    for (const d of dirs.split(',')) {
      const lit = d === next, body = lit ? INK.zap : '#727072', edge = lit ? '#c4643a' : '#403e41', tip = lit ? INK.zapCore : '#939293';
      const put = (x, y, c) => { const [X, Y] = turn[d](x, y); g[Y][X] = c; };
      for (let x = 6; x <= 15; x++) { put(x, 6, edge); put(x, 9, edge); put(x, 7, body); put(x, 8, body); }
      put(6, 7, edge); put(6, 8, edge); put(14, 7, tip); put(15, 7, tip); put(14, 8, tip); put(15, 8, tip);
    }
    return g;
  },
});

// A grid turned to face a direction, drawn facing right.
const turn = (g, d) => {
  const out = grid(), f = { right: (x, y) => [x, y], down: (x, y) => [15 - y, x], left: (x, y) => [15 - x, 15 - y], up: (x, y) => [y, 15 - x] }[d];
  g.forEach((row, y) => row.forEach((c, x) => { if (c) { const [X, Y] = f(x, y); out[Y][X] = c; } }));
  return out;
};
// A square slab with stair-cut corners: face, a light top-left edge and a dark bottom-right one.
function slab(g, x0, y0, x1, y1, face, light, dark) {
  box(g, x0, y0, x1, y1, face);
  if (light) { box(g, x0 + 1, y0, x1 - 1, y0, light); box(g, x0, y0 + 1, x0, y1 - 1, light); }
  if (dark) { box(g, x0 + 1, y1, x1 - 1, y1, dark); box(g, x1, y0 + 1, x1, y1 - 1, dark); }
  for (const [x, y] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) g[y][x] = null;
}
const W = { face: '#5b595c', light: '#727072', dark: '#4d4b4e', crack: '#403e41' };
Object.assign(BUILD, {
  // One wall block on its own (the palette's icon, and under a crack or a spring).
  wallFace() { const g = grid(); slab(g, 0, 0, 15, 15, W.face, W.light, W.dark); return g; },
  // Cracks across a block's face; with a face unless bare.
  crack(bare) {
    const g = grid(); if (bare !== 'bare') slab(g, 0, 0, 15, 15, W.face, W.light, W.dark);
    line(g, 2, 6, 6, 7, W.crack); line(g, 6, 7, 7, 4, W.crack); line(g, 7, 4, 11, 6, W.crack); line(g, 11, 6, 13, 5, W.crack);
    line(g, 6, 7, 7, 11, W.crack); line(g, 7, 11, 4, 14, W.crack); line(g, 7, 11, 10, 10, W.crack); line(g, 10, 10, 13, 13, W.crack);
    return g;
  },
  // A green puddle with two bubbles.
  sticky() {
    const g = grid(); ellipse(g, 8, 8.5, 6.5, 4.8, '#5a9a2b'); ellipse(g, 4.5, 6.5, 2.6, 2.1, '#5a9a2b'); ellipse(g, 11.5, 10.5, 2.6, 2.1, '#5a9a2b');
    ellipse(g, 8, 8, 5, 3.6, '#9be15d'); g[7][6] = '#e6f8d0'; g[9][10] = '#e6f8d0'; return g;
  },
  // Gravel: a sandy slab with grit.
  gravel() {
    const g = grid(); slab(g, 0, 0, 15, 15, '#dcb88f', null, null);
    for (const [x, y] of [[3, 3], [9, 2], [13, 5], [5, 8], [11, 9], [2, 12], [8, 13], [13, 13], [7, 5]]) { g[y][x] = '#a98058'; if (x + 1 < 15) g[y][x + 1] = '#f4e1c6'; }
    return g;
  },
  // Spikes on a dark red slab.
  death() {
    const g = grid(); slab(g, 0, 0, 15, 15, '#5c2a3a', '#7a3a4f', '#3f1c28');
    for (const [cx, cy] of [[4, 4], [11, 4], [8, 8], [4, 11], [11, 11]]) { g[cy - 2][cx] = '#ffb0c0'; box(g, cx - 1, cy - 1, cx, cy, '#ffb0c0'); box(g, cx - 2, cy + 1, cx + 1, cy + 1, '#ffb0c0'); g[cy - 1][cx] = '#fcfcfa'; }
    return g;
  },
  // A spring: a coil and a plate on the side it faces. key: "right" or "right|bare".
  spring(key) {
    const [d, bare] = key.split('|'), g = grid(), y = '#ffd866';
    if (bare !== 'bare') slab(g, 0, 0, 15, 15, W.face, W.light, W.dark);
    const c = grid();
    for (let i = 0; i < 4; i++) { line(c, 3 + i * 2, 4, 4 + i * 2, 11, y); }
    box(c, 3, 7, 11, 8, y); box(c, 12, 2, 13, 13, y);
    const t = turn(c, d); t.forEach((row, yy) => row.forEach((v, xx) => { if (v) g[yy][xx] = v; }));
    return g;
  },
  // A one-way gate: rails on the sides it blocks, a chevron for each way through. key: "dirs|colour|on".
  gate(key) {
    const [ds, col, on] = key.split('|'), dirs = ds.split(','), g = grid(), ink = col || '#a9dc76';
    box(g, 0, 0, 15, 15, '#403e41');
    if (on === '1') box(g, 1, 1, 14, 14, mixHex(ink, '#403e41', 0.6));
    const across = dirs.some(d => d === 'left' || d === 'right'), upDown = dirs.some(d => d === 'up' || d === 'down');
    if (!upDown) { box(g, 0, 0, 15, 1, W.face); box(g, 0, 14, 15, 15, W.face); }
    if (!across) { box(g, 0, 0, 1, 15, W.face); box(g, 14, 0, 15, 15, W.face); }
    for (const d of dirs) {
      const c = grid();
      for (let i = 0; i < 3; i++) { box(c, 9 + i, 5 + i, 10 + i, 5 + i, ink); box(c, 9 + i, 10 - i, 10 + i, 10 - i, ink); }
      const t = turn(c, d); t.forEach((row, yy) => row.forEach((v, xx) => { if (v) g[yy][xx] = v; }));
    }
    return g;
  },
  // A glass block a beam goes through, framed in its colour; its star filled while a beam crosses it. key: "hex|lit".
  sensor(key) {
    const [col, lit] = key.split('|'), g = grid();
    slab(g, 1, 1, 14, 14, mixHex(col, '#fcfcfa', 0.7), null, null);
    box(g, 2, 1, 13, 1, col); box(g, 2, 14, 13, 14, col); box(g, 1, 2, 1, 13, col); box(g, 14, 2, 14, 13, col);
    const st = ['.......', '...#...', '..###..', '#######', '.#####.', '.##.##.', '#.....#'];
    st.forEach((r, yy) => [...r].forEach((ch, xx) => { if (ch === '#') g[4 + yy][4 + xx] = lit === '1' ? col : mixHex(col, '#fcfcfa', 0.35); }));
    if (lit !== '1') for (let yy = 5; yy <= 9; yy++) for (let xx = 5; xx <= 9; xx++) if (g[yy][xx] === mixHex(col, '#fcfcfa', 0.35) && st[yy - 4][xx - 4] === '#' && [[1,0],[-1,0],[0,1],[0,-1]].every(([a, b]) => st[yy - 4 + b] && st[yy - 4 + b][xx - 4 + a] === '#')) g[yy][xx] = mixHex(col, '#fcfcfa', 0.7);
    return g;
  },
  // A checkpoint flag, bright once it is the one you would return to. key: "1" when active.
  checkpoint(active) {
    const g = grid(), f = active === '1' ? '#ffd866' : '#6b6150';
    box(g, 5, 3, 5, 13, '#c1c0c0'); box(g, 4, 13, 7, 13, '#939293');
    box(g, 6, 3, 9, 7, f); box(g, 10, 4, 11, 6, f); g[5][12] = f;
    return g;
  },
  // The negative of a door: dark inside, its colour on the rim and the bars; open, a dashed rim and a minus. key: "hex|open".
  idoor(key) {
    const [col, open] = key.split('|'), g = grid();
    if (open === '1') {
      for (let i = 1; i < 15; i++) if (i % 4 < 2) { g[1][i] = col; g[14][i] = col; g[i][1] = col; g[i][14] = col; }
      box(g, 5, 7, 10, 8, col);
    } else {
      slab(g, 1, 1, 14, 14, '#33363f', null, null);
      box(g, 2, 1, 13, 1, col); box(g, 2, 14, 13, 14, col); box(g, 1, 2, 1, 13, col); box(g, 14, 2, 14, 13, col);
      for (const x of [4, 7, 10]) box(g, x, 3, x + 1, 12, col);
    }
    return g;
  },
  // A mover: a teal slab with an arrow each way it slides. key: "h" or "v".
  mover(axis) {
    const g = grid(); slab(g, 1, 1, 14, 14, '#3fd8c4', '#b4f7ee', '#2a9c8d');
    const c = grid(), ink = '#2d2a2e';
    for (let i = 0; i < 3; i++) { box(c, 3 + i, 7 - i, 3 + i, 8 + i, ink); box(c, 12 - i, 7 - i, 12 - i, 8 + i, ink); }
    const t = axis === 'v' ? turn(c, 'down') : c; t.forEach((row, y) => row.forEach((v, x) => { if (v) g[y][x] = v; }));
    return g;
  },
  // An enemy: a pink diamond with two eyes that look the way it moves. key: "h|1" (axis|dir).
  enemy(key) {
    const [axis, dir] = key.split('|'), g = grid();
    for (let y = 1; y <= 14; y++) { const w = y <= 7.5 ? y - 1 : 14 - y; box(g, 7 - w, y, 8 + w, y, '#ff6188'); }
    const dx = axis === 'h' ? +dir : 0, dy = axis === 'v' ? +dir : 0;
    for (const ex of [5, 9]) { box(g, ex, 6, ex + 1, 8, '#fcfcfa'); g[7 + dy][ex + (dx > 0 ? 1 : 0)] = '#221f22'; }
    return g;
  },
  // A strong enemy: a crimson block with horns and yellow eyes. key: "h|1".
  strong(key) {
    const [axis, dir] = key.split('|'), g = grid();
    slab(g, 1, 2, 14, 15, '#d6456a', '#ffb0c0', '#8f2a45');
    box(g, 2, 0, 3, 1, '#ffb0c0'); box(g, 12, 0, 13, 1, '#ffb0c0');
    const dx = axis === 'h' ? +dir : 0, dy = axis === 'v' ? +dir : 0;
    for (const ex of [4, 9]) box(g, ex + dx, 7 + dy, ex + 2 + dx, 8 + dy, '#ffd866');
    return g;
  },
  // A heavy block: violet steel with four rivets.
  heavy() {
    const g = grid(); slab(g, 1, 1, 14, 14, '#9b8cff', '#c9c0ff', '#5b4fc8');
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) g[y][x] = '#e2ddff';
    return g;
  },
  // A bomb: a round body, a cap and a fuse of k lengths (2, 1 or 0).
  bomb(k) {
    const g = grid();
    if (k === 'hot') { ellipse(g, 8, 9.5, 5.6, 5.6, '#ff5a28'); return g; }
    ellipse(g, 8, 9.5, 5.6, 5.6, '#3d4256'); box(g, 5, 6, 6, 7, '#7d8399'); box(g, 7, 3, 9, 4, '#3d4256');
    const n = +k; if (n >= 1) { g[2][10] = '#b08a5c'; g[1][11] = '#b08a5c'; } if (n >= 2) { g[1][12] = '#b08a5c'; g[1][13] = '#b08a5c'; }
    return g;
  },
  // You, when a person plays (register 302): a round violet body with two eyes, about 20 units across.
  you() {
    const g = grid(); ellipse(g, 8, 8, 5.3, 5.3, '#4b3fd6'); ellipse(g, 8, 8, 4.4, 4.4, '#ab9df2');
    g[5][6] = '#ddd6ff'; box(g, 6, 7, 6, 7, '#7ef0ff'); box(g, 9, 7, 9, 7, '#7ef0ff');
    return g;
  },
  // A pushable laser's crate frame.
  crateFrame() {
    const g = grid(); for (let i = 2; i <= 13; i++) { g[1][i] = '#857f6a'; g[14][i] = '#857f6a'; g[i][1] = '#857f6a'; g[i][14] = '#857f6a'; }
    g[2][2] = '#857f6a'; g[2][13] = '#857f6a'; g[13][2] = '#857f6a'; g[13][13] = '#857f6a';
    return g;
  },
});

// Each sprite as rows of [x, length, colour] runs, built on first use.
const runs = new Map();
function runsOf(name, param) {
  const key = param ? name + ':' + param : name;
  if (runs.has(key)) return runs.get(key);
  const g = BUILD[name](param), out = [];
  // A run reaches half a unit into a filled neighbour to its right or below, which is painted after it, so a
  // zoom that is not a whole number leaves no hairline seams between pixels.
  g.forEach((row, y) => { for (let x = 0; x < N;) { const c = row[x]; let n = 1; while (x + n < N && row[x + n] === c) n++; if (c) out.push([x, y, n, c, x + n < N && !!row[x + n], y + 1 < N && row.slice(x, x + n).every((_, i) => g[y + 1][x + i])]); x += n; } });
  runs.set(key, out);
  return out;
}
export const SPRITES = Object.keys(BUILD);

// Draws a sprite with its top-left at (x, y) in room units; outline draws only its edge pixels (a hidden blob).
// colour: a hex for the colour-keyed pieces (doors, switches, buttons).
export function drawSprite(g, name, x, y, { outline = false, colour = null } = {}) {
  if (outline) {
    const grid = BUILD[name]();
    g.fillStyle = INK.player;
    grid.forEach((row, yy) => row.forEach((c, xx) => {
      if (!c) return;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !(grid[yy + dy] || [])[xx + dx]);
      if (edge && (xx + yy) % 2 === 0) g.fillRect(x + xx * PX, y + yy * PX, PX, PX);
    }));
    return;
  }
  for (const [rx, ry, n, c, r, d] of runsOf(name, colour)) { g.fillStyle = c; g.fillRect(x + rx * PX, y + ry * PX, n * PX + (r ? 0.5 : 0), PX + (d ? 0.5 : 0)); }
}
