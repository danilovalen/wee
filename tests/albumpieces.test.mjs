// Every album photo shows only pieces the campaign has (registers 953, 954): no monster, no spring, no bomb.
import { suite } from './lib.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { listed } from '../src/campaign/rules.js';
import { SCENES } from '../src/app/albumScenes.js';

const { check, done } = suite('albumpieces');
// The sprites each campaign piece is drawn with; Wee, its skin and a placed block's frame are always there.
const DRAWN = { block: ['wallFace'], toggle: ['switchOn', 'switchOff'], door: ['doorShut', 'doorOpen', 'idoor'], box: ['box'], button: ['buttonUp', 'buttonDown'], gate: ['gate'], laser: ['laser'], relay: ['sensor'], berry: ['berry', 'berryAlt'], spikes: ['death'] };
const used = new Set(LEVELS.filter(listed).flatMap(l => Object.keys(l.palette)));
check('every campaign piece has its drawing named here', [...used].every(k => DRAWN[k]), [...used].filter(k => !DRAWN[k]).join());
const allowed = new Set(['blob', 'blobAlt', 'crateFrame', 'berry', ...[...used].flatMap(k => DRAWN[k] || [])]);
const odd = Object.entries(SCENES).flatMap(([id, s]) => s.filter(([name]) => !allowed.has(name)).map(([name]) => `${id}:${name}`));
check('every album photo shows only pieces the campaign has', odd.length === 0, odd.join());
done();
