// Sound (register 647): short bleeps made on the spot, no files. Each thing the room does that has a voice
// sounds once, the first frame it is drawn; a button sounds as it is pressed and lights up as it is let go.
// The menu's speaker turns it all off, and the choice is kept.
import { $ } from './dom.js';
import { glyph } from './glyphs.js';

const KEY = 'wee.sound';
let on = true, ctx = null;
try { on = localStorage.getItem(KEY) !== 'off'; } catch { /* storage off */ }
export const soundOn = () => on;
export function setSound(v) { on = v; try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* storage off */ } sync(); }

// One bleep: a square or triangle wave sliding from f0 to f1, quick in and out.
function blip(f0, f1, ms, type = 'square', vol = 0.04, delay = 0) {
  if (!on) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime + delay / 1000, o = ctx.createOscillator(), a = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + ms / 1000);
    a.gain.setValueAtTime(vol, t); a.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.connect(a).connect(ctx.destination); o.start(t); o.stop(t + ms / 1000 + 0.02);
  } catch { /* no audio here */ }
}
const splat = () => { blip(120, 45, 110, 'triangle', 0.07); blip(520, 180, 90, 'sawtooth', 0.03, 40); blip(300, 140, 120, 'triangle', 0.03, 120); };
const DEATHS = {
  spring: splat, crush: splat,
  spikes: () => { blip(900, 1600, 30, 'square', 0.04); blip(400, 120, 140, 'triangle', 0.04, 30); },
  laser: () => [0, 45, 90, 135].forEach(d => blip(1800 - d * 6, 900 - d * 4, 40, 'sawtooth', 0.02, d)),
  blast: () => blip(300, 50, 280, 'sawtooth', 0.04),
  hit: () => blip(500, 60, 260, 'square', 0.04),
};
export const VOICES = {
  tap: () => blip(880, 660, 35, 'square', 0.025),
  place: () => blip(420, 840, 70, 'square', 0.035),
  erase: () => blip(360, 120, 90, 'triangle', 0.05),
  launch: () => blip(200, 320, 45, 'triangle', 0.03),
  land: () => blip(150, 90, 60, 'triangle', 0.05),
  hit: () => blip(110, 70, 70, 'square', 0.03),
  doors: f => blip(f.open ? 300 : 500, f.open ? 600 : 250, 110, 'square', 0.03),
  // Each death has its own sound (docs/THEME.md rule 20): a splat, a pop, a sizzle, or the plain fall.
  die: f => (DEATHS[f.death && f.death.how] || DEATHS.hit)(),
  eat: () => { blip(700, 1100, 50, 'triangle', 0.04); blip(1100, 900, 60, 'triangle', 0.03, 50); },
  break: () => { blip(180, 90, 80, 'sawtooth', 0.035); blip(120, 60, 110, 'triangle', 0.04, 50); },
  blast: () => { blip(160, 40, 240, 'sawtooth', 0.05); blip(90, 40, 300, 'triangle', 0.06, 30); },
  refuse: () => { blip(140, 140, 60, 'square', 0.04); blip(110, 110, 70, 'square', 0.04, 80); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, f, 120, 'square', 0.035, i * 90)),
  star: () => { blip(988, 988, 70, 'square', 0.03); blip(1319, 1319, 120, 'square', 0.03, 70); },
  tick: () => blip(1200, 1500, 30, 'square', 0.02),
  // Two soft falling notes: undo (register 661).
  stuck: () => { blip(660, 640, 90, 'triangle', 0.035); blip(440, 420, 140, 'triangle', 0.035, 110); },
};
export const play = (name, f = {}) => VOICES[name] && VOICES[name](f);

const heard = new WeakSet();
export function soundFx(fx) {
  for (const f of fx) if (!heard.has(f)) { heard.add(f); if (VOICES[f.type]) play(f.type, f); }
}

function sync() {
  const b = $('menuSound'); if (!b) return;
  b.innerHTML = glyph(on ? 'sound' : 'mute');
  const label = on ? 'Sound is on; tap to turn it off' : 'Sound is off; tap to turn it on';
  b.setAttribute('aria-label', label); b.title = label; b.setAttribute('aria-pressed', String(on));
}

export function bindSound() {
  sync();
  $('menuSound').onclick = () => { setSound(!on); if (on) play('tap'); };
  // A press sounds and sinks; a let-go lights the face for a moment (the lip is in the stylesheet).
  addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button'); if (b && !b.disabled && b.id !== 'menuSound') play('tap'); }, true);
  addEventListener('pointerup', e => {
    const b = e.target.closest && e.target.closest('button');
    if (!b || b.disabled) return;
    b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 90);
  }, true);
}
