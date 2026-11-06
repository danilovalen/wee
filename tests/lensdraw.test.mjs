// How the lenses draw (registers 741, 742, 751, 752): whole pixel cells with no see-through, numbers that never
// stack, an old answer drawn dashed and grey only up to its stopper, and a focused tile that narrows the lines.
import { drawLensMarks, touches } from '../src/view/lenses.js';
import { suite } from './lib.mjs';

const { check, done } = suite('lens-draw');
// A canvas that keeps every rectangle with the colour it was filled in.
function canvas() {
  const rects = [];
  const g = { fillStyle: '#000', strokeStyle: '#000', globalAlpha: 1, getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), save() {}, restore() {}, setTransform() {},
    fillRect(x, y, w, h) { rects.push({ x, y, w, h, c: g.fillStyle, a: g.globalAlpha }); },
    beginPath() { rects.smooth = true; }, stroke() { rects.smooth = true; }, fillText() { rects.text = true; } };
  return { g, rects };
}
const W = 8, at = (x, y) => y * W + x;
const plates = rects => rects.filter(r => r.c === '#19181a');

const a = canvas();
drawLensMarks(a.g, W, { lines: [at(1, 1), at(5, 1), at(5, 4)], moves: [{ a: at(1, 1), b: at(5, 1), n: 2 }], rings: [{ i: at(1, 1), use: 'optional' }], passing: [{ i: at(3, 1), use: 'unused' }], frames: new Set([at(2, 2)]), crosses: new Set([at(3, 3)]) });
check('every mark is whole rectangles on whole pixels, no smooth path, no text (registers 741, 742)', !a.rects.smooth && !a.rects.text && a.rects.every(r => Number.isInteger(r.x) && Number.isInteger(r.y)));
check('and nothing is see-through (register 742)', a.rects.every(r => r.a === 1 && !/rgba|hsla/.test(r.c)));
check('each move carries its number on a plate', plates(a.rects).length === 2);
check('a ring and a dot take the colour of how the wins use them', a.rects.some(r => r.c === '#fc9867') && a.rects.some(r => r.c === '#727072'));

// There and back along one row: the two numbers would sit on the same spot.
const b = canvas();
drawLensMarks(b.g, W, { lines: [at(1, 1), at(6, 1), at(1, 1)] });
const [p1, p2] = plates(b.rects);
check('two numbers on the same run never stack, and both stay on their arrow (register 751)', p1 && p2 && Math.abs(p1.x - p2.x) >= 16 && p1.y === p2.y, JSON.stringify([p1, p2]));

// An old answer an edit broke after its first move: only that move is drawn, dashed and grey.
const c = canvas();
drawLensMarks(c.g, W, { lines: [at(1, 1), at(5, 1), at(5, 4), at(1, 4)], cutAt: 1, stopper: at(6, 1) });
const grey = c.rects.filter(r => r.c === '#939293');
check('a broken old answer is drawn grey up to its stopper and no further (register 751)', grey.length > 0 && grey.every(r => r.y < 64) && plates(c.rects).length === 1, JSON.stringify(grey.slice(-2)));
const xs = [...new Set(grey.filter(r => r.y === grey[0].y).map(r => r.x))].sort((p, q) => p - q);
check('and dashed: its cells leave gaps', xs.some((x, k) => k && x - xs[k - 1] > 2), xs.join());
check('the tile that now stops it is crossed in red', c.rects.some(r => r.c === '#ff6188'));

// A focused tile: the move down passes it, the move along the bottom does not.
check('a run arrives at, leaves or crosses a tile, and only those touch it', touches(at(5, 1), at(5, 4), at(5, 2), W) && touches(at(5, 1), at(5, 4), at(5, 4), W) && !touches(at(5, 4), at(1, 4), at(5, 2), W) && !touches(at(5, 1), at(5, 2), at(5, 4), W) && touches(1, 2, null, W));
const d = canvas();
drawLensMarks(d.g, W, { lines: [at(1, 1), at(5, 1), at(5, 4), at(1, 4)], focus: at(5, 2) });
check('with a tile in focus, the moves that miss it fade and lose their numbers (register 752)', d.rects.some(r => r.c === '#403e41') && plates(d.rects).length === 1);
// A lone "1": its digit is the eight lit cells of its bitmap, no more.
const e = canvas();
drawLensMarks(e.g, W, { lines: [at(1, 1), at(1, 4)] });
// The plate's frame shares the digit's white (register 810): count the digit's cells, not the frame.
const lit = e.rects.filter(r => r.c === '#fcfcfa' && r.w < 8 && r.h < 8);
check('a number is lit exactly where its bitmap digit is (register 741)', lit.length === 8, String(lit.length));
done();
