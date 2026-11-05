// House copy rules, read off every string the game can show (register 743 and the copy book): never
// "does nothing" (say "doesn't do anything"), and no em dash. Comments are not copy and are skipped.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { suite } from './lib.mjs';

const { check, done } = suite('copy');
const files = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : []; });
const strings = text => [...text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map(m => m[2]);
const html = readFileSync('index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
const all = [...files('src').flatMap(f => strings(readFileSync(f, 'utf8')).map(s => [f, s])), ...html.split('\n').map(s => ['index.html', s])];
const bad = re => all.filter(([, s]) => re.test(s)).map(([f, s]) => `${f}: ${s.slice(0, 60)}`);
check('no string says "does nothing" or "do nothing" (register 743)', !bad(/\b(does|do) nothing\b/i).length, bad(/\b(does|do) nothing\b/i).join(' | '));
check('no string carries an em dash', !bad(/—/).length, bad(/—/).join(' | '));
check('the scan reads the game\'s strings', all.length > 500 && all.some(([, s]) => s.includes("doesn't do anything")), String(all.length));
done();
