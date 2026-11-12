// A map room's marks (register 932): level spots, where Wee stops for a level and its card is drawn,
// and signs, a word or two on the wall. They sit beside the cells, as wires do, so no rule reads them.
export const CARD_SIDES = ['up', 'right', 'down', 'left'];
export const SIGN_MAX = 24;
// A map room may be far bigger than a room you play (rooms stop at 40x30).
export const tooBig = (l, w, h) => l.map ? w > 80 || h > 80 : w > 40 || h > 30;

// The marks after a resize or a cut: f moves one, or returns null when it falls out.
export function moveMarks(l, f) {
  const out = {};
  for (const k of ['spots', 'signs']) if (l[k]) out[k] = l[k].map(f).filter(Boolean);
  return out;
}

export function checkMarks(l) {
  const inRoom = m => Number.isInteger(m.x) && Number.isInteger(m.y) && m.x >= 0 && m.y >= 0 && m.x < l.w && m.y < l.h;
  const seen = new Set();
  for (const s of l.spots || []) {
    if (!inRoom(s) || typeof s.for !== 'string' || !s.for || !CARD_SIDES.includes(s.card)) throw new Error('A level spot needs a place in the room, a level and a side for its card.');
    if (l.cells[s.y * l.w + s.x] !== 'gravel') throw new Error('A level spot stands on gravel.');
    if (seen.has(s.for)) throw new Error('Two level spots open ' + s.for + '.');
    seen.add(s.for);
  }
  for (const s of l.signs || []) if (!inRoom(s) || typeof s.text !== 'string' || !s.text.trim() || s.text.length > SIGN_MAX) throw new Error('A sign needs a place in the room and a word or two.');
}
