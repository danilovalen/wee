// Placing a map room's marks (register 932). A level spot is gravel with a level's name on it; a
// sign is a word on a tile. Placing either never moves a piece but the one on the spot's gravel.
export const MARK_TOOLS = ['spot', 'sign'];
const keep = (level, k, list) => { if (list.length) level[k] = list; else delete level[k]; };
const at = (x, y) => m => m.x === x && m.y === y;
export const signAt = (level, x, y) => (level.signs || []).find(at(x, y));
export const spotsAt = (level, x, y) => (level.spots || []).filter(at(x, y));
export const holdsMark = (level, x, y, tool) => tool === 'sign' ? !!signAt(level, x, y) : spotsAt(level, x, y).length > 0;

// how: 'place' or 'remove'. Returns the effects to show, as place() does.
export function placeMark(level, ui, x, y, how) {
  const here = at(x, y), fx = [{ type: how === 'place' ? 'place' : 'erase', x, y }];
  if (ui.tool === 'sign') {
    const was = level.signs || [], rest = was.filter(s => !here(s)), text = (ui.signText || '').trim();
    if (how === 'place') { if (!text) return []; rest.push({ x, y, text }); } else if (rest.length === was.length) return [];
    keep(level, 'signs', rest); return fx;
  }
  const was = level.spots || [], card = ui.spotCard || 'up';
  // A tile holds a spot for each side its cards go; a level has one spot in the whole room.
  const rest = was.filter(s => how === 'place' ? !(here(s) && s.card === card) && s.for !== ui.spotFor : !here(s));
  if (how === 'place') {
    if (!ui.spotFor) return [];
    level.cells[y * level.w + x] = 'gravel';
    level.entities = level.entities.filter(e => !here(e));
    rest.push({ x, y, for: ui.spotFor, card });
  } else if (rest.length === was.length) return [];
  keep(level, 'spots', rest); return fx;
}
// Erase takes a sign first, the top thing on its tile.
export function eraseSign(level, x, y) {
  if (!signAt(level, x, y)) return false;
  keep(level, 'signs', level.signs.filter(s => !at(x, y)(s))); return true;
}
// A spot lives on gravel: whatever takes the gravel takes the spot.
export function pruneSpots(level) { if (level.spots) keep(level, 'spots', level.spots.filter(s => level.cells[s.y * level.w + s.x] === 'gravel')); }
export const describeMarks = (level, x, y) => [...spotsAt(level, x, y).map(s => `Level spot for ${s.for}, card ${s.card}`), ...(signAt(level, x, y) ? [`Sign: ${signAt(level, x, y).text}`] : [])];
