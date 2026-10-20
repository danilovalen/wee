// Pieces and the player.
import { AIM, INK, T, frame, roundRect } from './ink.js';

// The mode badge: a clock for real time, a step mark for on input, a double chevron for follow.
export function modeBadge(g, mode, bx = 24, by = 8) {
  g.save(); g.translate(bx, by);
  g.fillStyle = '#0b0d12'; g.beginPath(); g.arc(0, 0, 5.5, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e9edf5'; g.fillStyle = '#e9edf5'; g.lineWidth = 1.4;
  if (mode === 'realtime') {
    g.beginPath(); g.arc(0, 0, 3.6, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -2.4); g.moveTo(0, 0); g.lineTo(1.8, 0.8); g.stroke();
  } else if (mode === 'follow') {
    g.beginPath(); g.moveTo(-3, -2.5); g.lineTo(-0.5, 0); g.lineTo(-3, 2.5); g.moveTo(0.5, -2.5); g.lineTo(3, 0); g.lineTo(0.5, 2.5); g.stroke();
  } else {
    g.beginPath(); g.moveTo(-2.5, 2); g.lineTo(0, -2.5); g.lineTo(2.5, 2); g.closePath(); g.fill();
  }
  g.restore();
}

// A turret head: one barrel per direction it fires; the next to fire is lit.
export function drawTurret(g, t, badge, mounted) {
  const next = t.aim === undefined ? (t.start || t.dirs[0]) : t.dirs[t.aim % t.dirs.length];
  g.save();
  if (mounted) { g.translate(16, 16); g.scale(0.62, 0.62); g.translate(-16, -16); }
  for (const d of t.dirs) {
    g.save(); g.translate(16, 16); g.rotate(AIM[d]);
    g.fillStyle = d === next ? INK.zap : INK.barrel;
    roundRect(g, 4, -3, 11, 6, 2); g.fill();
    g.restore();
  }
  g.fillStyle = '#20242f'; g.beginPath(); g.arc(16, 16, 7, 0, Math.PI * 2); g.fill();
  g.strokeStyle = INK.zap; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = INK.zap; g.beginPath(); g.arc(16, 16, 2.2, 0, Math.PI * 2); g.fill();
  g.restore();
  // One direction always fires the same way, so how it turns says nothing (register 300).
  if (badge && t.dirs.length > 1) modeBadge(g, t.mode, badge[0], badge[1]);
}

export function drawPiece(g, e, px, py, scale = 1, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(px + T / 2, py + T / 2); g.scale(scale, scale); g.translate(-T / 2, -T / 2);
  if (e.kind === 'mover') {
    g.fillStyle = INK.mover; roundRect(g, 2, 2, T - 4, T - 4, 6); g.fill();
    g.strokeStyle = INK.moverEdge; g.lineWidth = 2; g.stroke();
    g.strokeStyle = '#3b4252'; g.lineWidth = 2.5;
    g.beginPath();
    if (e.axis === 'h') { g.moveTo(10, 12); g.lineTo(6, 16); g.lineTo(10, 20); g.moveTo(22, 12); g.lineTo(26, 16); g.lineTo(22, 20); }
    else { g.moveTo(12, 10); g.lineTo(16, 6); g.lineTo(20, 10); g.moveTo(12, 22); g.lineTo(16, 26); g.lineTo(20, 22); }
    g.stroke();
    modeBadge(g, e.mode);
  } else if (e.kind === 'enemy') {
    g.fillStyle = INK.enemy;
    g.beginPath(); g.moveTo(16, 3); g.lineTo(29, 16); g.lineTo(16, 29); g.lineTo(3, 16); g.closePath(); g.fill();
    const [lx, ly] = e.axis === 'h' ? [e.dir * 2.5, 0] : [0, e.dir * 2.5];
    g.fillStyle = '#fff';
    g.beginPath(); g.arc(12 + lx, 15 + ly, 3, 0, Math.PI * 2); g.arc(20 + lx, 15 + ly, 3, 0, Math.PI * 2); g.fill();
    modeBadge(g, e.mode);
  } else if (e.kind === 'strong') {
    g.fillStyle = INK.strong; roundRect(g, 2, 3, T - 4, T - 5, 7); g.fill();
    g.strokeStyle = INK.strongEdge; g.lineWidth = 2; g.stroke();
    g.fillStyle = INK.strongEdge;
    g.beginPath(); g.moveTo(6, 6); g.lineTo(9, 0); g.lineTo(12, 5); g.moveTo(20, 5); g.lineTo(23, 0); g.lineTo(26, 6); g.fill();
    const [lx, ly] = e.axis === 'h' ? [e.dir * 2.5, 0] : [0, e.dir * 2.5];
    g.fillStyle = '#ffd34d';
    g.fillRect(9 + lx, 13 + ly, 5, 3); g.fillRect(18 + lx, 13 + ly, 5, 3);
    modeBadge(g, e.mode);
  } else if (e.kind === 'turret') {
    g.fillStyle = INK.wall; roundRect(g, 1, 1, T - 2, T - 2, 5); g.fill();
    g.fillStyle = INK.wallTop; roundRect(g, 1, 1, T - 2, 7, 4); g.fill();
  } else if (e.kind === 'box') {
    g.fillStyle = INK.box; roundRect(g, 4, 4, T - 8, T - 8, 3); g.fill();
    g.strokeStyle = INK.boxEdge; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.moveTo(7, 7); g.lineTo(25, 25); g.moveTo(25, 7); g.lineTo(7, 25); g.stroke();
  } else if (e.kind === 'bomb') {
    // The fuse is the timer: a full cord before it is lit, a spark that burns it down one
    // length per move, and with no cord left the body glows: it goes off when this move ends.
    const k = e.fuse == null ? 2 : e.fuse, hot = e.fuse === 0 ? 0.5 + 0.5 * Math.sin(frame.clock / 70) : 0;
    g.fillStyle = INK.bomb; g.beginPath(); g.arc(16, 18, 10, 0, Math.PI * 2); g.fill();
    if (hot) { g.fillStyle = `rgba(255,90,40,${0.35 + 0.45 * hot})`; g.beginPath(); g.arc(16, 18, 10, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = INK.bombHi; g.beginPath(); g.arc(12, 14, 2.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK.bomb; g.fillRect(14, 6, 5, 4);
    const tip = [[17, 6], [21, 2], [26, 3]].slice(0, k + 1);
    if (k) { g.strokeStyle = INK.fuse; g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); tip.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.lineCap = 'butt'; }
    if (e.fuse != null) {
      const [sx, sy] = tip[tip.length - 1], f = 2 + Math.sin(frame.clock / 45);
      g.fillStyle = INK.spark; g.beginPath(); g.arc(sx, sy, 1.8 + f * 0.6, 0, Math.PI * 2); g.fill();
    }
  } else if (e.kind === 'heavy') {
    g.fillStyle = INK.heavy; roundRect(g, 2, 2, T - 4, T - 4, 3); g.fill();
    g.strokeStyle = INK.heavyEdge; g.lineWidth = 3; g.stroke();
    g.fillStyle = INK.rivet;
    for (const [rx, ry] of [[7, 7], [25, 7], [7, 25], [25, 25]]) { g.beginPath(); g.arc(rx, ry, 2, 0, Math.PI * 2); g.fill(); }
  }
  if (e.turret) drawTurret(g, e.turret, e.kind === 'turret' ? [24, 8] : [8, 24], e.kind !== 'turret');
  g.restore();
}

// The robot, centred on 0,0 and about 20 across: antenna, body, visor with two eyes, feet.
// Hidden, only its outline (dashed) and its eyes show.
export function drawRobot(g, hidden = false) {
  g.save(); g.scale(0.5, 0.5); g.translate(-26, -27);
  const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  if (!hidden) {
    g.strokeStyle = INK.robotDark; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(26, 6); g.lineTo(26, 13); g.stroke();
    g.fillStyle = INK.robotTip; g.beginPath(); g.arc(26, 5, 3.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = INK.robotDark; rr(15, 41, 7, 6, 2); g.fill(); rr(30, 41, 7, 6, 2); g.fill();
    g.fillStyle = INK.player; rr(9, 13, 34, 28, 9); g.fill();
    g.fillStyle = INK.robotVisor; rr(14, 19, 24, 12, 6); g.fill();
  } else {
    g.strokeStyle = INK.player; g.lineWidth = 3; g.setLineDash([5, 5]); rr(9, 13, 34, 28, 9); g.stroke(); g.setLineDash([]);
  }
  g.fillStyle = INK.robotEye; g.beginPath(); g.arc(21, 25, 3, 0, Math.PI * 2); g.arc(31, 25, 3, 0, Math.PI * 2); g.fill();
  g.restore();
}

// You, when a person plays (register 302): a round body with two eyes, about 20 across.
export function drawYou(g, hidden = false) {
  g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2);
  if (hidden) { g.strokeStyle = INK.player; g.lineWidth = 1.5; g.setLineDash([2.5, 2.5]); g.stroke(); g.setLineDash([]); }
  else { g.fillStyle = INK.player; g.fill(); g.strokeStyle = INK.robotDark; g.lineWidth = 1.5; g.stroke(); }
  g.fillStyle = INK.robotEye; g.beginPath(); g.arc(-3.5, -1.5, 1.6, 0, Math.PI * 2); g.arc(3.5, -1.5, 1.6, 0, Math.PI * 2); g.fill();
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
