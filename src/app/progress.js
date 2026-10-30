// The campaign's progress in this browser: each level's room, record and stats, and the last level
// open. Saves from before a renumbering are moved to the new numbers.
const KEY = 'wee.campaign';

export function progress() {
  try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p && p.levels) return migrate(p); } catch { /* storage off */ }
  return { last: null, levels: {}, v: 4 };
}
// v2 (register 226): level 8 became level 7, so its saved room and stats move with it; the old
// level 7's go, and the new level 8 starts empty. v3 (register 243, one day): a two-colour level 7
// moved 7-10 up one. v4 (register 246): that level is 11, so a v3 save's 8-11 go back to 7-10 and
// its 7 becomes 11; earlier saves already number 7-10 that way.
export function migrate(p) {
  const v = p.v || 1;
  if (v >= 4) return p;
  if (v < 2) {
    const old8 = p.levels['8'];
    delete p.levels['7']; delete p.levels['8'];
    if (old8) p.levels['7'] = old8;
    if (p.last === '8') p.last = '7'; else if (p.last === '7') p.last = null;
  }
  if (v === 3) {
    const at = n => p.levels[n], was = { 7: at(7), 8: at(8), 9: at(9), 10: at(10), 11: at(11) };
    for (const n of [7, 8, 9, 10, 11]) delete p.levels[n];
    for (const n of [8, 9, 10, 11]) if (was[n]) p.levels[n - 1] = was[n];
    if (was[7]) p.levels[11] = was[7];
    const l = +p.last;
    if (l === 7) p.last = '11'; else if (l >= 8 && l <= 11) p.last = String(l - 1);
  }
  p.v = 4; write(p);
  return p;
}
// Whether a player opening Campaign should land in the tutorial (register 512): nothing beaten and the tutorial unseen.
export const firstTime = p => !Object.values(p.levels || {}).some(r => r && r.beaten) && !(p.levels || {}).tutorial;
export const write = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage off or full */ } };
