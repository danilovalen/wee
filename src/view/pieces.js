// Pieces and the player.
import { AIM, INK, T, frame } from './ink.js';
import { drawSprite } from './sprites.js';

// The mode badge, in 2-unit pixels: a dark disc holding a clock for real time, a step mark for on input,
// a double chevron for follow.
export const BADGE = '#0b0d12';
const BADGE_ART = {
  realtime: ['.##.', '#..#', '#.##', '.##.'],
  follow: ['#.#.', '.#.#', '.#.#', '#.#.'],
  input: ['....', '.##.', '####', '....'],
};
export function modeBadge(g, mode, bx = 24, by = 8) {
  const x0 = bx - 6, y0 = by - 6;
  g.fillStyle = BADGE;
  ['.####.', '######', '######', '######', '######', '.####.'].forEach((r, y) => { const a = r.indexOf('#'), b = r.lastIndexOf('#'); g.fillRect(x0 + a * 2, y0 + y * 2, (b - a + 1) * 2, 2); });
  g.fillStyle = '#e9edf5';
  (BADGE_ART[mode] || BADGE_ART.input).forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') g.fillRect(x0 + 2 + x * 2, y0 + 2 + y * 2, 2, 2); }));
}

// A turret head: one barrel per direction it fires; the next to fire is lit.
export function drawTurret(g, t, badge, mounted, framed = false) {
  const next = t.aim === undefined ? (t.start || t.dirs[0]) : t.dirs[t.aim % t.dirs.length];
  g.save();
  if (mounted) { g.translate(16, 16); g.scale(0.62, 0.62); g.translate(-16, -16); }
  // A pushable laser's barrels stay inside its box frame (register 554).
  else if (framed) { g.translate(16, 16); g.scale(0.78, 0.78); g.translate(-16, -16); }
  // Only the barrels (register 493), as a pixel sprite.
  drawSprite(g, 'laser', 0, 0, { colour: t.dirs.join(',') + '|' + next });
  g.restore();
  // One direction always fires the same way, so how it turns says nothing (register 300).
  if (badge && t.dirs.length > 1) modeBadge(g, t.mode, badge[0], badge[1]);
}

export function drawPiece(g, e, px, py, scale = 1, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale); g.translate(-T / 2, -T / 2);
  if (e.kind === 'mover') {
    drawSprite(g, 'mover', 0, 0, { colour: e.axis === 'v' ? 'v' : 'h' });
    modeBadge(g, e.mode);
  } else if (e.kind === 'enemy' || e.kind === 'strong') {
    drawSprite(g, e.kind, 0, 0, { colour: (e.axis === 'v' ? 'v' : 'h') + '|' + (e.dir < 0 ? -1 : 1) });
    modeBadge(g, e.mode);
  } else if (e.kind === 'turret') {
    // A pushable laser wears the box's brown border (registers 336-338); a fixed one has no base (register 493).
    if (e.crate) drawSprite(g, 'crateFrame', 0, 0);
  } else if (e.kind === 'box') {
    drawSprite(g, 'box', 0, 0);
  } else if (e.kind === 'bomb') {
    // The fuse is the timer: a full cord before it is lit, a spark that burns it down one
    // length per move, and with no cord left the body glows: it goes off when this move ends.
    const k = e.fuse == null ? 2 : e.fuse, hot = e.fuse === 0 ? 0.5 + 0.5 * Math.sin(frame.clock / 70) : 0;
    drawSprite(g, 'bomb', 0, 0, { colour: String(k) });
    if (hot) { g.globalAlpha = alpha * (0.35 + 0.45 * hot); drawSprite(g, 'bomb', 0, 0, { colour: 'hot' }); g.globalAlpha = alpha; }
    if (e.fuse != null) {
      const [sx, sy] = [[16, 6], [22, 2], [26, 2]][k];
      g.fillStyle = INK.spark; const f = 2 * Math.round(0.5 + 0.5 * Math.sin(frame.clock / 45)); g.fillRect(sx - 2 - f / 2, sy - 2 - f / 2, 4 + f, 4 + f);
    }
  } else if (e.kind === 'heavy') {
    drawSprite(g, 'heavy', 0, 0);
  }
  if (e.turret) drawTurret(g, e.turret, e.kind === 'turret' ? [24, 8] : [8, 24], e.kind !== 'turret', e.kind === 'turret' && !!e.crate);
  g.restore();
}

// The campaign's player is the blob (register 593): a gel drop, drawn as a pixel sprite centred on its tile.
export function drawRobot(g, hidden = false) {
  drawSprite(g, 'blob', -T / 2, -T / 2, { outline: hidden });
}
// You, when a person plays (register 302): a round body with two eyes, about 20 across.
export function drawYou(g, hidden = false) {
  drawSprite(g, 'you', -T / 2, -T / 2, { outline: hidden });
}

// Hidden, you are a dashed outline with your eyes peeking: drawn over whatever passes
// on top of you, so you can still be found. Swimming on land you wear a blue drop;
// under water you waver, tinted, with a ripple.
export function drawPlayer(g, px, py, hidden, scale, alpha = 1, armored = false, swim = null, sticky = false) {
  g.save(); g.globalAlpha = alpha;
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale);
  const under = swim === 'under';
  if (under) {
    const w = Math.sin(frame.clock / 170);
    g.strokeStyle = INK.waterHi; g.lineWidth = 1.5;
    const rp = (frame.clock % 1100) / 1100;
    g.globalAlpha = alpha * 0.6 * (1 - rp); g.beginPath(); g.arc(0, 0, 11 + 6 * rp, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = alpha * 0.8;
    g.translate(w * 1.5, 0); g.scale(1 + 0.07 * w, 1 - 0.07 * w);
  }
  (frame.avatar === 'you' ? drawYou : drawRobot)(g, hidden);
  if (armored) {
    // A steel rim with four rivets.
    g.strokeStyle = INK.armor; g.lineWidth = 3.5;
    g.beginPath(); g.arc(0, 0, 11.5, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#e8eef6';
    for (const a of [0.25, 0.75, 1.25, 1.75]) { g.beginPath(); g.arc(Math.cos(a * Math.PI) * 11.5, Math.sin(a * Math.PI) * 11.5, 1.6, 0, Math.PI * 2); g.fill(); }
  }
  if (sticky) {
    // Goo on top, dripping from the bottom.
    g.fillStyle = INK.goo;
    g.beginPath(); g.ellipse(0, -8, 7, 3, 0, 0, Math.PI * 2); g.fill();
    const k = (frame.clock % 900) / 900;
    g.beginPath(); g.ellipse(-4, 9 + 3 * k, 2, 2 + 2 * k, 0, 0, Math.PI * 2); g.ellipse(5, 9, 1.6, 2.4, 0, 0, Math.PI * 2); g.fill();
  }
  if (under) {
    g.globalAlpha = alpha * 0.45; g.fillStyle = INK.waterHi;
    g.beginPath(); g.arc(0, 0, 10.5, 0, Math.PI * 2); g.fill();
  } else if (swim === 'on') {
    g.fillStyle = INK.waterHi;
    g.beginPath(); g.moveTo(9, -16); g.quadraticCurveTo(14, -9, 9, -7); g.quadraticCurveTo(4, -9, 9, -16); g.fill();
  }
  g.restore();
}
