// The palette: every tool, its group and label, and the words the editor uses for
// powers, colours, clocks and directions. Draft copy throughout.
export const TOOLS = [
  { id: 'look', label: 'Look', group: 'basic' },
  { id: 'erase', label: 'Erase', group: 'basic' },
  { id: 'start', label: 'Start', group: 'basic' },
  { id: 'wall', label: 'Block', group: 'basic' },
  { id: 'checkpoint', label: 'Checkpoint', group: 'basic' },
  { id: 'goal', label: 'Goal', group: 'basic' },
  { id: 'mover', label: 'Moving block', group: 'pieces' },
  { id: 'enemy', label: 'Weak enemy', group: 'pieces' },
  { id: 'strong', label: 'Strong enemy', group: 'pieces' },
  { id: 'turret', label: 'Laser turret', group: 'pieces' },
  { id: 'box', label: 'Box', group: 'pieces' },
  { id: 'heavy', label: 'Heavy box', group: 'pieces' },
  { id: 'tri', label: 'Triangle', group: 'tiles' },
  { id: 'gate', label: 'One-way', group: 'tiles' },
  { id: 'spring', label: 'Spring', group: 'tiles' },
  { id: 'death', label: 'Death block', group: 'tiles' },
  { id: 'water', label: 'Water', group: 'tiles' },
  { id: 'sticky', label: 'Sticky puddle', group: 'tiles' },
  { id: 'button', label: 'Button', group: 'switches' },
  { id: 'door', label: 'Door', group: 'switches' },
  { id: 'idoor', label: 'Inverted door', group: 'switches' },
  { id: 'receiver', label: 'Laser catcher', group: 'switches' },
  { id: 'sensor', label: 'Laser relay', group: 'switches' },
];
export const POWER_TEXT = {
  boomerang: 'While sliding, press back to slide the other way.',
  dive: 'While sliding, press the same arrow to land at once and crash.',
  laser: 'While sliding, press a side arrow to fire a beam that way.',
  cycle: 'When standing, press Space to hide. The world takes a step, and you come back once it settles. If anything is on you then, you are squashed. With Swim too, the same press does both.',
  hook: 'Stop on grapple tiles.',
  swim: 'When standing on land, press Space to start or stop swimming. The world takes a step. While swimming, you can go into water, at half speed.',
  light: 'When standing still, light up dark rooms.',
  armored: 'Weak enemies, blocks and closing doors cannot crush you. Strong enemies, heavy boxes, beams and death blocks still can.',
};
export const NAMES = { boomerang: 'Boomerang', dive: 'Dive', laser: 'Laser', cycle: 'Cycle', hook: 'Hook', swim: 'Swim', light: 'Light', armored: 'Armored' };


// The palette shows one group at a time on a phone, so it fits without scrolling.
export const GROUPS = [['basic', 'Basics'], ['pieces', 'Pieces'], ['tiles', 'Tiles'], ['switches', 'Switches']];
export const COLOUR_NAME = { red: 'Red', blue: 'Blue', yellow: 'Yellow', green: 'Green' };
export const CLOCK_NAME = { realtime: 'real time', input: 'on your move', follow: 'same way as you' };
export const ARROW = { up: '\u2191', right: '\u2192', down: '\u2193', left: '\u2190' };
export const CORNER_NAME = { nw: 'top left', ne: 'top right', sw: 'bottom left', se: 'bottom right' };
