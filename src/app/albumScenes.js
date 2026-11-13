// The album's photos (docs/THEME.md rule 23, register 856): each earned achievement is a small drawn scene,
// three tiles by two, set up from the room's own sprites so a palette or a skin reaches it. A scene is a
// list of [sprite, x, y, key], x and y in tiles.
import { T } from '../view/ink.js';
import { drawFloor } from '../view/tiles.js';
import { drawSprite } from '../view/sprites.js';
import { P } from '../view/crayonSprites.js';

const W = 3, H = 2, PAD = 6, B = ['blob', 1, 0.5, 'right'];
export const SCENES = {
  first: [['blob', 0.5, 0.5, 'right'], ['berry', 1.6, 0.5]],
  half: [['doorShut', 0.4, 0.5, P.red], ['blob', 1.5, 0.5, 'right']],
  all: [['doorOpen', 0, 0.5, P.red], B, ['berry', 2, 0.5]],
  shelf: [['berry', 0.1, 0.5], ['berry', 1, 0.5], ['berry', 1.9, 0.5]],
  lab: [['sensor', 0, 0.5, P.blue + '|1'], B, ['switchOn', 2, 0.5, P.green]],
  challenge: [['blob', 0.4, 0.5, 'right'], ['wallFace', 1.7, 0.5], ['crateFrame', 1.7, 0.5]],
  pieces: [['box', 0, 0.5], ['laser', 1, 0.5, 'right|right'], ['sensor', 2, 0.5, P.blue + '|1']],
  cashback: [['blobAlt', 0.4, 0.5, 'right'], ['berryAlt', 1.7, 0.5]],
  moveit: [['gate', 0, 0.5, 'right||0'], B, ['gate', 2, 0.5, 'right||0']],
  oneshot: [['gate', 0, 0.5, 'right||0'], ['blob', 1, 0.5, 'right'], ['berry', 2, 0.5]],
  gateway: [['doorShut', 0, 0.5, P.red], ['doorShut', 1, 0.5, P.blue], ['blob', 2, 0.5, 'left']],
  guardrails: [['box', 0, 0.5], B, ['box', 2, 0.5]],
  deadly: [['death', 0, 0.5], ['blob', 1, 0.5, 'up'], ['death', 2, 0.5]],
  silver: [['buttonDown', 0, 0.5, P.red], B, ['switchOn', 2, 0.5, P.yellow]],
  score: [['berry', 0.2, 0.5], ['blob', 1, 0.5, 'left'], ['berry', 1.9, 0.5]],
};
export const sceneOf = id => SCENES[id] || (/^score\d+$/.test(id) ? SCENES.score : null);
// The photo for an achievement, or null when it has no scene.
export function photo(id) {
  const scene = sceneOf(id);
  if (!scene) return null;
  // A margin each side, so a piece at the edge keeps its line.
  const c = document.createElement('canvas'); c.width = W * T + 2 * PAD; c.height = H * T; c.className = 'achPhoto';
  const g = c.getContext('2d'); drawFloor(g, W + 1, H); g.translate(PAD, 0);
  for (const [name, x, y, key] of scene) drawSprite(g, name, x * T, y * T, { exact: true, colour: key ?? null });
  return c;
}
