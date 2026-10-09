// The rules' vocabulary: directions, colours, piece kinds, timings and the small tables
// every other rules file reads.

export const TICK_MS = 60;
export const RT_PERIOD = 6;
// Hiding lasts at least this long, and until every piece the hide sent sliding has stopped.
export const HIDE_TICKS = 4;
export const LASER_TICKS = 5;

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const COLOURS = ['red', 'blue', 'yellow', 'green'];

// A triangle ('tri:se') is solid in that corner; its other two faces are open. What
// enters through one open face leaves through the other, turned 90 degrees.
export const CORNERS = ['nw', 'ne', 'sw', 'se'];
export const EXIT_FACE = { up: 'n', down: 's', left: 'w', right: 'e' };
export const ENTRY_FACE = { up: 's', down: 'n', left: 'e', right: 'w' };
export const OUT = { n: 'up', s: 'down', e: 'right', w: 'left' };
export const OPP = { n: 's', s: 'n', e: 'w', w: 'e' };
export const openFaces = corner => [OPP[corner[0]], OPP[corner[1]]];
export const turn = (corner, d) => OUT[openFaces(corner).find(f => f !== ENTRY_FACE[d])];



// Clockwise order: a turret fires its chosen directions in this order.
export const CLOCKWISE = ['up', 'right', 'down', 'left'];
export const KINDS = ['mover', 'enemy', 'strong', 'box', 'heavy', 'turret'];
export const MOVES = ['mover', 'enemy', 'strong'];
export const ENEMY = ['enemy', 'strong'];
// realtime: on its own clock; input: on each world step; follow: on each world step,
// the same way the player moved.
export const MODES = ['realtime', 'input', 'follow'];
// A turret can stand alone or ride one of these.
export const CARRIES_TURRET = ['box', 'heavy', 'enemy', 'strong'];

// A power listed in NEEDS cannot act until its block type exists.
export const POWERS = ['boomerang', 'dive', 'laser', 'cycle', 'hook', 'swim', 'light', 'armored'];
export const NEEDS = { hook: 'grapple tiles', light: 'dark levels' };

// Water stops you unless you are swimming, and stops weak enemies, light boxes and
// lone turrets. Strong enemies, heavy boxes and blocks go through it.
export const WADES = ['strong', 'heavy', 'mover'];
export const wades = e => WADES.includes(e.kind);
// A closing door squashes what is in it, unless one of these holds it open.
export const HOLDS_DOOR = ['strong', 'heavy', 'mover'];

export const DIR_OF = (dx, dy) => Object.keys(DIRS).find(k => DIRS[k][0] === dx && DIRS[k][1] === dy);
