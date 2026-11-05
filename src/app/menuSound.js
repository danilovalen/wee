// The menu's blob makes the game's sounds (register 778): every slide its loop plays sounds as the same slide
// does in a room, read off the loop's own keyframes so the two cannot drift: a launch as it starts, a land and
// a hit as it stops against something, the doors as the switch turns, and the win as it reaches the berry.
import { play } from './sound.js';

const pct = k => parseFloat(k.keyText);
const at = (rule, name) => [...rule.cssRules].map(k => ({ t: pct(k), v: k.style.getPropertyValue(name) }));
function keyframes(name) {
  for (const sheet of document.styleSheets) {
    let rules; try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) if (r.type === CSSRule.KEYFRAMES_RULE && r.name === name) return r;
  }
  return null;
}
// [percent of the loop, voice] for one loop, in order.
export function menuTimeline() {
  const move = keyframes('msRobot'), sw = keyframes('msSwOn');
  if (!move) return [];
  const out = [], f = at(move, 'transform');
  for (let i = 1; i < f.length; i++) if (f[i].v !== f[i - 1].v) out.push([f[i - 1].t, 'launch'], [f[i].t, 'land'], [f[i].t, 'hit']);
  if (out.length) out.push([out[out.length - 1][0], 'win']);
  if (sw) { const s = at(sw, 'opacity'), on = s.find((k, i) => i && +k.v > +s[i - 1].v); if (on) out.push([on.t, 'doors']); }
  return out.sort((a, b) => a[0] - b[0] || (a[1] === 'win') - (b[1] === 'win'));
}
// Each loop of the blob's animation schedules its sounds; none plays while the menu is not on screen.
export function bindMenuSound(robot, shown) {
  let timers = [];
  const loop = e => {
    if (e.animationName !== 'msRobot') return;
    timers.forEach(clearTimeout);
    const ms = parseFloat(getComputedStyle(robot).animationDuration) * 1000;
    timers = menuTimeline().map(([p, v]) => setTimeout(() => { if (shown()) play(v, { open: true }); }, p / 100 * ms));
  };
  robot.addEventListener('animationstart', loop);
  robot.addEventListener('animationiteration', loop);
}
