// Pieces and the player.
import { AIM, INK, T, frame, pxDisc, pxEllipse, pxRing } from './ink.js';
import { drawSprite } from './sprites.js';

// A turret head: one barrel per direction it fires; the next to fire is lit.
// A piece's clock (when it acts) is named by Look, not drawn on it (registers 615, 624).
export function drawTurret(g, t, mounted, framed = false) {
  const next = t.aim === undefined ? (t.start || t.dirs[0]) : t.dirs[t.aim % t.dirs.length];
  g.save();
  if (mounted) { g.translate(16, 16); g.scale(0.62, 0.62); g.translate(-16, -16); }
  // A pushable laser's barrels stay inside its box frame (register 554).
  else if (framed) { g.translate(16, 16); g.scale(0.78, 0.78); g.translate(-16, -16); }
  // Only the barrels (register 493), as a pixel sprite.
  drawSprite(g, 'laser', 0, 0, { colour: t.dirs.join(',') + '|' + next });
  g.restore();
}

export function drawPiece(g, e, px, py, scale = 1, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale); g.translate(-T / 2, -T / 2);
  if (e.kind === 'mover') {
    drawSprite(g, 'mover', 0, 0, { colour: e.axis === 'v' ? 'v' : 'h' });
  } else if (e.kind === 'enemy' || e.kind === 'strong') {
    drawSprite(g, e.kind, 0, 0, { colour: (e.axis === 'v' ? 'v' : 'h') + '|' + (e.dir < 0 ? -1 : 1) });
  } else if (e.kind === 'turret') {
    // A laser stands on a wall-like block (register 622, as before 493); a pushable one wears the box's
    // brown border round it (registers 336-338).
    drawSprite(g, 'wallFace', 0, 0);
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
  if (e.turret) drawTurret(g, e.turret, e.kind !== 'turret', e.kind === 'turret' && !!e.crate);
  g.restore();
}

// The player is the blob everywhere (registers 593, 777), a pixel sprite centred on its tile; Hero swaps it.
export function drawRobot(g, hidden = false) {
  // In a room being played it looks the way it last went and blinks now and then (docs/THEME.md): a blink
  // is 140 ms every 3.4 s. Anywhere else (an icon, the editor) it is one still drawing, looking right.
  const blink = frame.live && !hidden && frame.clock % 3400 < 140;
  drawSprite(g, 'blob', -T / 2, -T / 2, { outline: hidden, colour: (frame.live ? frame.face || 'right' : 'right') + (blink ? '|b' : '') });
}
export const drawYou = drawRobot;

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
    g.globalAlpha = alpha * 0.6 * (1 - rp); pxRing(g, 0, 0, 11 + 6 * rp);
    g.globalAlpha = alpha * 0.8;
    g.translate(w * 1.5, 0); g.scale(1 + 0.07 * w, 1 - 0.07 * w);
  }
  (frame.avatar === 'you' ? drawYou : drawRobot)(g, hidden);
  if (armored) {
    drawSprite(g, 'armour', -T / 2, -T / 2);
  }
  if (sticky) {
    // Goo on top, dripping from the bottom.
    g.fillStyle = INK.goo;
    pxEllipse(g, 0, -8, 7, 3);
    const k = (frame.clock % 900) / 900;
    pxEllipse(g, -4, 9 + 3 * k, 2, 2 + 2 * k); pxEllipse(g, 5, 9, 1.6, 2.4);
  }
  if (under) {
    g.globalAlpha = alpha * 0.45; g.fillStyle = INK.waterHi;
    pxDisc(g, 0, 0, 10.5);
  } else if (swim === 'on') {
    g.fillStyle = INK.waterHi;
    pxEllipse(g, 9, -10, 3, 4); pxDisc(g, 9, -15, 1);
  }
  g.restore();
}
