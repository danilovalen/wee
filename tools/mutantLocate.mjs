// Where a mutant of tools/mutate.mjs lands, shared with the gate that keeps none stale (register 608).
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const walk = d => readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + '/' + e.name) : /\.js$/.test(e.name) ? [d + '/' + e.name] : []);
// 'src' as the file means: whichever source file holds the text, which must be exactly one. null: stale.
export const locate = (file, from) => {
  if (file !== 'src') return existsSync(file) && readFileSync(file, 'utf8').includes(from) ? file : null;
  const hits = walk('src').filter(f => readFileSync(f, 'utf8').includes(from));
  return hits.length === 1 ? hits[0] : null;
};
// The test file a mutant names: tests/<name>.test.mjs or tests/<name>.smoke.mjs.
export const testFile = name => ['test', 'smoke'].map(k => `tests/${name}.${k}.mjs`).find(f => existsSync(f)) || null;
