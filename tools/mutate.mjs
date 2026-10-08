// Breaks one rule at a time and requires the suite to notice. A mutant counts as
// caught only when a check prints FAIL; a crash with no FAIL line is reported apart.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const M = [
  ['src/sim.js', "if (s.powers.boomerang) { p.dir = k;", "if (s.powers.boomerang) {", 'sim'],
  ['src/sim.js', "if (r === 'moved') { if (s.clock === 'tile') worldStep(s); return true; }", "if (r === 'moved') return true;", 'sim'],
  ['src/sim.js', "if (e.kind === 'enemy') kill(s, e, 'laser');", "if (false) kill(s, e, 'laser');", 'sim'],
  ['src/sim.js', "    e.x += dx; e.y += dy;\n  }\n  p.x = nx;", "  }\n  p.x = nx;", 'sim'],
  ['src/sim.js', "if (o.kind === 'enemy') kill(s, o, 'squash');", "if (false) kill(s, o, 'squash');", 'sim'],
  ['src/sim.js', "else { e.x = tx; e.y = ty; die(s); return; }", "else { e.dir = -e.dir; return; }", 'sim'],
  ['src/sim.js', "pressed[col] = (pressed[col] ?? true) && down;", "pressed[col] = (pressed[col] ?? false) || down;", 'sim'],
  ['src/sim.js', "if (s.player.air > 0) kill(s, e, 'jump'); else die(s);", "die(s);", 'sim'],
  ['src/sim.js', "if (s.tick % RT_PERIOD === RT_PERIOD - 1)", "if (false)", 'sim'],
  ['src/sim.js', "    s.checkpoint = { x: nx, y: ny };\n", "", 'sim'],
  ['src/sim.js', "for (const c of l.cells) if (!isCell(c)) throw new Error('Unknown tile: ' + c);", "", 'sim'],
  ['src/sim.js', "if (moved > 0 && s.clock === 'slide')", "if (s.clock === 'slide')", 'sim'],
  ['src/sim.js', "return !s.open[c.slice(5)];", "return false;", 'sim'],
  ['src/sim.js', "  if (playerAt(s, tx, ty)) die(s);\n}", "}", 'sim'],
  ['src/sim.js', "if (o.kind === 'box' && free(s, tx + dx, ty + dy)) { o.x += dx; o.y += dy; }", "if (false) {}", 'sim'],
  ['src/sim.js', "if (diving) { e.slide = d;", "if (false) { e.slide = d;", 'sim'],
  ['src/sim.js', "if (s.powers.cycle && !p.dir && p.air === 0) {", "if (!p.dir && p.air === 0) {", 'sim'],
  ['style.css', ".opt[hidden] { display: none; }", "", 'browser'],
  ['style.css', "grid-template-columns: 256px", "grid-template-columns: 200px", 'browser'],
  ['src/main.js', "a.download = 'room.wee';", "a.download = 'room.json';", 'browser'],
  ['src/main.js', "if (!ev.repeat) pending.push(k);", "", 'browser'],
  ['src/main.js', "if (t === 'erase') {\n    if (pi >= 0) removePiece(); else setCell('');", "if (t === 'erase') {", 'browser'],
  ['src/render.js', "drawPlayer(g, px, py, lift, scale);\n  g.restore();", "g.restore();", 'browser'],
];

let caught = 0, crashed = 0;
for (const [file, from, to, test] of M) {
  const orig = readFileSync(file, 'utf8');
  if (!orig.includes(from)) { console.log(`STALE mutant in ${file}: ${from.slice(0, 50)}`); process.exitCode = 1; continue; }
  writeFileSync(file, orig.replace(from, to));
  try {
    const r = spawnSync('node', [`tests/${test}.${test === 'sim' ? 'test' : 'smoke'}.mjs`], { encoding: 'utf8' });
    const out = r.stdout + r.stderr;
    const fail = out.split('\n').find(l => l.startsWith('FAIL'));
    if (fail) { caught++; console.log(`caught  ${fail.slice(0, 90)}`); }
    else if (r.status !== 0) { crashed++; console.log(`CRASHED ${file}: ${from.slice(0, 50)}`); }
    else console.log(`SURVIVED ${file}: ${from.slice(0, 60)}`);
  } finally { writeFileSync(file, orig); }
}
console.log(`mutants: ${caught}/${M.length} caught${crashed ? `, ${crashed} crashed` : ''}`);
process.exit(caught === M.length ? 0 : 1);
