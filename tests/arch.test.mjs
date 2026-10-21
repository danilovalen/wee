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
  gen: ['rules', 'level', 'solve', 'gen'],
  campaign: ['rules', 'level', 'solve', 'campaign'],
  app: ['rules', 'level', 'solve', 'view', 'editor', 'gen', 'campaign', 'app'],
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
// Only the router opens or closes a place's page (register 359), so Back, Escape and reload agree.
const PAGE_CALL = /\$\('(menuBox|campBox|makerBox|puzzleBox|roomsBox)'\)\.(showModal|close)\(/;
const strays = files.filter(f => !f.endsWith('nav.js') && PAGE_CALL.test(readFileSync(f, 'utf8')));
check('no module but nav.js opens or closes a place\'s page', strays.length === 0, strays.join(' '));
// Words on screen are separated by commas, never a middle dot (register 260).
const dotted = [...files, 'index.html'].filter(f => /\u00b7|\\u00b7/.test(readFileSync(f, 'utf8')));
check('no middle dot in the source or the page', dotted.length === 0, dotted.join(' '));
// One sentence per message (register 310): "You are X. That thing Y." strings read machine-made.
{
  const code = files.filter(f => /^src\/(app|campaign|editor)\//.test(f)).map(f => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*\/\//.test(l)).map(l => l.replace(/\s\/\/ .*$/, '')).join('\n'));
  const literals = code.flatMap(c => [...c.matchAll(/'([^'\n]*)'|`([^`]*)`/g)].map(m => m[1] ?? m[2]));
  const html = readFileSync('index.html', 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
  const texts = [...literals, ...[...html.matchAll(/>([^<>]+)</g)].map(m => m[1]), ...[...html.matchAll(/(?:title|placeholder|aria-label)="([^"]+)"/g)].map(m => m[1])];
  const two = texts.filter(t => /[a-z0-9)]\. +[A-Z]/.test(t));
  check('no on-screen string holds two sentences', two.length === 0, two.join(' || '));
}

// The page is light only, so a browser's forced dark mode leaves it alone (register 285).
const page = readFileSync('index.html', 'utf8'), sheet = readFileSync('style.css', 'utf8');
check('the page declares itself light only', page.includes('<meta name="color-scheme" content="only light">') && /:root \{[^}]*color-scheme: only light;/.test(sheet));
check('the bundle holds every source file', files.every(f => built.includes(`// ---- ${f}`)), files.filter(f => !built.includes(`// ---- ${f}`)).join(' '));
done();
