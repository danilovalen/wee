// The source tree keeps its shape: each folder imports only what its row allows, no file
// grows past the split point, and the single-file bundle builds without a cycle.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { suite } from './suite.mjs';
import { bundle } from '../tools/build-single.mjs';

const { check, done } = suite('arch');
const ALLOWED = {
  rules: ['rules'],
  level: ['rules', 'level'],
  solve: ['rules', 'level', 'solve'],
  view: ['rules', 'level', 'view'],
  editor: ['rules', 'level', 'solve', 'editor'],
  app: ['rules', 'level', 'solve', 'view', 'editor', 'app'],
};
const MAX_LINES = 300;
const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.js') ? [join(d, e.name)] : []);
const files = walk('src');
const folderOf = f => f.split('/')[1];

check('every source file sits in a known folder', files.every(f => ALLOWED[folderOf(f)]), files.filter(f => !ALLOWED[folderOf(f)]).join(' '));
const wrong = [], long = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/^import\s*\{[^}]*\}\s*from\s*'([^']+)';/gm)) {
    const to = normalize(join(dirname(f), m[1]));
    if (!(ALLOWED[folderOf(f)] || []).includes(folderOf(to))) wrong.push(`${f} -> ${to}`);
  }
  const n = src.split('\n').length;
  if (n > MAX_LINES) long.push(`${f}: ${n}`);
}
check('imports only go the allowed way', wrong.length === 0, wrong.join(', '));
check(`no source file is over ${MAX_LINES} lines`, long.length === 0, long.join(', '));
let built = '', err = '';
try { built = bundle(); } catch (e) { err = e.message; }
check('the bundle builds from the entry with no cycle and no missing export', !!built && !err, err);
check('the bundle holds every source file', files.every(f => built.includes(`// ---- ${f}`)), files.filter(f => !built.includes(`// ---- ${f}`)).join(' '));
done();
