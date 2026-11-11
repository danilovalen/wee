// Harsh moments (docs/THEME.md rule 20, register 842): how the blob died is read from the rules' own events,
// a room keeps its marks up to a cap, and the shake follows its setting. None of it is a rule.
import { suite } from './lib.mjs';
import { deathOf, stainsOf, tracksOf, keepStains, shakeOf, poseAt, STAIN_MAX, FLINCH_MS } from '../src/view/moments.js';
import { look } from '../src/view/look.js';
import { SPRITES, spriteSheet } from '../src/view/sprites.js';

const { check, done } = suite('moments');
const room = (w, h, cells = {}) => ({ w, h, cells: Array.from({ length: w * h }, (_, i) => cells[i] || '') });
const die = (x, y, how) => ({ type: 'die', x, y, ...(how ? { how } : {}) });

check('no death, no pose', deathOf([{ type: 'eat', x: 0, y: 0 }], room(3, 3)) === null);
// A spring at (0,1) facing right threw the blob onto (1,1).
const sprung = deathOf([die(1, 1, 'spring')], room(3, 3, { 3: 'spring:right' }));
check('a spring\'s death knows which way it was thrown', sprung.how === 'spring' && sprung.dir === 'right' && sprung.x === 1 && sprung.y === 1, JSON.stringify(sprung));
check('a spring death with no spring behind it is a plain crush', deathOf([die(1, 1, 'spring')], room(3, 3)).how === 'crush');
check('a spring across the room\'s edge is not counted', deathOf([die(0, 1, 'spring')], room(3, 3, { 2: 'spring:right' })).how === 'crush');
check('spikes and a laser keep the rules\' own names', deathOf([die(1, 1, 'spikes')], room(3, 3)).how === 'spikes' && deathOf([die(1, 1, 'laser')], room(3, 3)).how === 'laser');
check('a squash is a crush, a blast a blast, anything else a hit', deathOf([{ type: 'squash', x: 1, y: 1 }, die(1, 1)], room(3, 3)).how === 'crush' && deathOf([{ type: 'blast', x: 1, y: 1 }, die(1, 1)], room(3, 3)).how === 'blast' && deathOf([die(1, 1)], room(3, 3)).how === 'hit');

// What a tick leaves behind.
const keys = l => l.map(s => s.key.split('|')[0]).join();
check('each death leaves its own mark where it happened', ['spring', 'spikes', 'laser', 'blast', 'crush', 'hit'].map(how => stainsOf([], room(3, 3), [], { how, dir: 'right', x: 2, y: 1 })[0]).map(s => s.key.split('|')[0] + '@' + s.x + s.y).join() === 'splat@21,scraps@21,soot@21,soot@21,puddle@21,puddle@21');
check('a spring\'s splat keeps the way it was thrown', stainsOf([], room(3, 3), [], { how: 'spring', dir: 'up', x: 0, y: 0 })[0].key.endsWith('|up'));
const stood = [{ id: 1, kind: 'box', x: 1, y: 0 }, { id: 2, kind: 'enemy', x: 2, y: 2 }];
const left = stainsOf([{ type: 'eat', x: 0, y: 0 }, { type: 'break', x: 1, y: 1 }, { type: 'blast', x: 2, y: 0 }, { type: 'kill', id: 1 }, { type: 'kill', id: 2 }, { type: 'kill', id: 9 }, { type: 'kill', id: 2, how: 'blast' }], room(3, 3), stood, null);
check('a berry, a broken block, a blast and a killed piece each leave a mark', keys(left) === 'juice,rubble,scorch,flat,puddle', keys(left));
check('a killed piece\'s mark lies where it stood', left[3].x === 1 && left[3].y === 0 && left[4].x === 2 && left[4].y === 2);
check('a tick with nothing harsh leaves nothing', stainsOf([{ type: 'move', x: 1, y: 1 }], room(3, 3), [], null).length === 0);
const draws = k => { try { return spriteSheet('stain', k).length > 0; } catch { return false; } };
// Off water, goo or gravel onto bare floor, the blob leaves a print the way it went; nowhere else.
const wet = room(5, 1, { 1: 'water', 3: 'gravel' });
const tr = tracksOf(wet, { x: 0, y: 0 }, { x: 4, y: 0 });
check('Wee tracks water and gravel onto the bare floor after them', tr.length === 2 && tr[0].x === 2 && tr[0].key.startsWith('print|') && tr[0].key.endsWith('|right') && tr[1].x === 4 && tr[0].key !== tr[1].key, JSON.stringify(tr));
check('it leaves no print standing still, on plain floor, or from one pool tile to the next', tracksOf(wet, { x: 0, y: 0 }, { x: 0, y: 0 }).length === 0 && tracksOf(room(3, 1), { x: 0, y: 0 }, { x: 2, y: 0 }).length === 0 && tracksOf(room(3, 1, { 0: 'water', 1: 'water' }), { x: 0, y: 0 }, { x: 1, y: 0 }).length === 0);
check('the same mark on the same tile is kept once', keepStains(tr, tr).length === 2 && draws(tr[0].key));
// Every mark and every death has a drawing.
check('every mark a tick can leave has a drawing', SPRITES.includes('stain') && SPRITES.includes('blobDead') && [...left, ...['spring', 'spikes', 'laser', 'crush'].map(how => stainsOf([], room(3, 3), [], { how, dir: 'left', x: 0, y: 0 })[0])].every(s => draws(s.key)));
check('every death has a pose', ['spring|right', 'spring|up', 'spikes|', 'laser|', 'blast|', 'crush|', 'hit|'].every(k => spriteSheet('blobDead', k + '|#ab9df2').flat().some(Boolean)));

// The flinch (register 865): for a moment the blob sees it coming, then lies as its death left it.
check('Wee flinches first, then takes its death\'s pose', poseAt({ how: 'spikes', at: 1000 }, 1000 + FLINCH_MS - 1) === 'flinch' && poseAt({ how: 'spikes', at: 1000 }, 1000 + FLINCH_MS) === 'spikes' && poseAt({ how: 'crush' }, 5) === 'crush' && FLINCH_MS <= 150);
check('the flinch has a drawing', spriteSheet('blobDead', 'flinch||#ab9df2').flat().some(Boolean) && JSON.stringify(spriteSheet('blobDead', 'flinch||#ab9df2')) !== JSON.stringify(spriteSheet('blobDead', 'hit||#ab9df2')));
// The room keeps its marks, the newest STAIN_MAX of them.
const many = Array.from({ length: STAIN_MAX + 5 }, (_, i) => ({ x: i, y: 0, key: 'soot' }));
const kept = keepStains(many.slice(0, 3), many.slice(3));
check('a room keeps its marks up to a cap, dropping the oldest', STAIN_MAX === 60 && kept.length === STAIN_MAX && kept[0].x === 5 && kept[kept.length - 1].x === STAIN_MAX + 4 && keepStains([many[0]], []).length === 1);

// The shake: full by default, less when reduced, none when off; along the axis of a spring's throw.
const crush = [{ type: 'die', at: 1000, death: { how: 'spring', dir: 'right' } }], amp = v => { look.shake = v; return Math.max(...[1001, 1010, 1020, 1030, 1040].map(t => Math.abs(shakeOf(crush, t)[0]))); };
const full = amp(undefined), less = amp('reduced'), none = amp('off');
check('the shake is full by default, less when reduced, none when off', full >= 3 && less > 0 && less < full && none === 0, [full, less, none].join());
look.shake = undefined;
check('a spring\'s crush shakes along its throw only', [1001, 1020, 1050].every(t => shakeOf(crush, t)[1] === 0) && shakeOf([{ type: 'die', at: 1000, death: { how: 'spring', dir: 'up' } }], 1001)[0] === 0);
check('the shake moves by whole pixels and ends', [1001, 1033, 1077].every(t => shakeOf(crush, t).every(Number.isInteger)) && shakeOf(crush, 1300).join() === '0,0');
check('a quiet death does not shake the room', shakeOf([{ type: 'die', at: 1000, death: { how: 'spikes' } }], 1001).join() === '0,0' && shakeOf([{ type: 'blast', at: 1000 }], 1001).some(v => v !== 0));
// The album (register 856): every achievement has a drawn scene and a caption, each made of sprites that exist.
import { SCENES, sceneOf } from '../src/app/albumScenes.js';
import { caption } from '../src/app/voice.js';
import { achievements } from '../src/campaign/achievements.js';
const ids = achievements({}, new Set(), []).map(a => a.id);
check('every achievement has a photo and a caption', ids.length > 10 && ids.every(id => sceneOf(id) && caption(id)), ids.filter(id => !sceneOf(id) || !caption(id)).join());
check('every photo is made of the room\'s own sprites', Object.values(SCENES).flat().every(([n]) => SPRITES.includes(n)), Object.values(SCENES).flat().filter(([n]) => !SPRITES.includes(n)).map(x => x[0]).join());
done();
