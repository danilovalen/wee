// Springs (register 822): a spring pushes one thing per move, then stays out until everything has
// stopped. What it faces when it fires is launched its way; what cannot go that way is crushed.
import { DIRS, HOLDS_DOOR, breaks, wades } from './base.js';
import { entAt, fling, inb, playerAt, stepTo } from './grid.js';
import { breakTile, die, kill } from './life.js';
import { tileFits } from './crates.js';

// Nothing moving: no slide, no rush, the blob still and not hidden. A move ends here.
export const calm = s => !s.player.dir && !s.player.hidden && !s.entities.some(e => !e.dead && (e.rush || e.slide)) && !(s.tiles && s.tiles.some(t => t.slide));

// The cells never change during a run, so where the springs are is worked out once.
const SPRINGS = new WeakMap();
export function springsOf(s) {
  let list = SPRINGS.get(s.cells);
  if (!list) {
    list = [];
    s.cells.forEach((c, i) => { if (c.startsWith('spring:')) { const d = c.slice(7); list.push({ i, d, x: i % s.w + DIRS[d][0], y: Math.floor(i / s.w) + DIRS[d][1] }); } });
    SPRINGS.set(s.cells, list);
  }
  return list;
}

// Springs fire only while something moves, so a piece resting in front waits for the next move,
// and they all draw back once everything has stopped.
export function fireSprings(s) {
  const list = springsOf(s);
  if (!list.length) return;
  if (calm(s)) { if (s.sprung.length) s.sprung = []; return; }
  for (const sp of list) if (!s.sprung.includes(sp.i) && inb(s, sp.x, sp.y) && push(s, sp)) s.sprung = [...s.sprung, sp.i];
}

// One spring's push; true when it is spent. A thing already going its way is left alone, a heavy
// piece or an armored blob that cannot move jams it (it stays armed), and anything else stuck is crushed.
function push(s, { d, x, y }) {
  const p = s.player, you = playerAt(s, x, y), e = entAt(s, x, y);
  const tile = !you && !e && s.tiles.find(t => t.x === x && t.y === y);
  // A pushable tile is a box here (register 825): launched sliding if it can go, broken if not.
  if (tile) {
    if (tile.slide === d) return false;
    if (tileFits(s, x + DIRS[d][0], y + DIRS[d][1])) { s.tiles = s.tiles.map(o => o === tile ? { ...o, slide: d } : o); s.events.push({ type: 'spring', x, y, d }); }
    else breakTile(s, x, y, 'spring');
    return true;
  }
  if (!you && !e) return false;
  const n = s.events.length;
  fling(s, x, y, d, 'spring');
  let spent = s.events.length > n;
  if (you && p.dir !== d && !stepTo(s, x, y, d, p.swimming)) {
    if (!s.powers.armored) { die(s, 'spring'); spent = true; }
  }
  if (e && !e.dead && e.slide !== d && (e.kind === 'turret' || !stepTo(s, x, y, d, wades(e), breaks(e))) && !HOLDS_DOOR.includes(e.kind)) {
    kill(s, e, 'spring'); spent = true;
  }
  return spent;
}
