import { emptyLevel } from '../src/sim.js';

// A room drawn in text. Legend:
//   #  wall          P  player start     C  checkpoint
//   M  mover, h      V  mover, v         E  enemy, h     F  enemy, v
//   S  strong enemy, h                  T  laser turret (fires right)
//   B  box           H  heavy box
//   o  red button    D  red door         u  blue button  Q  blue door    r  red receiver  s  red laser sensor  w  water  %  sticky puddle
//   > < ^ v  one-way tile (that way)      =  two-way, across      |  two-way, up and down
//   X  death block    8 6 2 4  spring facing up, right, down, left (numpad)
//   7 9 1 3  triangle, solid in the corner a numpad key points to (7 = north-west)
// Movers are 'input' unless opts.mode says 'realtime'.
export function room(rows, opts = {}) {
  const h = rows.length, w = rows[0].length;
  const l = emptyLevel(w, h);
  l.clock = opts.clock || 'tile';
  if (opts.powers) l.powers = { ...l.powers, ...opts.powers };
  const mode = opts.mode || 'input';
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    const i = y * w + x;
    const put = (kind, axis) => l.entities.push({ kind, x, y, axis, dir: 1, mode });
    switch (ch) {
      case '#': l.cells[i] = 'wall'; break;
      case 'C': l.cells[i] = 'checkpoint'; break;
      case 'o': l.cells[i] = 'button:red'; break;
      case 'D': l.cells[i] = 'door:red'; break;
      case 'u': l.cells[i] = 'button:blue'; break;
      case 'r': l.cells[i] = 'receiver:red'; break;
      case 's': l.cells[i] = 'sensor:red'; break;
      case 'w': l.cells[i] = 'water'; break;
      case '%': l.cells[i] = 'sticky'; break;
      case 'Q': l.cells[i] = 'door:blue'; break;
      case 'P': l.start = { x, y }; break;
      case 'M': put('mover', 'h'); break;
      case 'V': put('mover', 'v'); break;
      case 'E': put('enemy', 'h'); break;
      case 'F': put('enemy', 'v'); break;
      case 'S': put('strong', 'h'); break;
      case 'T': l.entities.push({ kind: 'turret', x, y, turret: { dirs: ['right'], mode } }); break;
      case 'B': put('box'); break;
      case 'H': put('heavy'); break;
      case '7': l.cells[i] = 'tri:nw'; break;
      case '9': l.cells[i] = 'tri:ne'; break;
      case '1': l.cells[i] = 'tri:sw'; break;
      case '3': l.cells[i] = 'tri:se'; break;
      case '>': l.cells[i] = 'gate:right'; break;
      case '<': l.cells[i] = 'gate:left'; break;
      case '^': l.cells[i] = 'gate:up'; break;
      case 'v': l.cells[i] = 'gate:down'; break;
      case '=': l.cells[i] = 'gate:right,left'; break;
      case '|': l.cells[i] = 'gate:up,down'; break;
      case 'X': l.cells[i] = 'death'; break;
      case '8': l.cells[i] = 'spring:up'; break;
      case '6': l.cells[i] = 'spring:right'; break;
      case '2': l.cells[i] = 'spring:down'; break;
      case '4': l.cells[i] = 'spring:left'; break;
      case '.': break;
      default: throw new Error('Unknown map character: ' + ch);
    }
  }));
  return l;
}

// Every gate ends on one "N/N passed" line; the runner treats a missing total as red.
export function suite(name) {
  const results = [];
  const check = (label, cond, detail = '') => {
    results.push(!!cond);
    if (!cond) console.log(`FAIL ${name}: ${label}${detail ? ' :: ' + detail : ''}`);
  };
  const done = () => {
    const ok = results.filter(Boolean).length;
    console.log(`${name}: ${ok}/${results.length} passed`);
    if (results.length === 0) { console.log('FAIL: checked nothing'); process.exit(1); }
    process.exit(ok === results.length ? 0 : 1);
  };
  return { check, done };
}
