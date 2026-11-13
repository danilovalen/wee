// The interface's icons (registers 599, 602, 866): 16x16 bitmaps drawn as SVG rectangles, each in the crayon
// look: its own colour, a line one pixel wide round it in a dark tint of that colour, a light top edge and
// a shaded foot. A cell is 1 (the icon), 2 (a star's inside), or 3 to 6 (a dab of another colour).
import { SCORE_STEPS } from '../campaign/score.js';

const N = 16;
const grid = () => Array.from({ length: N }, () => Array(N).fill(0));
function box(g, x0, y0, x1, y1, v = 1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = v; }
function line(g, x0, y0, x1, y1, v = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / (n || 1)), y = Math.round(y0 + (y1 - y0) * i / (n || 1)); box(g, x, y, x, y, v); }
}
const thick = (g, x0, y0, x1, y1) => { line(g, x0, y0, x1, y1); line(g, x0 + 1, y0, x1 + 1, y1); };
const mirror = g => g.map(r => r.slice().reverse());
// An icon drawn by hand, row by row: # is the icon, a dot is empty.
const art = rows => rows.map(r => [...r].map(c => (c === '#' ? 1 : 0)));
// One round shape for every ring (register 934): two pixels thick all the way round, no lump at the diagonals.
const RING = ['.....######.....', '...##########...', '..###......###..', '.##..........##.', '.##..........##.', '##............##', '##............##', '##............##',
  '##............##', '##............##', '##............##', '.##..........##.', '.##..........##.', '..###......###..', '...##########...', '.....######.....'];

const ICON = {
  levels() { const g = grid(); for (const [x, y] of [[1, 1], [9, 1], [1, 9], [9, 9]]) { box(g, x, y, x + 5, y + 5); box(g, x + 2, y + 2, x + 3, y + 3, 0); } return g; },
  // A triangle with even steps, the same above and below its point (register 904).
  run() { const g = grid(); for (let y = 2; y <= 13; y++) box(g, 3, y, 4 + 2 * Math.min(y - 2, 13 - y), y); return g; },
  // A game pad's cross with an arrow cut into each arm, so it never reads as Move's thin arrows.
  test() {
    const g = grid(); box(g, 5, 0, 10, 15); box(g, 0, 5, 15, 10);
    box(g, 7, 2, 8, 2, 0); box(g, 6, 3, 9, 3, 0); box(g, 7, 13, 8, 13, 0); box(g, 6, 12, 9, 12, 0);
    box(g, 2, 7, 2, 8, 0); box(g, 3, 6, 3, 9, 0); box(g, 13, 7, 13, 8, 0); box(g, 12, 6, 12, 9, 0);
    return g;
  },
  edit() { const g = grid(); for (let i = 0; i < 9; i++) box(g, 4 + i, 10 - i, 5 + i, 11 - i); box(g, 2, 12, 4, 13); box(g, 12, 1, 14, 3); box(g, 13, 2, 13, 2, 0); return g; },
  undo() { const g = grid(); for (let i = 0; i < 4; i++) box(g, 2 + i, 5 - i, 2 + i, 6 + i); box(g, 3, 5, 10, 6); for (let y = 6; y <= 11; y++) box(g, y > 7 && y < 10 ? 12 : 11, y, y > 7 && y < 10 ? 13 : 12, y); box(g, 5, 12, 11, 13); return g; },
  redo() { return mirror(ICON.undo()); },
  // A loop with its head at the top, pointing on round (register 646): square steps, no curve to read as a blob.
  reset() { const g = grid(), b = (x0, y0, x1, y1) => box(g, x0, y0 + 1, x1, y1 + 1); b(5, 2, 9, 3); b(3, 3, 4, 4); b(2, 4, 3, 10); b(3, 10, 4, 11); b(4, 12, 11, 13); b(4, 11, 5, 12); b(10, 11, 11, 12); b(12, 7, 13, 11); b(11, 6, 12, 7); b(10, 0, 10, 5); b(11, 1, 11, 4); b(12, 2, 12, 3); return g; },
  menu() { const g = grid(); box(g, 2, 3, 13, 4); box(g, 2, 7, 13, 8); box(g, 2, 11, 13, 12); return g; },
  back() { return mirror(ICON.next()); },
  next() { const g = grid(); box(g, 2, 7, 12, 8); for (let i = 0; i < 5; i++) { box(g, 9 + i, 3 + i, 10 + i, 3 + i); box(g, 9 + i, 12 - i, 10 + i, 12 - i); } return g; },
  skip() { const g = grid(); for (let y = 3; y <= 12; y++) box(g, 2, y, 3 + 2 * Math.min(y - 3, 12 - y), y); box(g, 12, 3, 13, 12); return g; },
  fit() { const g = grid(); for (const [x, y, sx, sy] of [[1, 1, 1, 1], [14, 1, -1, 1], [1, 14, 1, -1], [14, 14, -1, -1]]) { box(g, Math.min(x, x + 4 * sx), Math.min(y, y + sy), Math.max(x, x + 4 * sx), Math.max(y, y + sy)); box(g, Math.min(x, x + sx), Math.min(y, y + 4 * sy), Math.max(x, x + sx), Math.max(y, y + 4 * sy)); } return g; },
  // Both strokes two pixels wide, steps of two, as the cross (register 934).
  check() { return art(['................', '................', '..............##', '.............##.', '............##..', '...........##...', '..........##....', '.##......##.....', '..##....##......', '...##..##.......', '....####........', '.....##.........', '................', '................', '................', '................']); },
  cross() { const g = grid(); thick(g, 2, 2, 12, 12); thick(g, 12, 2, 2, 12); return g; },
  flag() { const g = grid(); box(g, 3, 1, 4, 15); box(g, 5, 2, 12, 3); box(g, 5, 4, 10, 7); box(g, 5, 8, 12, 9); box(g, 11, 4, 12, 4); box(g, 11, 7, 12, 7); return g; },
  path() { const g = grid(); box(g, 2, 3, 3, 13); box(g, 2, 3, 9, 4); box(g, 8, 3, 9, 10); box(g, 8, 9, 12, 10); for (let i = 0; i < 3; i++) { box(g, 11 + i, 7 + i, 11 + i, 12 - i); } box(g, 1, 12, 4, 15); return g; },
  lock() { const g = grid(); box(g, 2, 7, 13, 14); box(g, 4, 9, 11, 12, 0); box(g, 7, 9, 8, 11); box(g, 4, 2, 5, 6); box(g, 10, 2, 11, 6); box(g, 5, 1, 10, 2); return g; },
  unlock() { const g = grid(); box(g, 2, 7, 13, 14); box(g, 4, 9, 11, 12, 0); box(g, 7, 9, 8, 11); box(g, 4, 2, 5, 6); box(g, 5, 1, 10, 2); box(g, 10, 2, 11, 3); return g; },
  star() {
    // The cookie star (register 947): drawn by hand, five round points on a fat middle with room for a number.
    const g = art(['................', '......####......', '.....######.....', '.....######.....', '.##.########.##.', '################', '.##############.', '..############..',
      '...##########...', '...##########...', '..############..', '..############..', '.######..######.', '.#####....#####.', '..###......###..', '................']).map(r => r.map(c => c * 2));
    // Its edge pixels are the outline (1); the rest is the inside (2).
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !(g[y + dy] || [])[x + dx])) g[y][x] = 1;
    return g;
  },
  // Looks: a painter's palette with a thumb hole and three dabs.
  looks() {
    const g = grid(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot((x + 0.5 - 8) / 7, (y + 0.5 - 8) / 6); if (d <= 1) g[y][x] = 1; }
    box(g, 9, 9, 11, 11, 0); box(g, 10, 12, 12, 13, 0);
    [[4, 5], [8, 3], [4, 9]].forEach(([x, y], i) => box(g, x, y, x + 1, y + 1, 3 + i));
    return g;
  },
  // Who is playing (register 834): a head and shoulders.
  player() { const g = grid(); box(g, 6, 1, 9, 6); box(g, 5, 2, 10, 5); box(g, 3, 9, 12, 14); box(g, 2, 11, 13, 14); box(g, 5, 8, 10, 9); return g; },
  // A piece in a box's frame (register 833): what you place comes out pushable.
  crate() { const g = grid(); box(g, 1, 1, 14, 14); box(g, 3, 3, 12, 12, 0); box(g, 6, 6, 9, 9, 3); return g; },
  look() { return art(['...#####........', '.#########......', '.##.....##......', '##.......##.....', '##.......##.....', '##.......##.....', '##.......##.....', '##.......##.....', '.##.....##......', '.#########......', '...#####.##.....', '.........###....', '..........###...', '...........###..', '............###.', '.............##.']); },
  erase() { const g = grid(); thick(g, 2, 2, 12, 12); thick(g, 12, 2, 2, 12); return g; },
  // The menu's speaker (register 647): a box and a cone, with two waves when sound is on and a cross when off.
  sound() { const g = ICON.mute(); for (let y = 4; y <= 11; y++) g[y].fill(0, 10); box(g, 10, 6, 11, 9); box(g, 12, 3, 13, 4); box(g, 13, 5, 14, 10); box(g, 12, 11, 13, 12); return g; },
  mute() { const g = grid(); box(g, 1, 6, 3, 9); for (let i = 0; i < 5; i++) box(g, 4 + i, 5 - i, 4 + i, 10 + i); thick(g, 10, 5, 14, 9); thick(g, 14, 5, 10, 9); return g; },
  // Options (register 960): a cog, eight teeth round a ring with its middle open.
  gear() { return art(['......####......', '......####......', '..##..####..##..', '..############..', '...##########...', '..####....####..', '####........####', '####........####', '####........####', '####........####', '..####....####..', '...##########...', '..############..', '..##..####..##..', '......####......', '......####......']); },
  // The menu's door to Achievements: a cup on a stand.
  trophy() { const g = grid(); box(g, 3, 1, 12, 7); for (let y = 8; y <= 9; y++) box(g, 4 + (y - 8), y, 11 - (y - 8), y); box(g, 7, 10, 8, 12); box(g, 4, 13, 11, 14); box(g, 0, 2, 2, 3); box(g, 0, 4, 1, 5); box(g, 13, 2, 15, 3); box(g, 14, 4, 15, 5); box(g, 1, 6, 3, 6); box(g, 12, 6, 14, 6); return g; },
  // Achievements (register 639): one picture each; the badge adds the star slot it fills.
  'ach-first'() { return art(['................', '.......##.###...', '.......####.....', '.......##.......', '......####......', '....########....', '...##########...', '..############..', '..############..', '..############..', '..############..', '..############..', '...##########...', '....########....', '......####......', '................']); },
  'ach-half'() { const g = grid(); box(g, 1, 1, 14, 14); box(g, 8, 3, 12, 12, 0); return g; },
  'ach-all'() { return ICON.levels(); },
  'ach-shelf'() { const g = grid(); box(g, 0, 12, 15, 13); box(g, 1, 14, 2, 15); box(g, 13, 14, 14, 15); for (const x of [1, 6, 11]) { box(g, x + 1, 6, x + 2, 11); box(g, x, 8, x + 3, 9); } return g; },
  'ach-lab'() { const g = grid(); box(g, 5, 0, 10, 1); box(g, 6, 2, 9, 6); for (let y = 7; y <= 15; y++) { const w = Math.min(7, y - 5); box(g, 8 - w, y, 7 + w, y); } box(g, 7, 2, 8, 6, 0); box(g, 4, 10, 6, 11, 0); return g; },
  'ach-challenge'() { return ICON.flag(); },
  'ach-pieces'() { const g = grid(); box(g, 0, 6, 15, 15); box(g, 2, 8, 13, 13, 0); box(g, 5, 2, 10, 3); box(g, 5, 4, 6, 5); box(g, 9, 4, 10, 5); box(g, 6, 9, 9, 12); return g; },
  // A coin with an S on it, its ring the same as the target's.
  'ach-cashback'() { const g = art(RING); box(g, 7, 3, 8, 3); box(g, 5, 4, 10, 4); box(g, 5, 5, 6, 6); box(g, 5, 7, 10, 8); box(g, 9, 9, 10, 10); box(g, 5, 11, 10, 11); box(g, 7, 12, 8, 12); return g; },
  'ach-moveit'() { return ICON.path(); },
  'ach-oneshot'() { const g = art(RING); for (const [y, row] of ['..####..', '.######.', '##....##', '##....##', '##....##', '##....##', '.######.', '..####..'].entries()) [...row].forEach((c, x) => { if (c === '#') g[4 + y][4 + x] = 1; }); box(g, 7, 7, 8, 8); return g; },
  'ach-gateway'() { const g = grid(); box(g, 2, 1, 13, 15); box(g, 4, 3, 11, 15, 0); box(g, 2, 1, 3, 2, 0); box(g, 12, 1, 13, 2, 0); box(g, 9, 9, 10, 10); return g; },
  'ach-guardrails'() { const g = grid(); box(g, 0, 3, 15, 5); box(g, 0, 9, 15, 11); for (const x of [1, 7, 13]) box(g, x, 1, x + 1, 15); return g; },
  'ach-deadly'() { const g = grid(); for (let y = 0; y < 11; y++) for (let x = 0; x < N; x++) if (Math.hypot((x + 0.5 - 8) / 7, (y + 0.5 - 6.5) / 6) <= 1) g[y][x] = 1; box(g, 4, 11, 11, 14); box(g, 4, 5, 6, 8, 0); box(g, 9, 5, 11, 8, 0); box(g, 7, 9, 8, 10, 0); box(g, 6, 13, 6, 14, 0); box(g, 9, 13, 9, 14, 0); return g; },
  'ach-silver'() { const g = grid(); box(g, 5, 7, 10, 15); box(g, 6, 4, 9, 6); box(g, 7, 1, 8, 3); box(g, 4, 13, 11, 15); box(g, 7, 8, 8, 12, 0); return g; },
  // The global score's steps (register 839): a bar chart with one more bar for each step.
  ...Object.fromEntries(SCORE_STEPS.map((n, i) => [`ach-score${n}`, () => { const g = grid(); box(g, 0, 14, 15, 15); for (let b = 0; b <= i; b++) box(g, 13 - b * 3, 12 - (i - b) * 3, 15 - b * 3, 13); return g; }])),
  // Four arrows from the middle, heads small enough that it never reads as a blob.
  move() { const g = grid(); box(g, 7, 2, 8, 13); box(g, 2, 7, 13, 8); for (const [x, y, dx, dy] of [[7, 1, 0, 1], [7, 14, 0, -1], [1, 7, 1, 0], [14, 7, -1, 0]]) { box(g, x - (dy ? 1 : 0), y - (dx ? 1 : 0), x + (dy ? 2 : 0), y + (dx ? 2 : 0)); box(g, x - (dy ? 2 : 0) + dx * 1, y - (dx ? 2 : 0) + dy * 1, x + (dy ? 3 : 0) + dx * 1, y + (dx ? 3 : 0) + dy * 1); } return g; },
};

// Each icon's colour, a token of the page so a palette repaints it. One not named is drawn in the ink.
const C = { good: '--good', bad: '--bad', gold: '--gold', sky: '--cyan', warm: '--orange', main: '--accent', soft: '--mid' };
export const ICON_COLOUR = {
  run: C.good, check: C.good, test: C.main, move: C.main, path: C.main, looks: C.main, edit: C.warm, reset: C.warm,
  undo: C.sky, redo: C.sky, look: C.sky, sound: C.sky, fit: C.sky, cross: C.bad, erase: C.bad, flag: C.bad, mute: C.soft, lock: C.soft,
  unlock: C.gold, trophy: C.gold, gear: C.soft, player: C.main, crate: C.warm, levels: C.sky, menu: C.soft, back: C.soft, next: C.good, skip: C.good,
};
const DAB = { 3: C.bad, 4: C.good, 5: C.sky, 6: C.gold };
// The cells of one kind as a path of row runs.
function runs(cells) {
  let d = '';
  for (let y = -1; y <= N; y++) for (let x = -1; x <= N;) { let n = 0; while (x + n <= N && cells(x + n, y)) n++; if (n) d += `M${x} ${y}h${n}v1h-${n}z`; x += n || 1; }
  return d;
}
// An icon's layers: l the line round it, o the icon, h its lit top edge, s its shaded foot, i a star's inside,
// and one layer per dab.
export function layers(g) {
  const at = (x, y) => (y >= 0 && y < N && x >= 0 && x < N ? g[y][x] : 0);
  const near = (x, y) => [-1, 0, 1].some(dy => [-1, 0, 1].some(dx => at(x + dx, y + dy)));
  const out = { l: runs((x, y) => !at(x, y) && near(x, y)), o: runs((x, y) => at(x, y) === 1), h: runs((x, y) => at(x, y) === 1 && !at(x, y - 1)), s: runs((x, y) => at(x, y) === 1 && !at(x, y + 1) && at(x, y - 1)), i: runs((x, y) => at(x, y) === 2) };
  for (const v of Object.keys(DAB)) { const d = runs((x, y) => at(x, y) === +v); if (d) out['d' + v] = d; }
  return out;
}
const cache = {};
export function pixelGlyph(key) {
  if (!ICON[key]) return null;
  if (!cache[key]) {
    const d = layers(ICON[key]()), col = ICON_COLOUR[key] || (key.startsWith('ach-') ? C.gold : null);
    const dabs = Object.keys(DAB).filter(v => d['d' + v]).map(v => `<path style="fill:var(${DAB[v]})" d="${d['d' + v]}"/>`).join('');
    cache[key] = `<svg class="glyph px" viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"${col ? ` style="--glyph-c:var(${col})"` : ''}><path class="l" d="${d.l}"/><path class="o" d="${d.o}"/><path class="h" d="${d.h}"/><path class="s" d="${d.s}"/>${d.i ? `<path class="i" d="${d.i}"/>` : ''}${dabs}</svg>`;
  }
  return cache[key];
}
export const PIXEL_ICONS = Object.keys(ICON);

// A bitmap for canvas drawing (the tool row's icons), 1 where the ink goes.
export const pixelBitmap = key => (ICON[key] ? ICON[key]() : null);
