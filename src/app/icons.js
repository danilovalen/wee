// A tool's icon, drawn the way the room draws the thing: the palette and the generator's
// ingredients share it.
import { emptyLevel } from '../level/format.js';
import { T, INK } from '../view/ink.js';
import { drawPiece, drawRobot, drawYou } from '../view/pieces.js';
import { pixelBitmap } from './pixelIcons.js';
import { drawEdit } from '../view/scene.js';

// gateColour: a one-way drawn in that colour; none, a plain one.
export function icon(tool, colour = 'red', gateColour = null, crate = false) {
  const c = document.createElement('canvas'), k = 20 / T;
  c.width = 40; c.height = 40; c.dataset.icon = tool;
  const x = c.getContext('2d'); x.scale(2 * k, 2 * k);
  if (tool === 'wall' || tool === 'crack' || tool === 'checkpoint' || tool === 'button' || tool === 'toggle' || tool === 'door' || tool === 'idoor' || tool === 'tri' || tool === 'gate' || tool === 'spring' || tool === 'death' || tool === 'sensor' || tool === 'water' || tool === 'sticky' || tool === 'gravel' || tool === 'goal') {
    const l = emptyLevel(1, 1); l.cells[0] = tool === 'wall' || tool === 'crack' || tool === 'checkpoint' || tool === 'death' || tool === 'water' || tool === 'sticky' || tool === 'gravel' || tool === 'goal' ? tool : tool === 'tri' ? 'tri:se' : tool === 'gate' ? 'gate:right' + (gateColour ? '@' + gateColour : '') : tool === 'spring' ? 'spring:up' : tool + ':' + colour;
    if (crate) l.crates = [{ x: 0, y: 0 }];
    l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
  } else if (tool === 'wire') {
    // Three wires in their lanes, one bending, as the Wire tool (register 347).
    for (const [col, o] of [['teal', -6], ['violet', 0], ['charcoal', 6]]) { x.fillStyle = INK[col]; x.fillRect(4, 14 + o, 14 + o, 4); x.fillRect(14 + o, 14 + o, 4, 14 - o); }
  } else if (tool === 'select') {
    x.strokeStyle = '#5b595c'; x.lineWidth = 2; x.setLineDash([4, 3]); x.strokeRect(6, 6, 20, 20); x.setLineDash([]);
  } else if (tool === 'look' || tool === 'move' || tool === 'erase') {
    // The tool row's own icons are the HUD's pixel icons (register 602 S3), 2 units per pixel.
    // Whole canvas pixels, centred, so no edge is smoothed (register 643).
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#939293';
    pixelBitmap(tool).forEach((row, py) => row.forEach((v, px) => { if (v) x.fillRect(4 + px * 2, 4 + py * 2, 2, 2); }));
  } else if (tool === 'start' || tool === 'robot') {
    // The campaign's goal rows name the robot, which plays them (register 323); a room's start is you.
    x.save(); x.translate(16, 16); x.scale(1.3, 1.3); (tool === 'robot' ? drawRobot : drawYou)(x); x.restore();
  } else if (tool === 'beam') {
    // A laser's beam, apart from the laser box (register 550): a small emitter and its ray across the tile.
    const l = emptyLevel(1, 1); l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
    x.fillStyle = INK.zap; x.fillRect(3, 12, 7, 8);
    x.fillRect(11, 14, 18, 4);
  } else if (tool === 'turret') {
    // On a floor tile like every other piece, one barrel, so it does not read as a white blob (register 526).
    const l = emptyLevel(1, 1); l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
    drawPiece(x, { kind: 'turret', crate, turret: { dirs: ['right'], mode: 'input' } }, 0, 0);
  }
  // Two ingredients that are a tool with a twist: a turret riding a box, a block that copies you.
  else if (tool === 'mounted') drawPiece(x, { kind: 'box', turret: { dirs: ['up'], mode: 'input' } }, 0, 0);
  else if (tool === 'follow') {
    // A mover that copies you: the mover, and in this icon only two chevrons for "the same way" (registers 615, 624).
    drawPiece(x, { kind: 'mover', axis: 'h', dir: 1, mode: 'follow' }, 0, 0);
    x.fillStyle = '#19181a'; x.fillRect(18, 2, 12, 10); x.fillStyle = '#fcfcfa';
    for (const [cx, cy] of [[20, 4], [22, 6], [20, 8], [24, 4], [26, 6], [24, 8]]) x.fillRect(cx, cy, 2, 2);
  }
  else drawPiece(x, { kind: tool, axis: 'h', dir: 1, mode: 'input' }, 0, 0);
  return c;
}

// A new palette or skin (registers 612, 613) draws every icon on the page again, keeping its colour and crate.
export function repaintIcons() {
  for (const old of document.querySelectorAll('canvas[data-icon]')) {
    const { icon: tool, colour, crate } = old.dataset, c = tool === 'gate' ? icon(tool, 'red', colour || null, crate === 'true') : icon(tool, colour || 'red', null, crate === 'true');
    Object.assign(c.dataset, old.dataset); c.className = old.className; old.replaceWith(c);
  }
}
