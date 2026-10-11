// Joined-up tiles: what each quarter of a cell draws, from its neighbours.
import { quarter, kindIn } from '../src/view/masses.js';
import { suite } from './suite.mjs';

const { check, done } = suite('masses');
const map = rows => kindIn(rows.join('').split('').map(c => ({ '#': 'wall', w: 'water', '.': '' })[c]), rows[0].length, rows.length);
const all = (k, kind, x, y) => [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([dx, dy]) => quarter(k, kind, x, y, dx, dy));

const alone = map(['.....', '.....', '..#..', '.....', '.....']);
check('a wall on its own rounds all four corners', all(alone, 'wall', 2, 2).every(q => q === 'round'), all(alone, 'wall', 2, 2).join());
const pair = map(['.....', '.##..', '.....']);
check('two walls side by side meet with no rounding', quarter(pair, 'wall', 1, 1, 1, -1) === 'full' && quarter(pair, 'wall', 2, 1, -1, 1) === 'full');
check('and round where they face out', quarter(pair, 'wall', 1, 1, -1, -1) === 'round' && quarter(pair, 'wall', 2, 1, 1, 1) === 'round');
const ell = map(['.....', '.##..', '.#...', '.....']);
check('the empty corner inside an L of three walls gets a fillet', quarter(ell, 'wall', 2, 2, -1, -1) === 'fillet');
const two = map(['.....', '.#...', '..#..', '.....']);
check('two walls touching only at a corner leave the empty cells alone', quarter(two, 'wall', 2, 1, -1, 1) === null && quarter(two, 'wall', 1, 2, 1, -1) === null);
check('outside the room counts as wall', alone(-1, 0) === 'wall' && alone(5, 2) === 'wall' && alone(0, 0) === '');
const edge = map(['#....', '.....']);
check('so a wall on the border joins it', quarter(edge, 'wall', 0, 0, -1, -1) === 'full');
const pool = map(['ww.', 'w..']);
check('water joins water and not the border', quarter(pool, 'water', 0, 0, -1, -1) === 'round' && quarter(pool, 'water', 1, 1, -1, -1) === 'fillet');
done();
