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
export const VOICES = {
  tap: () => blip(880, 660, 35, 'square', 0.025),
  place: () => blip(420, 840, 70, 'square', 0.035),
  erase: () => blip(360, 120, 90, 'triangle', 0.05),
  launch: () => blip(200, 320, 45, 'triangle', 0.03),
  land: () => blip(150, 90, 60, 'triangle', 0.05),
  hit: () => blip(110, 70, 70, 'square', 0.03),
  doors: f => blip(f.open ? 300 : 500, f.open ? 600 : 250, 110, 'square', 0.03),
  die: () => blip(500, 60, 260, 'square', 0.04),
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
