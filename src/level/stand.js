// What a piece or the blob may start on (register 772): plain floor and the floor-like tiles. A berry,
// a relay, a crack, a one-way, spikes, a spring, a corner, a wall or a door may not have anything on it;
// placing one there takes the other off (768), and a piece can still be pushed onto them in play.
const FLOOR = new Set(['', 'water', 'sticky', 'gravel', 'checkpoint']);
export const canStand = c => FLOOR.has(c || '') || /^(button|toggle):/.test(c);
