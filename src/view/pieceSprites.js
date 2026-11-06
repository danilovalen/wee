// The Sandbox's pieces as pixel sprites (register 607).
import { INK } from './ink.js';
import { grid, ellipse, box, line, turn, slab, steps, mixHex, W } from './pixel.js';

export const PIECE_SPRITES = {
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
    ellipse(g, 8, 8, 5, 3.6, '#a9dc76'); g[7][6] = '#fcfcfa'; g[9][10] = '#fcfcfa'; return g;
  },
  // Gravel: a sandy slab with grit.
  gravel() {
    const g = grid(); slab(g, 0, 0, 15, 15, '#857f6a', null, null);
    for (const [x, y] of [[3, 3], [9, 2], [13, 5], [5, 8], [11, 9], [2, 12], [8, 13], [13, 13], [7, 5]]) { g[y][x] = '#857f6a'; if (x + 1 < 15) g[y][x + 1] = '#fcfcfa'; }
    return g;
  },
  // Spikes on a dark red slab.
  death() {
    const g = grid(); slab(g, 0, 0, 15, 15, '#8f2a45', '#8f2a45', '#19181a');
    for (const [cx, cy] of [[4, 4], [11, 4], [8, 8], [4, 11], [11, 11]]) { g[cy - 2][cx] = '#ff6188'; box(g, cx - 1, cy - 1, cx, cy, '#ff6188'); box(g, cx - 2, cy + 1, cx + 1, cy + 1, '#ff6188'); g[cy - 1][cx] = '#fcfcfa'; }
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
  // A glass block a beam goes through, framed in its colour; its circle filled while a beam crosses it (register 792). key: "hex|lit".
  sensor(key) {
    const [col, lit] = key.split('|'), g = grid();
    slab(g, 1, 1, 14, 14, mixHex(col, '#fcfcfa', 0.7), null, null);
    box(g, 2, 1, 13, 1, col); box(g, 2, 14, 13, 14, col); box(g, 1, 2, 1, 13, col); box(g, 14, 2, 14, 13, col);
    const st = ['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..'];
    st.forEach((r, yy) => [...r].forEach((ch, xx) => { if (ch === '#') g[4 + yy][4 + xx] = lit === '1' ? col : mixHex(col, '#fcfcfa', 0.35); }));
    if (lit !== '1') for (let yy = 5; yy <= 9; yy++) for (let xx = 5; xx <= 9; xx++) if (g[yy][xx] === mixHex(col, '#fcfcfa', 0.35) && st[yy - 4][xx - 4] === '#' && [[1,0],[-1,0],[0,1],[0,-1]].every(([a, b]) => st[yy - 4 + b] && st[yy - 4 + b][xx - 4 + a] === '#')) g[yy][xx] = mixHex(col, '#fcfcfa', 0.7);
    return g;
  },
  // A checkpoint flag, bright once it is the one you would return to. key: "1" when active.
  checkpoint(active) {
    const g = grid(), f = active === '1' ? '#ffd866' : '#857f6a';
    box(g, 5, 3, 5, 13, '#939293'); box(g, 4, 13, 7, 13, '#939293');
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
      slab(g, 1, 1, 14, 14, '#403e41', null, null);
      box(g, 2, 1, 13, 1, col); box(g, 2, 14, 13, 14, col); box(g, 1, 2, 1, 13, col); box(g, 14, 2, 14, 13, col);
      for (const x of [4, 7, 10]) box(g, x, 3, x + 1, 12, col);
    }
    return g;
  },
  // A mover: a teal slab with an arrow each way it slides. key: "h" or "v".
  mover(axis) {
    const g = grid(); slab(g, 1, 1, 14, 14, '#78dce8', '#fcfcfa', '#5a9a2b');
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
    for (const ex of [5, 9]) { box(g, ex, 6, ex + 1, 8, '#fcfcfa'); g[7 + dy][ex + (dx > 0 ? 1 : 0)] = '#19181a'; }
    return g;
  },
  // A strong enemy: a crimson block with horns and yellow eyes. key: "h|1".
  strong(key) {
    const [axis, dir] = key.split('|'), g = grid();
    slab(g, 1, 2, 14, 15, '#ff6188', '#ff6188', '#8f2a45');
    box(g, 2, 0, 3, 1, '#ff6188'); box(g, 12, 0, 13, 1, '#ff6188');
    const dx = axis === 'h' ? +dir : 0, dy = axis === 'v' ? +dir : 0;
    for (const ex of [4, 9]) box(g, ex + dx, 7 + dy, ex + 2 + dx, 8 + dy, '#ffd866');
    return g;
  },
  // A heavy block: violet steel with four rivets.
  heavy() {
    const g = grid(); slab(g, 1, 1, 14, 14, '#ab9df2', '#ab9df2', '#4b3fd6');
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) g[y][x] = '#fcfcfa';
    return g;
  },
  // A bomb: a round body, a cap and a fuse of k lengths (2, 1 or 0).
  bomb(k) {
    const g = grid();
    if (k === 'hot') { ellipse(g, 8, 9.5, 5.6, 5.6, '#fc9867'); return g; }
    ellipse(g, 8, 9.5, 5.6, 5.6, '#403e41'); box(g, 5, 6, 6, 7, '#939293'); box(g, 7, 3, 9, 4, '#403e41');
    const n = +k; if (n >= 1) { g[2][10] = '#857f6a'; g[1][11] = '#857f6a'; } if (n >= 2) { g[1][12] = '#857f6a'; g[1][13] = '#857f6a'; }
    return g;
  },
  // The blob, everywhere (registers 302, 777): a round violet body with two eyes, about 20 units across.
  blob() {
    const g = grid(); ellipse(g, 8, 8, 5.3, 5.3, '#4b3fd6'); ellipse(g, 8, 8, 4.4, 4.4, '#ab9df2');
    g[5][6] = '#fcfcfa'; box(g, 6, 7, 6, 7, '#78dce8'); box(g, 9, 7, 9, 7, '#78dce8');
    return g;
  },
  // A pushable laser's crate frame.
  crateFrame() {
    const g = grid(); for (let i = 2; i <= 13; i++) { g[1][i] = '#857f6a'; g[14][i] = '#857f6a'; g[i][1] = '#857f6a'; g[i][14] = '#857f6a'; }
    g[2][2] = '#857f6a'; g[2][13] = '#857f6a'; g[13][2] = '#857f6a'; g[13][13] = '#857f6a';
    return g;
  },
};
