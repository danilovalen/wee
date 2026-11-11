// The closest attempt in a room the blob cannot win (register 642).
import { nearMiss } from '../src/solve/nearMiss.js';
import { room, suite } from './lib.mjs';

const { check, done } = suite('nearmiss');
const door = nearMiss(room(['#########', '#P.....D#', '#######G#', '#########']));
check('a door that never opens: Wee slides up to it and stops', door.path.join() === 'right' && door.end === 'stop' && door.at.x === 6, JSON.stringify(door));
const spikes = nearMiss(room(['#######', '#P.x.G#', '#######']));
check('spikes before the berry: Wee runs into them', spikes.path.join() === 'right' && spikes.end === 'die', JSON.stringify(spikes));
const walled = nearMiss(room(['#######', '#P....#', '#.###.#', '#.#G#.#', '#.###.#', '#.....#', '#######']));
check('a berry walled in: Wee still tries, never standing still', walled.path.length > 0, JSON.stringify(walled));
done();
