// The main menu's background: a small room the blob plays on a loop (the box blocks a laser, the
// blob bumps the closed door, steps on the switch, goes through). Drawn in CSS, not the game's
// scene, so it costs nothing while the menu is shut.
import { drawCell } from '../view/tiles.js';
import { drawMasses } from '../view/masses.js';
import { drawPiece, drawRobot } from '../view/pieces.js';
import { T } from '../view/ink.js';

const C = 52;
// Each piece is painted by the game's own drawing, so the menu cannot drift from the room (register 553).
function art(draw) {
  const c = document.createElement('canvas'); c.width = c.height = T * 3;
  const g = c.getContext('2d'); g.scale(3, 3); draw(g); return `url(${c.toDataURL()})`;
}
const cell = (k, s) => art(g => drawCell(g, k, 0, 0, s, 1, true));
// Every move of the loop is a slide that runs until something stops it, as in the game (register 219):
// down pushing the box into the laser's row, right to the block, down into the closed door, right onto
// the switch, left back, down through the open door onto the goal.
const WALLS = [[5, 2], [3, 4], [0, 5], [1, 5], [2, 5], [3, 5], [5, 5], [3, 6], [5, 6], [4, 7], [0, 7]];
const at = (c, r, dx = 0, dy = 0) => `left:${c * C + dx}px;top:${r * C + dy}px`;

export function buildMenuScene(host) {
  host.innerHTML = `<div class="msRoom"><i class="msWalls"></i>
<i class="msEmitter" style="${at(0, 3)}"></i><i class="msBeam" style="${at(0, 3, 24, 23)}"></i>
<i class="msSwitch" style="${at(5, 4)}"><b class="off"></b><b class="on"></b></i>
<i class="msDoor" style="${at(4, 5)}"></i><i class="msSpark" style="${at(4, 5, 6, -10)}">✱ ✱</i>
<i class="msGoal" style="${at(4, 6)}"></i>
<i class="msBox"></i><i class="msRobot"><b class="msBody"></b></i></div>`;
  const room = host.firstElementChild, paint = (sel, url) => room.querySelectorAll(sel).forEach(e => { e.style.backgroundImage = url; });
  const draw = () => {
  // The walls as one mass, drawn as the room draws them, so neighbours join with no seam (register 648).
  { const c = document.createElement('canvas'), w = 6, h = 8, cells = Array(w * h).fill('');
    for (const [x, y] of WALLS) cells[y * w + x] = 'wall';
    c.width = w * T * 3; c.height = h * T * 3; const g = c.getContext('2d'); g.scale(3, 3); drawMasses(g, cells, w, h);
    room.querySelector('.msWalls').style.backgroundImage = `url(${c.toDataURL()})`; }
  paint('.msSwitch .off', cell('toggle:red', { toggled: [], w: 1, open: {} }));
  paint('.msSwitch .on', cell('toggle:red', { toggled: [0], w: 1, open: { red: true } }));
  paint('.msDoor', cell('door:red', { toggled: [], w: 1, open: {} }));
  paint('.msGoal', cell('goal', null));
  paint('.msBox', art(g => drawPiece(g, { kind: 'box' }, 0, 0)));
  // The player is the blob, the same sprite the room draws (register 593).
  paint('.msBody', art(g => { g.translate(T / 2, T / 2); drawRobot(g); }));
  paint('.msEmitter', art(g => drawPiece(g, { kind: 'turret', turret: { dirs: ['right'], mode: 'input' } }, 0, 0)));
  };
  draw();
  // A new palette or skin paints the pieces again (registers 612, 613).
  addEventListener('wee:look', draw);
  // Fit: the room's six columns fill a phone's width, and the goal row always ends above the
  // buttons; on a wide screen it is centred with floor around it.
  const fit = () => {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight, top = Math.min(56, h * 0.07);
    const s = Math.max(1, Math.min(w / 316, (h - 230 - top) / 364));
    room.style.transform = `translate(${w / 2 - 156 * s}px, ${top}px) scale(${s})`;
  };
  fit();
  addEventListener('resize', fit);
  return fit;
}
