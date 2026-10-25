// The one text legend for rooms (register 462): tests, tools and the known rooms all read it.
//   .  floor          #  block          P  robot start    G  goal          x  spikes
//   t T  red, blue switch       o q  red, blue button      D Q  red, blue door     X  red-and-blue door
//   I J  red, blue inverted door          r R  red, blue relay
//   > < ^ v  one-way that way   =  one-way across   |  one-way up and down
//   n e s w  laser firing up, right, down, left    N E S W  the same, pushable
//   B  box   H  heavy box   O  bomb   M V  mover across, up and down   Z F  enemy across, up and down   A  strong enemy
//   ~  water   %  sticky puddle   g  gravel   k  breakable block   C  checkpoint
//   8 6 2 4  spring facing up, right, down, left (numpad)   7 9 1 3  triangle, solid in that corner (7 = north-west)
export const CELL = {
  '#': 'wall', x: 'death', G: 'goal', t: 'toggle:red', T: 'toggle:blue', o: 'button:red', q: 'button:blue',
  D: 'door:red', Q: 'door:blue', X: 'door:red|blue', I: 'idoor:red', J: 'idoor:blue', r: 'sensor:red', R: 'sensor:blue',
  '>': 'gate:right', '<': 'gate:left', '^': 'gate:up', v: 'gate:down', '=': 'gate:right,left', '|': 'gate:up,down',
  '~': 'water', '%': 'sticky', g: 'gravel', k: 'crack', C: 'checkpoint',
  8: 'spring:up', 6: 'spring:right', 2: 'spring:down', 4: 'spring:left', 7: 'tri:nw', 9: 'tri:ne', 1: 'tri:sw', 3: 'tri:se',
};
export const PIECE = {
  B: { kind: 'box' }, H: { kind: 'heavy' }, O: { kind: 'bomb' }, M: { kind: 'mover', axis: 'h' }, V: { kind: 'mover', axis: 'v' },
  Z: { kind: 'enemy', axis: 'h' }, F: { kind: 'enemy', axis: 'v' }, A: { kind: 'strong', axis: 'h' },
};
// A laser's letter: the way it fires, and whether it is pushable (upper case).
export const LASER = { n: 'up', e: 'right', s: 'down', w: 'left', N: 'up', E: 'right', S: 'down', W: 'left' };
export const pushableLaser = c => c in LASER && c === c.toUpperCase();
