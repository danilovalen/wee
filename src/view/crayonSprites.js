// Every piece redrawn for the crayon look (registers 850, 852): 32 art pixels to a tile, seen from above as
// the sprite it replaces was, lit from the top left, with a shade, a shine and a feature of its own. The
// names and keys are the old ones, so nothing that draws a piece changes. crayon.js inks them.
import { sheet, dk, lt, EYE, WHITE, BLUSH } from './crayon.js';

// The palette's colours by name (look.js NEON): a palette repaints each, tones stay as drawn.
export const P = { deep: '#403e41', wall: '#5b595c', mid: '#727072', top: '#939293', hi: '#e8eef6', red: '#ff6188', redS: '#8f2a45', orange: '#fc9867', orangeS: '#c4643a', yellow: '#ffd866', wood: '#b08a5c', green: '#a9dc76', greenS: '#5a9a2b', blue: '#78dce8', blueS: '#3f9aa6', violet: '#ab9df2', violetS: '#4b3fd6' };
// One sheet stamped on another.
const stamp = (s, top) => { top.g.forEach((row, y) => row.forEach((c, x) => { if (c) s.put(x, y, c); })); return s; };
const rivets = (s, c, list) => { for (const [x, y] of list) { s.put(x, y, dk(c, 0.45)); s.put(x - 1, y - 1, lt(c, 0.6)); } return s; };
// A wall block's face: a slab, three vent slits and a rivet in each corner.
export function wallSheet(c = P.wall) {
  const s = sheet().slab(0, 0, 31, 31, c, 2);
  for (const y of [12, 15, 18]) s.rect(10, y, 21, y, dk(c, 0.3)).rect(10, y + 1, 21, y + 1, lt(c, 0.25));
  return rivets(s, c, [[5, 5], [27, 5], [5, 27], [27, 27]]);
}
const cracks = (s, c) => { for (const [a, b, x, y] of [[4, 12, 12, 14], [12, 14, 14, 8], [14, 8, 22, 12], [22, 12, 27, 10], [12, 14, 14, 22], [14, 22, 8, 28], [14, 22, 20, 20], [20, 20, 27, 26]]) s.line(a, b, x, y, c, 2); return s; };
// A coil across rows 8 to 23, from column x0 to x1, one zigzag every gap columns, shaded underneath.
function coil(s, x0, x1, gap) {
  for (let x = x0, up = true; x < x1; x += gap, up = !up) { const b = Math.min(x + gap, x1); s.line(x, up ? 22 : 8, b, up ? 8 : 22, dk(P.yellow, 0.3), 3).line(x, (up ? 22 : 8) - 1, b, (up ? 8 : 22) - 1, P.yellow, 2); }
  return s;
}
const plate = (s, x) => s.rect(x, 3, x + 5, 28, P.red).rect(x, 3, x + 5, 4, lt(P.red, 0.45)).rect(x, 5, x + 1, 28, lt(P.red, 0.3)).rect(x + 4, 5, x + 5, 28, dk(P.red, 0.25));
// A chevron pointing right, in colour c.
const chevron = (s, c) => { for (let i = 0; i < 6; i++) s.rect(18 + i, 10 + i, 21 + i, 11 + i, c).rect(18 + i, 20 - i, 21 + i, 21 - i, c); return s; };
const round = (c, r = 11.5, lump = 0.06) => sheet().oval(16, 16, r, r, c, lump).lit(16, 16, r + 0.5, r + 0.5, c);
const shine = (s, c, x = 11, y = 10) => { s.oval(x, y, 3, 1.8, lt(c, 0.6), 0, true); s.put(x - 3, y + 3, lt(c, 0.6)); return s; };
// Two eyes looking (dx, dy), for the ones that watch where they go.
const eyes = (s, x1, x2, y, dx = 0, dy = 0) => { for (const x of [x1, x2]) { s.rect(x, y, x + 4, y + 5, WHITE); s.rect(x + 1 + dx, y + 1 + dy, x + 3 + dx, y + 4 + dy, EYE); s.put(x + 1 + dx, y + 1 + dy, WHITE); } return s; };

// Where the blob looks and whether it blinks. key: "right", "up|b" (a way it faces, then b for a blink).
const gaze = key => { const [d, b] = String(key || '').split('|'); return [d === 'left' ? -1 : d === 'up' || d === 'down' ? 0 : 1, d === 'up' ? -1 : d === 'down' ? 1 : 0, b === 'b']; };

export const CRAYON_SPRITES = {
  // Armour (a power): a steel band round the blob with a rivet at each corner, hollow so the blob shows.
  armour() { const s = sheet().squircle(16, 16, 15.5, 15.5, P.hi, 3.2); for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if (Math.abs((x + 0.5 - 16) / 10.5) ** 3.2 + Math.abs((y + 0.5 - 16) / 10.5) ** 3.2 <= 1) s.g[y][x] = null; return rivets(s, P.hi, [[5, 5], [26, 5], [5, 26], [26, 26]]); },
  // The blob: round, lumpy, a face. Violet, as it has always been (register 855).
  blob(key) { const [lx, ly, shut] = gaze(key), s = sheet().squircle(16, 16.5, 12, 11.5, P.violet, 3.2, 0.035).lit(16, 16.5, 13.5, 13, P.violet); shine(s, P.violet, 10.5, 9.5); s.eye(10, 12, lx, shut, ly).eye(18, 12, lx, shut, ly).rect(8, 19, 9, 19, BLUSH).rect(23, 19, 24, 19, BLUSH).rect(14, 20, 17, 20, EYE); s.put(13, 19, EYE); s.put(18, 19, EYE); return s; },
  // Hero, the other look (register 777): a green gel drop with a wet belly, a tuft and a wide grin.
  blobAlt(key) { const [lx, ly, shut] = gaze(key), s = sheet().oval(16, 17, 12, 10.5, P.green, 0.09).oval(16, 6, 3, 3.5, P.green).lit(16, 17, 12.5, 11, P.green); s.oval(16, 21, 7, 4.5, lt(P.green, 0.35), 0, true); shine(s, P.green, 10, 11); s.eye(9, 12, lx, shut, ly).eye(19, 12, lx, shut, ly).rect(13, 21, 19, 21, EYE).rect(12, 20, 12, 20, EYE).rect(20, 20, 20, 20, EYE).rect(15, 22, 17, 22, WHITE); return s; },
  // The berry: round and blue, a crown where the flower was, a leaf, a few pale specks.
  berry() { const s = sheet().oval(16, 18, 11, 10.5, P.blue, 0.05).lit(16, 18, 11.5, 11, P.blue); shine(s, P.blue, 11, 12); for (const [x, y] of [[15, 20], [20, 16], [19, 23], [12, 23], [23, 20]]) s.put(x, y, lt(P.blue, 0.7)); s.rect(14, 8, 18, 9, dk(P.blue, 0.4)); s.put(13, 7, dk(P.blue, 0.4)); s.put(19, 7, dk(P.blue, 0.4)); s.put(16, 10, dk(P.blue, 0.4)); s.line(17, 7, 20, 3, P.wood, 2).oval(24, 4.5, 4.2, 2.6, P.green, 0.1).line(21, 5, 27, 4, dk(P.green, 0.3)); return s; },
  // A crate from above: its lid, three boards, a brace across them, a nail at each end.
  box() { const s = sheet().slab(1, 1, 30, 30, lt(P.wood, 0.25), 2); for (const y of [10, 20]) s.rect(3, y, 28, y, dk(P.wood, 0.25)).rect(3, y + 1, 28, y + 1, lt(P.wood, 0.5)); s.line(25, 4, 5, 26, dk(P.wood, 0.2), 3).line(25, 4, 6, 24, lt(P.wood, 0.5), 1); return rivets(s, P.wood, [[5, 6], [27, 6], [5, 15], [27, 16], [5, 25], [27, 26]]); },
  wallFace() { return wallSheet(); },
  // Cracks across a block's face; with a face unless bare.
  crack(bare) { return cracks(bare === 'bare' ? sheet() : wallSheet(), dk(P.wall, 0.5)); },
  // A green puddle with a slow bubble or two.
  sticky() { const s = sheet().oval(16, 17, 13, 9.5, P.green, 0.12).oval(9, 12, 5, 4, P.green).oval(23, 22, 5, 4, P.green).lit(16, 17, 14, 11, P.green); s.oval(13, 14, 3, 2, lt(P.green, 0.6), 0, true).oval(21, 19, 2, 2, dk(P.green, 0.3), 0, true); s.put(20, 18, lt(P.green, 0.7)); return s; },
  // Gravel: a sandy bed and loose stones.
  gravel() { const s = sheet().slab(0, 0, 31, 31, lt(P.wood, 0.3), 1); for (const [x, y, r] of [[6, 6, 2.2], [18, 4, 1.8], [26, 10, 2.4], [10, 16, 2.6], [22, 18, 2], [4, 24, 2], [16, 26, 2.4], [27, 26, 1.8], [14, 10, 1.6]]) s.oval(x, y, r, r * 0.8, P.mid, 0.1).oval(x - 0.6, y - 0.6, r * 0.5, r * 0.4, lt(P.mid, 0.5)); return s; },
  // Spikes from above: a red plate and five points, each a four-sided tip lit from the top left.
  death() { const s = sheet().slab(0, 0, 31, 31, P.redS, 2); for (const [cx, cy] of [[8, 8], [23, 8], [15.5, 15.5], [8, 23], [23, 23]]) for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) if (Math.abs(x) + Math.abs(y) <= 5) s.put(Math.floor(cx + x), Math.floor(cy + y), Math.abs(x) + Math.abs(y) <= 1 ? WHITE : x + y < 0 ? P.hi : x + y > 0 ? P.top : lt(P.top, 0.4)); return s; },
  // A spring (registers 827, 828): a pocket in the block on the side it faces, a coil squeezed in it and a
  // plate at its mouth. Out, the pocket holds only the coil leaving it; springArm draws the rest on the tile
  // in front. key: "right", "right|bare", "right||out". Drawn facing right, then turned.
  spring(key) {
    const [d, bare, out] = key.split('|'), c = sheet().rect(16, 5, 31, 26, dk(P.wall, 0.45)).rect(16, 5, 31, 6, dk(P.wall, 0.6));
    if (out === 'out') coil(c, 16, 32, 6); else plate(coil(c, 16, 25, 3), 26);
    return stamp(bare === 'bare' ? sheet() : wallSheet(), c.turned(d));
  },
  // An active spring's coil stretched across the tile it faces, its plate at the far side (register 828).
  springArm(d) { return plate(coil(sheet(), 0, 25, 6), 26).turned(d); },
  // A one-way: a dark plate, rails on the sides it blocks, a chevron for each way through. key: "dirs|colour|on".
  gate(key) {
    const [ds, col, on] = key.split('|'), dirs = ds.split(','), ink = col || P.green, s = sheet().slab(0, 0, 31, 31, P.deep, 1);
    if (on === '1') s.rect(2, 2, 29, 29, dk(ink, 0.55));
    const across = dirs.some(d => d === 'left' || d === 'right'), upDown = dirs.some(d => d === 'up' || d === 'down'), rail = (x0, y0, x1, y1) => s.rect(x0, y0, x1, y1, P.mid).rect(x0, y0, x1, y0, lt(P.mid, 0.4));
    if (!upDown) { rail(0, 0, 31, 3); rail(0, 28, 31, 31); }
    if (!across) { rail(0, 0, 3, 31); rail(28, 0, 31, 31); }
    for (const d of dirs) stamp(s, chevron(sheet(), ink).turned(d));
    return s;
  },
  // A glass block a beam goes through, framed in its colour; its lens filled while a beam crosses it (register 792). key: "hex|lit".
  sensor(key) {
    const [col, lit] = key.split('|'), s = sheet().slab(1, 1, 30, 30, lt(col, 0.72), 1);
    s.rect(1, 1, 30, 3, col).rect(1, 28, 30, 30, dk(col, 0.2)).rect(1, 1, 3, 30, col).rect(28, 1, 30, 30, dk(col, 0.2));
    s.oval(16, 16, 8, 8, dk(col, 0.25)).oval(16, 16, 6.2, 6.2, lit === '1' ? col : lt(col, 0.72));
    if (lit === '1') s.oval(13.5, 13.5, 2, 1.4, lt(col, 0.7)); else s.line(8, 23, 13, 18, lt(col, 0.9));
    return s;
  },
  // A checkpoint flag on its pole, bright once it is the one you would return to. key: "1" when active.
  checkpoint(active) { const f = active === '1' ? P.yellow : P.mid, s = sheet().oval(12, 27, 6, 2.5, P.top).rect(10, 5, 12, 27, P.hi).rect(12, 5, 12, 27, P.top); s.rect(13, 6, 20, 15, f).rect(21, 8, 24, 13, f).rect(25, 10, 26, 11, f).rect(13, 6, 24, 7, lt(f, 0.4)).rect(13, 14, 20, 15, dk(f, 0.25)); return s; },
  // The negative of a door: dark inside, its colour on the rim and the bars; open, a dashed rim and a minus. key: "hex|open".
  idoor(key) {
    const [col, open] = key.split('|'), s = sheet();
    if (open === '1') { for (let i = 2; i < 30; i++) if (i % 8 < 4) s.rect(i, 2, i, 3, col).rect(i, 28, i, 29, col).rect(2, i, 3, i, col).rect(28, i, 29, i, col); return s.rect(10, 14, 21, 17, col); }
    s.slab(0, 0, 31, 31, P.deep, 1).rect(0, 0, 31, 2, col).rect(0, 29, 31, 31, dk(col, 0.2)).rect(0, 0, 2, 31, col).rect(29, 0, 31, 31, dk(col, 0.2));
    for (const x of [7, 14, 21]) s.rect(x, 6, x + 3, 25, col).rect(x, 6, x, 25, lt(col, 0.4)).rect(x + 3, 6, x + 3, 25, dk(col, 0.25));
    return s;
  },
  // A mover: a blue slab with an arrow each way it slides. key: "h" or "v".
  mover(axis) { const s = sheet().slab(2, 2, 29, 29, P.blue, 2), a = sheet(); for (let i = 0; i < 6; i++) a.rect(6 + i, 15 - i, 6 + i, 16 + i, EYE).rect(25 - i, 15 - i, 25 - i, 16 + i, EYE); a.rect(12, 14, 19, 17, EYE); return stamp(s, axis === 'v' ? a.turned('down') : a); },
  // An enemy: a red diamond with two eyes that look the way it moves. key: "h|1" (axis|dir).
  enemy(key) {
    const [axis, dir] = key.split('|'), s = sheet();
    for (let y = 2; y <= 29; y++) { const w = y <= 15.5 ? y - 2 : 29 - y; s.rect(15 - w, y, 16 + w, y, P.red); }
    s.lit(16, 16, 15, 15, P.red); s.line(15, 4, 6, 13, lt(P.red, 0.5), 2);
    return eyes(s, 9, 18, 13, axis === 'h' ? +dir : 0, axis === 'v' ? +dir : 0);
  },
  // A strong enemy: a red block with horns and yellow eyes under a heavy brow. key: "h|1".
  strong(key) {
    const [axis, dir] = key.split('|'), s = sheet().slab(2, 5, 29, 30, P.red, 2), dx = axis === 'h' ? +dir : 0, dy = axis === 'v' ? +dir : 0;
    s.tri(3, 8, 5, 4, 0, P.hi).tri(23, 28, 5, 27, 0, P.hi).rect(6, 12, 25, 13, dk(P.red, 0.45));
    for (const x of [8, 19]) s.rect(x + dx, 15 + dy, x + 4 + dx, 18 + dy, P.yellow).rect(x + 2 + dx, 16 + dy, x + 3 + dx, 18 + dy, EYE);
    return s.rect(11, 24, 20, 25, dk(P.red, 0.45));
  },
  // A heavy block: violet steel, a plate bolted on, a rivet in each corner.
  heavy() { const s = sheet().slab(2, 2, 29, 29, P.violet, 3).rect(9, 9, 22, 22, dk(P.violet, 0.15)).rect(9, 9, 22, 9, lt(P.violet, 0.4)).rect(9, 22, 22, 22, dk(P.violet, 0.4)); return rivets(s, P.violet, [[7, 7], [25, 7], [7, 25], [25, 25]]); },
  // A bomb: a round body with a shine, a cap and a fuse of k lengths (2, 1 or 0); hot, it glows.
  bomb(k) {
    if (k === 'hot') return shine(round(P.orange, 11), P.orange);
    const s = sheet().oval(16, 19, 11, 11, P.deep, 0.04).lit(16, 19, 11.5, 11.5, P.deep, 0.35); s.oval(11, 14, 3, 2, P.top, 0, true); s.put(8, 17, P.top); s.rect(13, 6, 19, 9, P.mid).rect(13, 6, 19, 6, lt(P.mid, 0.4));
    const n = +k; if (n >= 1) s.line(18, 5, 22, 2, P.wood, 2); if (n >= 2) s.line(22, 2, 27, 3, P.wood, 2); if (n >= 1) s.rect(n >= 2 ? 27 : 22, n >= 2 ? 2 : 1, n >= 2 ? 28 : 23, n >= 2 ? 3 : 2, P.orange);
    return s;
  },
  // A pushable laser's crate frame.
  crateFrame() { const s = sheet(), c = P.top; s.rect(3, 2, 28, 4, c).rect(3, 27, 28, 29, c).rect(2, 3, 4, 28, c).rect(27, 3, 29, 28, c); return s; },
  // A shut door from above: a shutter in its colour filling the tile, two banks of slats, a seam where they meet.
  doorShut(col) {
    const s = sheet().slab(0, 0, 31, 31, dk(col, 0.3), 2);
    for (const y0 of [3, 18]) for (let x = 3; x <= 26; x += 4) s.rect(x, y0, x + 1, y0 + 10, lt(col, 0.35)).rect(x + 2, y0, x + 2, y0 + 10, col).rect(x + 3, y0, x + 3, y0 + 10, dk(col, 0.35));
    return s.rect(2, 14, 29, 17, dk(col, 0.5)).rect(2, 14, 29, 14, lt(col, 0.2)).rect(14, 13, 17, 18, P.hi).rect(15, 15, 16, 16, dk(col, 0.5));
  },
  // An open door: only its dashed frame.
  doorOpen(col) { const s = sheet(); for (let i = 2; i < 30; i++) if (i % 8 < 4) s.rect(i, 2, i, 3, col).rect(i, 28, i, 29, col).rect(2, i, 3, i, col).rect(28, i, 29, i, col); return s; },
  // A switch from above: a plate in its colour, a lever at the left while off, at the right with its lamp lit while on.
  switchOff(col) { const s = sheet().slab(4, 9, 27, 22, dk(col, 0.35), 2).rect(8, 13, 23, 18, dk(col, 0.6)); s.oval(10.5, 15.5, 4, 4, P.hi).oval(10, 15, 2, 1.6, WHITE).rect(22, 15, 23, 16, dk(col, 0.2)); return s; },
  switchOn(col) { const s = sheet().slab(4, 9, 27, 22, col, 2).rect(8, 13, 23, 18, dk(col, 0.35)); s.oval(21.5, 15.5, 4, 4, P.hi).oval(21, 15, 2, 1.6, WHITE).rect(8, 15, 9, 16, lt(col, 0.7)); return s; },
  // A floor button from above: a disc in a ring, sunk and darker while pressed.
  buttonUp(col) { const s = sheet().oval(16, 16, 12.5, 12.5, P.top).lit(16, 16, 13, 13, P.top).oval(16, 16, 10, 10, dk(col, 0.5)).oval(16, 16, 8.5, 8.5, col).lit(16, 16, 9, 9, col); return shine(s, col, 12.5, 12); },
  buttonDown(col) { return sheet().oval(16, 16, 12.5, 12.5, P.top).lit(16, 16, 13, 13, P.top).oval(16, 16, 10, 10, dk(col, 0.55)).oval(16, 17, 7, 7, dk(col, 0.2)); },
  // A laser: only its barrels (register 493), one per direction it fires, the next to fire lit orange
  // (register 603). key: "right,down|right".
  laser(key) {
    const [dirs, next] = key.split('|'), s = sheet();
    for (const d of dirs.split(',')) {
      const lit = d === next, body = lit ? P.orange : P.mid, b = sheet().rect(12, 11, 31, 20, dk(body, 0.35)).rect(12, 13, 31, 18, body).rect(12, 13, 31, 13, lt(body, 0.45)).rect(27, 12, 31, 19, lit ? P.hi : P.top).rect(12, 11, 14, 20, dk(body, 0.5));
      stamp(s, b.turned(d));
    }
    return s;
  },
};
