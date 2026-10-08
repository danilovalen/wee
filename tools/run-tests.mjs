// Runs every tests/*.test.mjs and tests/*.smoke.mjs. A file that does not end on its
// own "N/M passed" line counts as red: a crash must never read as a pass.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const only = process.argv.find(a => a.startsWith('--only='))?.slice(7);
const files = readdirSync('tests').filter(f => /\.(test|smoke)\.mjs$/.test(f) && (!only || f.includes(only)));
let ok = 0, total = 0, red = 0;
for (const f of files) {
  const r = spawnSync('node', ['tests/' + f], { encoding: 'utf8' });
  const out = (r.stdout + r.stderr).trim();
  const m = out.split('\n').pop().match(/(\d+)\/(\d+) passed$/);
  if (!m || r.status !== 0 || m[1] !== m[2]) { red++; console.log(`RED ${f}\n${out}\n`); }
  if (m) { ok += +m[1]; total += +m[2]; }
}
console.log(`${files.length - red}/${files.length} files green, ${ok}/${total} passed`);
process.exit(red || files.length === 0 ? 1 : 0);
