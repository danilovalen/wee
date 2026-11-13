// On and off switches tell apart at a glance, and a red one from a blue one in both states (register 951).
import { suite } from './lib.mjs';
import { CRAYON_SPRITES as S, P } from '../src/view/crayonSprites.js';

const { check, done } = suite('switch');
const cells = s => s.g.flat().filter(Boolean);
const share = (s, c) => cells(s).filter(v => v === c).length / cells(s).length;
const key = s => s.g.flat().map(v => v || '.').join('|');
check('off keeps its colour, only darker: no bright colour cell, no grey (register 964)', share(S.switchOff(P.red), P.red) === 0 && share(S.switchOn(P.red), P.red) > 0.2 && !cells(S.switchOff(P.red)).some(v => v === P.mid || v === P.hi));
check('a red and a blue switch differ when off', key(S.switchOff(P.red)) !== key(S.switchOff(P.blue)));
check('and when on', key(S.switchOn(P.red)) !== key(S.switchOn(P.blue)));
done();
