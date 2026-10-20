// A tool's icon, drawn the way the room draws the thing: the palette and the generator's
// ingredients share it.
import { emptyLevel } from '../level/format.js';
import { T, INK } from '../view/ink.js';
import { drawPiece, drawRobot, drawYou } from '../view/pieces.js';
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
  } else if (tool === 'select') {
    x.strokeStyle = '#6f6876'; x.lineWidth = 2; x.setLineDash([4, 3]); x.strokeRect(6, 6, 20, 20); x.setLineDash([]);
  } else if (tool === 'look') {
    x.strokeStyle = '#6f6876'; x.lineWidth = 2.5;
    x.beginPath(); x.arc(14, 14, 7, 0, Math.PI * 2); x.moveTo(19, 19); x.lineTo(26, 26); x.stroke();
  } else if (tool === 'receiver') {
    const l = emptyLevel(1, 1); l.cells[0] = 'receiver:red'; l.start = { x: 9, y: 9 }; drawEdit(x, l, null, [], 0);
  } else if (tool === 'move') {
    // Four arrows out from the middle.
    x.strokeStyle = '#6f6876'; x.lineWidth = 2.5; x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(16, 5); x.lineTo(16, 27); x.moveTo(5, 16); x.lineTo(27, 16);
    for (const [ax, ay, dx, dy] of [[16, 5, 1, 1], [16, 27, 1, -1], [5, 16, 1, 1], [27, 16, -1, 1]]) {
      if (ax === 16) { x.moveTo(ax - 4, ay + 4 * dy); x.lineTo(ax, ay); x.lineTo(ax + 4, ay + 4 * dy); }
      else { x.moveTo(ax + 4 * dx, ay - 4); x.lineTo(ax, ay); x.lineTo(ax + 4 * dx, ay + 4); }
    }
    x.stroke();
  } else if (tool === 'erase') {
    x.strokeStyle = '#6f6876'; x.lineWidth = 3; x.beginPath(); x.moveTo(8, 8); x.lineTo(24, 24); x.moveTo(24, 8); x.lineTo(8, 24); x.stroke();
  } else if (tool === 'start' || tool === 'robot') {
    // The campaign's goal rows name the robot, which plays them (register 323); a room's start is you.
    x.save(); x.translate(16, 16); x.scale(1.3, 1.3); (tool === 'robot' ? drawRobot : drawYou)(x); x.restore();
  } else if (tool === 'turret') drawPiece(x, { kind: 'turret', crate, turret: { dirs: ['up', 'right'], mode: 'input' } }, 0, 0);
  // Two ingredients that are a tool with a twist: a turret riding a box, a block that copies you.
  else if (tool === 'mounted') drawPiece(x, { kind: 'box', turret: { dirs: ['up'], mode: 'input' } }, 0, 0);
  else if (tool === 'follow') drawPiece(x, { kind: 'mover', axis: 'h', dir: 1, mode: 'follow' }, 0, 0);
  else drawPiece(x, { kind: tool, axis: 'h', dir: 1, mode: 'input' }, 0, 0);
  return c;
}
