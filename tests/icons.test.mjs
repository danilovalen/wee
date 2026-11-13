// The redrawn icons (register 934): one ring for every round icon, two pixels thick, even both ways.
import { suite } from './suite.mjs';
import { pixelBitmap } from '../src/app/pixelIcons.js';

const { check, done } = suite('icons');
const rows = k => pixelBitmap(k).map(r => r.map(v => (v ? '#' : '.')).join(''));
const flipX = g => g.map(r => [...r].reverse().join('')), flipY = g => [...g].reverse();
const target = rows('ach-oneshot'), coin = rows('ach-cashback');
check('the target is even both ways', target.join() === flipX(target).join() && target.join() === flipY(target).join());
check('the coin wears the same ring as the target', [0, 1, 2, 13, 14, 15].every(y => coin[y] === target[y]) && coin.every((r, y) => r.slice(0, 2) === target[y].slice(0, 2) && r.slice(14) === target[y].slice(14)));
check('the ring is two pixels thick round the side', target.slice(5, 11).every(r => r.startsWith('##.') && r.endsWith('.##')));
const lens = rows('look').slice(0, 11).map((r, y) => (y === 10 ? r.slice(0, 8) + '...' : r.slice(0, 11)));  // the handle leaves the lens on its last row
check('the magnifier\'s lens is even both ways', lens.join() === flipX(lens).join() && lens.join() === flipY(lens).join());
check('the tick\'s strokes are steps of two', rows('check').every(r => !/###/.test(r.replace('####', '##'))));
done();
