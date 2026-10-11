// The Manga theme: style.css declares exactly the token table in docs/MANGA_THEME.md, the doc being
// the source, and the stylesheet keeps the form (no stroke on a control, four radii only).
import { readFileSync } from 'node:fs';
import { suite } from './suite.mjs';

const { check, done } = suite('manga');
const doc = readFileSync('docs/MANGA_THEME.md', 'utf8'), css = readFileSync('style.css', 'utf8');
const table = [...doc.matchAll(/^\| `(--[a-z-]+)` \| `([^`]+)` \|$/gm)].map(m => [m[1], m[2]]);
check('the doc holds a token table', table.length >= 20, String(table.length));
const root = (css.match(/^:root \{([^}]*)\}/m) || [])[1] || '';
const declared = Object.fromEntries([...root.matchAll(/(--[a-z-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const wrong = table.filter(([k, v]) => declared[k] !== v).map(([k, v]) => `${k}: ${declared[k]} (want ${v})`);
check('style.css declares every token with the doc\'s value', !wrong.length, wrong.join('; '));
const extra = Object.keys(declared).filter(k => !table.some(([t]) => t === k) && !/^--(bg|text|dim|line|radius|body|head)$/.test(k));
check('and nothing the doc does not list, besides the old names it maps', !extra.length, extra.join(' '));
// A solid stroke on anything is a border the form does not allow; state is an inset ring.
const strokes = [...css.matchAll(/[^{}]*\{[^}]*\bborder(?:-(?:top|bottom|left|right))?:\s*\d[^;]*solid[^}]*\}/g)].map(m => m[0].split('{')[0].trim());
check('no rule draws a solid border', !strokes.length, strokes.join(' | '));
const radii = new Set([...css.matchAll(/border-radius:\s*([^;]+);/g)].flatMap(m => m[1].split(/\s+/)).filter(r => !/^(var\(--r-[slm]\)|var\(--r-pill\)|50%|0|var\(--r-[slm]\)\s*var)/.test(r)));
check('every radius is one of the four, or a circle', !radii.size, [...radii].join(' '));
done();
