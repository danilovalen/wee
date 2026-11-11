// The crayon look (docs/THEME.md, registers 841 to 857): a sprite is drawn on 32 art pixels to a tile, lumpy
// and lit from the top left, then inked: a line 2 pixels wide outside it, in a dark tint of whatever it
// surrounds and never black, and its own edge darkened 2 pixels deep. One pass inks every sprite, so the
// rule cannot differ from piece to piece. A sprite still on the old 16 grid is doubled first.
import { paint } from './look.js';

export const N2 = 32;
export const RING = 2;
// The colours no palette moves: the plum-black the line and every shade lean toward, the white a shine leans
// toward, an eye's dark and a cheek's pink. They are the look's own; everything else is a palette's.
export const FIXED = { dark: '#1a1020', white: '#ffffff', eye: '#2a2233', blush: '#ff9fb2' };
const DARK = FIXED.dark, LINE = 0.62, EDGE = 0.2;
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const hex2 = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => hex2(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));

// A colour a sprite is built in: a palette colour, with a tone the palette cannot change ('#a9dc76~-0.20'
// is that green a fifth darker, in any palette), or a fixed colour no palette moves ('!#ffffff').
const parse = c => { const raw = c[0] === '!', s = raw ? c.slice(1) : c, i = s.indexOf('~'); return { raw, base: i < 0 ? s : s.slice(0, i), tone: i < 0 ? 0 : +s.slice(i + 1) }; };
const toned = (c, t) => { const p = parse(c), n = Math.max(-0.9, Math.min(0.9, p.tone + t)); return (p.raw ? '!' : '') + p.base + (n ? '~' + n.toFixed(2) : ''); };
export const dk = (c, t = 0.2) => toned(c, -t);
export const lt = (c, t = 0.45) => toned(c, t);
export const EYE = '!' + FIXED.eye;
export const WHITE = '!' + FIXED.white;
export const BLUSH = '!' + FIXED.blush;
// The colour as painted: the palette's own for its base, then the tone.
export function resolve(c) {
  const p = parse(c), b = p.raw ? p.base : paint(p.base);
  // A shade never comes out lighter than its colour: a palette's black stays black.
  return p.tone < 0 ? hex2(rgb(mix(b, DARK, -p.tone)).map((v, i) => Math.min(v, rgb(b)[i]))) : p.tone > 0 ? mix(b, FIXED.white, p.tone) : b;
}

// A sheet to draw a sprite on, w by h art pixels. Shapes are filled in whole cells.
export function sheet(w = N2, h = N2) {
  const g = Array.from({ length: h }, () => Array(w).fill(null));
  const put = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c; };
  const s = {
    g, w, h, put,
    rect(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(x, y, c); return s; },
    // An ellipse that is never quite one: lump bends its radius three times round. only: paint only where
    // the sheet is already filled.
    oval(cx, cy, rx, ry, c, lump = 0, only = false) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), k = 1 + lump * Math.sin(a * 3 + 1.3);
        if (((x + 0.5 - cx) / (rx * k)) ** 2 + ((y + 0.5 - cy) / (ry * k)) ** 2 <= 1 && (!only || g[y][x])) g[y][x] = c;
      }
      return s;
    },
    // A rounded square (a superellipse of power n), lumpy like an oval: the blob's own shape (register 860).
    squircle(cx, cy, rx, ry, c, n = 3.2, lump = 0) {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx), k = 1 + lump * Math.sin(a * 3 + 1.3);
        if (Math.abs((x + 0.5 - cx) / (rx * k)) ** n + Math.abs((y + 0.5 - cy) / (ry * k)) ** n <= 1) g[y][x] = c;
      }
      return s;
    },
    line(x0, y0, x1, y1, c, t = 1) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) put(x0 + (x1 - x0) * i / n + a, y0 + (y1 - y0) * i / n + b, c); return s; },
    // A triangle with a flat base from x0 to x1 on row yb and its point at (xt, yt).
    tri(x0, x1, yb, xt, yt, c) { const d = yb > yt ? 1 : -1; for (let y = yt; y !== yb + d; y += d) { const k = (y - yt) / ((yb - yt) || 1); for (let x = Math.round(xt + (x0 - xt) * k); x <= Math.round(xt + (x1 - xt) * k); x++) put(x, y, c); } return s; },
    // Light from the top left: the cells of colour c low and to the right take its shade.
    lit(cx, cy, rx, ry, c, by = 0.2) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (g[y][x] === c && ((x + 0.5 - (cx - rx * 0.28)) / rx) ** 2 + ((y + 0.5 - (cy - ry * 0.3)) / ry) ** 2 > 0.82) g[y][x] = dk(c, by); return s; },
    // An eye, 4 by 8: a white with a pupil that looks lookX to the side and lookY up or down, or a shut line.
    eye(x, y, lookX = 0, shut = false, lookY = 0) { if (shut) return s.rect(x, y + 3, x + 3, y + 4, EYE); s.rect(x, y + 1, x + 3, y + 6, WHITE).rect(x + 1, y, x + 2, y + 7, WHITE).rect(x + 1 + lookX, y + 3 + lookY, x + 2 + lookX, y + 5 + lookY, EYE); put(x + 1 + lookX, y + 3 + lookY, WHITE); return s; },
    // A slab seen from above: a face lit along its top and left, shaded along its foot and right.
    slab(x0, y0, x1, y1, c, t = 2) { return s.rect(x0, y0, x1, y1, c).rect(x0, y0, x1, y0 + t - 1, lt(c, 0.4)).rect(x0, y0 + t, x0 + t - 1, y1, lt(c, 0.25)).rect(x0, y1 - t + 1, x1, y1, dk(c, 0.25)).rect(x1 - t + 1, y0 + t, x1, y1 - t, dk(c, 0.15)); },
    // The sheet turned to face a way, drawn facing right.
    turned(d) {
      if (d === 'right' || !d) return s;
      const o = sheet(d === 'left' ? w : h, d === 'left' ? h : w);
      g.forEach((row, y) => row.forEach((c, x) => { if (c) { const [X, Y] = d === 'down' ? [h - 1 - y, x] : d === 'left' ? [w - 1 - x, h - 1 - y] : [y, w - 1 - x]; o.g[Y][X] = c; } }));
      return o;
    },
  };
  return s;
}

// A 16-grid sprite doubled onto the 32 grid.
export const doubled = g16 => g16.flatMap(row => { const r = row.flatMap(c => [c, c]); return [r, r.slice()]; });

// The inked sprite: every cell resolved to its painted colour, the piece's own edge darkened, and the line
// round it. Returned as rows of [x, y, length, colour] runs, x and y from -ring. edges: which sides of the
// sheet are open (a side that joins a neighbour gets no line and no dark edge: 'nesw').
const inkRaw = c => c[0] === '!';
export function ink(g, { ring = RING, edge = EDGE, sides = 'nesw' } = {}) {
  const h = g.length, w = g[0].length, at = (x, y) => (y >= 0 && y < h && x >= 0 && x < w ? g[y][x] : null);
  // Past a side that joins, the sheet counts as filled, so nothing is inked there.
  const filled = (x, y) => (y < 0 ? !sides.includes('n') : y >= h ? !sides.includes('s') : x < 0 ? !sides.includes('w') : x >= w ? !sides.includes('e') : !!g[y][x]);
  const near = (x, y, max, want) => { let best = null; for (let dy = -max; dy <= max; dy++) for (let dx = -max; dx <= max; dx++) { const d = Math.abs(dx) + Math.abs(dy); if (d && d <= max && (!best || d < best.d) && filled(x + dx, y + dy) === want) best = { d, c: at(x + dx, y + dy) }; } return best; };
  const out = [];
  for (let y = -ring; y < h + ring; y++) {
    let run = null;
    for (let x = -ring; x <= w + ring; x++) {
      let c = null;
      if (x < w + ring) {
        const own = at(x, y);
        if (own) c = edge && !inkRaw(own) && near(x, y, 2, false) ? resolve(dk(own, edge)) : resolve(own);
        else if (ring && !filled(x, y)) { const o = near(x, y, ring, true); if (o && o.c) c = mix(resolve(o.c), DARK, LINE); }
      }
      if (run && run[3] === c) run[2]++; else { if (run) out.push(run); run = c ? [x, y, 1, c] : null; }
    }
    if (run) out.push(run);
  }
  // An 8-digit hex is drawn as it is: the canvas hook that repaints colours leaves it alone.
  return out.map(r => [r[0], r[1], r[2], r[3] + 'ff']);
}
// The line colour for a painted colour, for what is drawn without a sheet (a mass's rim).
export const lineOf = c => mix(resolve(c), DARK, LINE) + 'ff';
export const edgeOf = (c, by = EDGE) => resolve(dk(c, by)) + 'ff';
export const tint = c => resolve(c) + 'ff';

// Pixel perfect (docs/THEME.md rule 8): a fitted scale k (CSS px per art pixel) on a screen of dpr device
// pixels to a CSS px, rounded down to a whole number of device pixels to an art pixel where that costs the
// room a fifth of its size or less; else to a half step, which keeps every 2-pixel line (the crayon line, a
// bevel) even. Neither may take a tile under TAP CSS px that fitted at TAP or more: a finger comes first, and
// such a room is drawn at its fitted size. A room too big for one pixel each is drawn as it comes.
export const TAP = 24;
export function wholeScale(k, dpr) {
  const kd = k * dpr + 1e-6, whole = Math.floor(kd), floor = TAP / N2;
  if (kd < 1) return k;
  const fits = c => c / dpr >= floor || k < floor;
  if (whole / kd >= 0.8 && fits(whole)) return whole / dpr;
  const half = Math.floor(kd * 2) / 2;
  return fits(half) ? half / dpr : k;
}

// The wobble (register 871, after Baba Is You): at rest a piece is three whole drawings shown in turn. In the
// second and third the whole sheet is bent by a smooth wave, a pixel at most: its rows slide sideways and
// its columns up and down in broad bands, so the outline and everything inside it (eyes, slits, a shine)
// move together and nothing tears. A cell pushed past the sheet's edge stays at the edge, so a piece that
// fills its tile keeps its footprint. f: 0 the piece as drawn, 1 or 2 a bent drawing.
export const WOBBLE_FRAMES = 3;
export function wobble(g, key, f) {
  if (!f) return g;
  let hsh = 2166136261; for (const ch of key + '#' + f) hsh = Math.imul(hsh ^ ch.charCodeAt(0), 16777619) >>> 0;
  const h = g.length, w = g[0].length, p1 = (hsh % 1000) / 1000, p2 = ((hsh >>> 10) % 1000) / 1000, turn = 2 * Math.PI;
  // A band of rows moves one pixel aside and a band of columns one pixel down; the rest stay.
  const dx = y => (Math.sin((y / 23 + p1) * turn) > 0.35 ? 1 : 0), dy = x => (Math.sin((x / 27 + p2) * turn) > 0.35 ? 1 : 0);
  const at = (x, y) => g[Math.max(0, Math.min(h - 1, y))][Math.max(0, Math.min(w - 1, x))];
  return g.map((row, y) => row.map((_, x) => at(x - dx(y), y - dy(x - dx(y)))));
}

// The sway (register 886): a fruit does not wobble, it leans. Its foot stays put and each row above slides a
// little further aside, two pixels at the top. f: 0 upright, 1 leaning left, 2 leaning right.
export function sway(g, f) {
  if (!f) return g;
  const h = g.length, w = g[0].length, dir = f === 1 ? -1 : 1;
  return g.map((row, y) => { const d = dir * Math.round(2 * (h - 1 - y) / (h - 1)); return row.map((_, x) => (x - d >= 0 && x - d < w ? g[y][x - d] : null)); });
}
