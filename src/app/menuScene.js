// The main menu's background (register 782): a small real room the blob plays on a loop, run by the game's
// own rules and drawn by its own renderer, so a new palette, skin or sound reaches it with nothing to copy.
// The box blocks the laser, the blob bumps the closed door, steps on the switch and goes through to the berry.
// It runs only while the menu is on screen.
import { emptyLevel } from '../level/format.js';
import { createGame, step } from '../rules/game.js';
import { TICK_MS } from '../rules/base.js';
import { drawPlay } from '../view/scene.js';
import { drawFloor } from '../view/tiles.js';
import { drawMasses, ringCells } from '../view/masses.js';
import { frame } from '../view/ink.js';
import { motionFx } from '../view/juice.js';
import { T } from '../view/ink.js';
import { settled } from '../solve/solve.js';
import { soundFx } from './sound.js';

// M: tiles of floor drawn round the room on every side, so a wide screen shows more floor, not an island.
export const MENU_MARGIN = 12;
const W = 6, H = 8, M = MENU_MARGIN, C = 52, PX = 2, PAUSE_MS = 700, HOLD_MS = 1600;
const WALLS = [[5, 2], [3, 4], [0, 5], [1, 5], [2, 5], [3, 5], [5, 5], [3, 6], [5, 6], [4, 7], [0, 7]];
// Down pushes the box into the laser's row, right to the block, down into the closed door, right onto the
// switch, left back, and down through the open door onto the berry.
export const MENU_MOVES = ['down', 'right', 'down', 'right', 'left', 'down'];
export function menuLevel() {
  const l = emptyLevel(W, H);
  for (const [x, y] of WALLS) l.cells[y * W + x] = 'wall';
  l.cells[4 * W + 5] = 'toggle:red'; l.cells[5 * W + 4] = 'door:red'; l.cells[6 * W + 4] = 'goal';
  l.start = { x: 3, y: 0 };
  l.powers = { boomerang: false, dive: false, laser: false, cycle: false };
  l.entities = [{ kind: 'box', x: 3, y: 1 }, { kind: 'turret', x: 0, y: 3, turret: { dirs: ['right'], mode: 'input' } }];
  return l;
}
const snap = s => ({ player: { x: s.player.x, y: s.player.y }, ents: Object.fromEntries(s.entities.map(e => [e.id, { x: e.x, y: e.y }])) });

// The loop's state, read by the smokes: the run, how many frames it has drawn, and the sounds it asked for.
export const menuRoom = { game: null, draws: 0, ticks: 0 };

export function buildMenuScene(host) {
  host.innerHTML = '<canvas class="msRoom" id="menuRoom"></canvas>';
  const cv = host.firstElementChild, g = cv.getContext('2d');
  cv.width = (W + 2 * M) * T / PX; cv.height = (H + 2 * M) * T / PX;
  let game, prev, queue, rest, acc = 0, last = 0, won = 0, fx = [];
  const ring = ringCells(menuLevel(), new Set());
  const reset = () => { game = createGame(menuLevel()); prev = snap(game); queue = [...MENU_MOVES]; rest = 0; won = 0; fx = []; menuRoom.game = game; };
  reset();
  const shown = () => host.closest('dialog').open && !document.hidden;
  const tick = t => {
    const keys = [];
    if (!game.won && queue.length && settled(game)) { if (!rest) rest = t; if (t - rest >= PAUSE_MS) { keys.push(queue.shift()); rest = 0; } }
    prev = snap(game);
    const before = { x: game.player.x, y: game.player.y }, wasDir = game.player.dir, openBefore = JSON.stringify(game.open);
    step(game, keys); menuRoom.ticks++;
    motionFx(game, before, wasDir, openBefore, t, fx);
    for (const e of game.events) fx.push({ ...e, at: t, x: e.x ?? before.x, y: e.y ?? before.y });
    if (game.won && !won) won = t;
  };
  const draw = t => {
    fx = fx.filter(f => t - f.at < (f.type === 'flash' ? 900 : 400));
    if (shown()) soundFx(fx);
    const avatar = frame.avatar; frame.avatar = 'robot';
    g.setTransform(1 / PX, 0, 0, 1 / PX, 0, 0); drawFloor(g, W + 2 * M, H + 2 * M);
    g.translate(M * T, M * T);
    // The wall ring every level has (registers 672, 816): one tile out, joining the room's edge walls.
    g.save(); g.translate(-T, -T); drawMasses(g, ring, W + 2, H + 2); g.restore();
    drawPlay(g, game, prev, Math.min(1, acc / TICK_MS), fx, t);
    frame.avatar = avatar; menuRoom.draws++;
  };
  const loop = t => {
    requestAnimationFrame(loop);
    if (!shown()) { last = t; return; }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { if (!menuRoom.draws) draw(t); return; }
    acc += Math.min(250, t - (last || t)); last = t;
    while (acc >= TICK_MS) { tick(t); acc -= TICK_MS; }
    if (won && t - won > HOLD_MS) reset();
    draw(t);
  };
  requestAnimationFrame(loop);
  // A new palette or skin shows on the next frame by itself; the first frame is drawn now.
  draw(performance.now());
  // Fit: the room's six columns fill a phone's width, and the goal row always ends above the
  // buttons; on a wide screen it is centred with floor around it.
  const fit = () => {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight, top = Math.min(56, h * 0.07);
    const s = Math.max(1, Math.min(w / 316, (h - 230 - top) / 364));
    Object.assign(cv.style, { width: `${(W + 2 * M) * C}px`, height: `${(H + 2 * M) * C}px`, transform: `translate(${w / 2 - (156 + M * C) * s}px, ${top - M * C * s}px) scale(${s})` });
  };
  fit();
  addEventListener('resize', fit);
  return fit;
}

// Where a tile of the menu's room is on the screen, for the smokes that check the layout.
export function menuTileRect(x, y) {
  const r = document.getElementById('menuRoom').getBoundingClientRect(), u = r.width / (W + 2 * M);
  return { left: r.left + (M + x) * u, top: r.top + (M + y) * u, right: r.left + (M + x + 1) * u, bottom: r.top + (M + y + 1) * u };
}
