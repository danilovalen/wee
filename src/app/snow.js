// Drift: snow behind the shell. It falls slowly, and when the player starts a slide it rushes the
// same way for a moment, then settles. Still under reduced motion.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FLAKES = 60, GUST = 1.2, SETTLE = 0.94;
let wind = { x: 0, y: 0 }, flakes = [];

// A slide starting: push the snow that way. dir is 'up', 'down', 'left' or 'right'.
export function gust(dir) {
  if (reduce) return;
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  if (d) wind = { x: d[0] * GUST, y: d[1] * GUST };
}
export const windNow = () => ({ ...wind });

export function startSnow(cv) {
  const g = cv.getContext('2d');
  flakes = Array.from({ length: FLAKES }, () => ({ x: Math.random(), y: Math.random(), r: 0.4 + Math.random() * 1.6, fall: 0.0003 + Math.random() * 0.0008, sway: Math.random() * 6 }));
  // Cheap on purpose: one pixel per CSS pixel and every other frame, so it never slows a search.
  let odd = false;
  const draw = t => {
    odd = !odd;
    if (odd) { requestAnimationFrame(draw); return; }
    const w = innerWidth, h = innerHeight;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(234,246,255,.5)';
    for (const f of flakes) {
      if (!reduce) {
        f.y = (f.y + 2 * f.fall + wind.y * f.r * 0.0016 + 1) % 1;
        f.x = (f.x + Math.sin(t / 1400 + f.sway) * 0.0006 + wind.x * f.r * 0.0016 + 1) % 1;
      }
      g.beginPath(); g.arc(f.x * w, f.y * h, f.r, 0, Math.PI * 2); g.fill();
    }
    wind = { x: wind.x * SETTLE, y: wind.y * SETTLE };
    if (!reduce) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
