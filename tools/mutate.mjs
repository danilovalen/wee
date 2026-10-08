// Breaks one rule at a time and requires the suite to notice. A mutant counts as
// caught only when a check prints FAIL; a crash with no FAIL line is reported apart.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const M = [
  // rules
  ['src/sim.js', "if (s.powers.boomerang) { p.dir = k;", "if (s.powers.boomerang) {", 'sim'],
  ['src/sim.js', "if (r === 'moved') { if (s.clock === 'tile') worldStep(s, d); return true; }", "if (r === 'moved') return true;", 'sim'],
  ['src/sim.js', "if (o.kind === 'enemy') { kill(s, o, how); return true; }", "if (false) { kill(s, o, how); return true; }", 'sim'],
  ['src/sim.js', "if (o.kind === 'enemy') { kill(s, o, how); return true; }", "if (ENEMY.includes(o.kind)) { kill(s, o, how); return true; }", 'sim'],
  ['src/sim.js', "} else if (e.kind === 'box' && (b = pushTo(s, nx, ny, t.d))) land(s, e, b);", "} else if (false) {}", 'sim'],
  ['src/sim.js', "if (e.kind === 'heavy' && ENEMY.includes(o.kind)) kill(s, o, 'squash');", "if (false) kill(s, o, 'squash');", 'sim'],
  ['src/sim.js', "if (e.kind === 'heavy' && ENEMY.includes(o.kind)) kill(s, o, 'squash');", "if (e.kind === 'heavy' && o.kind === 'enemy') kill(s, o, 'squash');", 'sim'],
  ['src/sim.js', "else { e.x = t.x; e.y = t.y; die(s); return; }", "else { e.dir = -e.dir; return; }", 'sim'],
  ['src/sim.js', "pressed[col] = (pressed[col] ?? true) && down;", "pressed[col] = (pressed[col] ?? false) || down;", 'sim'],
  ['src/sim.js', "const playerAt = (s, x, y) => !s.player.hidden && s.player.x === x", "const playerAt = (s, x, y) => s.player.x === x", 'sim'],
  ['src/sim.js', "if (++p.hideTicks < HIDE_TICKS || s.entities.some(e => !e.dead && e.rush)) return;", "if (++p.hideTicks < HIDE_TICKS) return;", 'sim'],
  ['src/sim.js', "crushes(s, e)) || solidCell(s, p.x, p.y)) {", "crushes(s, e))) {", 'sim'],
  ['src/sim.js', "if (s.entities.some(e => !e.dead && e.x === p.x && e.y === p.y && crushes(s, e)) || solidCell", "if (solidCell", 'sim'],
  ['src/sim.js', "if (!DIRS[k] || p.hidden) return;", "if (!DIRS[k]) return;", 'sim'],
  ['src/sim.js', "if (s.powers.cycle && !p.dir && !p.hidden) {", "if (s.powers.cycle && !p.dir) {", 'sim'],
  ['src/sim.js', "if (cellAt(s, x, y).startsWith('sensor:') && !entAt(s, x, y) && !playerAt(s, x, y)) s.lit.add(y * s.w + x);", "if (cellAt(s, x, y).startsWith('sensor:') && !playerAt(s, x, y)) s.lit.add(y * s.w + x);", 'sim'],
  ['src/sim.js', "if (cellAt(s, x, y).startsWith('sensor:') && !entAt(s, x, y) && !playerAt(s, x, y)) s.lit.add(y * s.w + x);", "", 'sim'],
  ['src/sim.js', "else if (c.startsWith('sensor:')) { col = c.slice(7); down = s.lit.has(i); }", "", 'sim'],
  ['src/sim.js', "else if (c.startsWith('sensor:')) { col = c.slice(7); down = s.lit.has(i); }", "else if (c.startsWith('sensor:')) { col = c.slice(7); down = true; }", 'sim'],
  ['src/sim.js', "if (c.startsWith('sensor:')) return COLOURS.includes(c.slice(7));", "", 'sim'],
  ['src/sim.js', "if (s.tick % RT_PERIOD === RT_PERIOD - 1)", "if (false)", 'sim'],
  ['src/sim.js', "    s.checkpoint = { x: nx, y: ny };\n", "", 'sim'],
  ['src/sim.js', "for (const c of l.cells) if (!isCell(c)) throw new Error('Unknown tile: ' + c);", "", 'sim'],
  ['src/sim.js', "if (moved > 0 && s.clock === 'slide')", "if (s.clock === 'slide')", 'sim'],
  ['src/sim.js', "return !s.open[c.slice(5)];", "return false;", 'sim'],
  ['src/sim.js', "  if (playerAt(s, t.x, t.y)) die(s);\n}", "}", 'sim'],
  ['src/sim.js', "if (o.kind === 'box' && (b = pushTo(s, t.x, t.y, t.d))) land(s, o, b);", "if (false) {}", 'sim'],
  ['src/sim.js', "if (diving) { e.slide = t.d;", "if (false) { e.slide = t.d;", 'sim'],
  ['src/sim.js', "if (s.powers.cycle && !p.dir && !p.hidden) {", "if (!p.dir && !p.hidden) {", 'sim'],
  ['src/sim.js', "if (e.kind === 'enemy' && diving) kill(s, e, 'dive');", "if (false) kill(s, e, 'dive');", 'sim'],
  ['src/sim.js', "if (e.kind === 'enemy' && diving) kill(s, e, 'dive');", "if (ENEMY.includes(e.kind) && diving) kill(s, e, 'dive');", 'sim'],
  ['src/sim.js', "dirs: CLOCKWISE.filter(d => e.turret.dirs.includes(d))", "dirs: e.turret.dirs", 'sim'],
  ['src/sim.js', "|| new Set(t.dirs).size !== t.dirs.length)", ")", 'sim'],
  ['src/sim.js', "else if (e.mode === 'follow') moveMover(s, e, d);", "else if (e.mode === 'follow') moveMover(s, e);", 'sim'],
  ['src/sim.js', "if (moved > 0 && s.clock === 'slide') worldStep(s, d);", "if (moved > 0 && s.clock === 'slide') worldStep(s, 'up');", 'sim'],
  ['src/sim.js', "if (!turned) moveMover(s, e, null, true);", "", 'sim'],
  ['src/sim.js', "const blocked = () => { if (d) return;", "const blocked = () => {", 'sim'],
  ['src/sim.js', "if (tri && !openFaces(tri).includes(ENTRY_FACE[d])) return null;", "", 'sim'],
  ['src/sim.js', "  if (p.dir) p.dir = t.d;\n", "", 'sim'],
  ['src/sim.js', "e.x = t.x; e.y = t.y; e.slide = t.d;", "e.x = t.x; e.y = t.y;", 'sim'],
  ['src/sim.js', "if (e.x === x && e.y === y) e.rush = false;", "e.rush = false;", 'sim'],
  ['src/sim.js', "if (!e.dead && e.mode === 'input' && MOVES.includes(e.kind)) e.rush = true;", "", 'sim'],
  ['src/sim.js', "if (c.startsWith('tri:')) return CORNERS.includes(c.slice(4));", "if (c.startsWith('tri:')) return true;", 'sim'],
  ['src/sim.js', "return here && !openFaces(here).includes(EXIT_FACE[d]) ? turn(here, d) : d;", "return d;", 'sim'],
  ['src/sim.js', "const aimOf = t => t.dirs[t.aim % t.dirs.length];", "const aimOf = t => t.dirs[0];", 'sim'],
  ['src/sim.js', "  turnTurrets(s, 'input');\n  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === 'follow'", "  for (const e of s.entities) if (!e.dead && e.turret && e.turret.mode === 'follow'", 'sim'],
  ['src/sim.js', "    turnTurrets(s, 'realtime');\n", "", 'sim'],
  ['src/sim.js', "e.turret.mode === 'follow' && e.turret.dirs.includes(d)) e.turret.aim = e.turret.dirs.indexOf(d);", "e.turret.mode === 'follow') e.turret.aim = Math.max(0, e.turret.dirs.indexOf(d));", 'sim'],
  ['src/sim.js', "  computeBeams(s, true);\n", "", 'sim'],
  ['src/sim.js', "if (harm && hitYou) die(s);", "", 'sim'],
  ['src/sim.js', "if (r.stop && inb(s, ...r.stop) && cellAt(s, ...r.stop).startsWith('receiver:')) s.lit.add(r.stop[1] * s.w + r.stop[0]);", "", 'sim'],
  ['src/sim.js', "else if (c.startsWith('receiver:')) { col = c.slice(9); down = s.lit.has(i); }", "else if (c.startsWith('receiver:')) { col = c.slice(9); down = true; }", 'sim'],
  ['src/sim.js', "if (c === 'wall' || c.startsWith('receiver:') || c.startsWith('spring:')) return true;", "if (c === 'wall' || c.startsWith('spring:')) return true;", 'sim'],
  ['src/sim.js', "if (c.startsWith('receiver:')) return COLOURS.includes(c.slice(9));", "if (c.startsWith('receiver:')) return true;", 'sim'],
  ['src/main.js', "  if (ui.tool === 'look') { $('placeHint').textContent = describe(c.x, c.y); return; }\n", "", 'browser'],
  ['src/main.js', "  if (m === 'edit') { ui.tool = 'look'; syncPanel(); }\n", "", 'browser'],
  ['src/sim.js', "if ((from && !from.includes(d)) || (to && !to.includes(d))) return null;", "if (to && !to.includes(d)) return null;", 'sim'],
  ['src/sim.js', "if ((from && !from.includes(d)) || (to && !to.includes(d))) return null;", "if (from && !from.includes(d)) return null;", 'sim'],
  ['src/sim.js', "return ds.length > 0 && new Set(ds).size === ds.length && ds.every(d => CLOCKWISE.includes(d));", "return true;", 'sim'],
  ['src/main.js', "removePiece(); setCell('gate:' + CLOCKWISE.filter(d => ui.pass.includes(d)).join(','));", "removePiece(); setCell('gate:right');", 'browser'],
  ['src/main.js', "b.disabled = on && ui.pass.length === 1;", "b.disabled = false;", 'browser'],
  ['src/sim.js', "if (cellAt(s, nx, ny) === 'death') return { x: nx, y: ny, d, death: true };", "", 'sim'],
  ['src/sim.js', "  if (t.death) { die(s); return 'died'; }\n", "", 'sim'],
  ['src/sim.js', "  if (t.death) { kill(s, e, 'death'); return false; }\n", "", 'sim'],
  ['src/sim.js', "  if (t.death) { kill(s, e, 'death'); return; }\n  const o = entAt(s, t.x, t.y, e);\n  let b;", "  const o = entAt(s, t.x, t.y, e);\n  let b;", 'sim'],
  ['src/sim.js', "  if (t.death) { kill(s, e, 'death'); return; }\n  const o = entAt(s, t.x, t.y, e);\n  if (o) {\n    if (e.kind === 'heavy'", "  const o = entAt(s, t.x, t.y, e);\n  if (o) {\n    if (e.kind === 'heavy'", 'sim'],
  ['src/sim.js', "if (!t || t.death) { cd = facing", "if (!t) { cd = facing", 'sim'],
  ['src/sim.js', "  fireSprings(s);\n", "", 'sim'],
  ['src/sim.js', "if (playerAt(s, x, y) && p.dir !== d && stepTo(s, x, y, d)) {", "if (playerAt(s, x, y) && p.dir !== d) {", 'sim'],
  ['src/sim.js', "if (e && e.kind !== 'turret' && e.slide !== d && stepTo(s, x, y, d)) {", "if (false) {", 'sim'],
  ['src/sim.js', "if (c === 'wall' || c.startsWith('receiver:') || c.startsWith('spring:')) return true;", "if (c === 'wall' || c.startsWith('receiver:')) return true;", 'sim'],
  ['src/main.js', "removePiece(); setCell(t === 'death' ? 'death' : 'spring:' + ui.face);", "removePiece(); setCell(t === 'death' ? 'death' : 'spring:up');", 'browser'],
  // page
  ['src/main.js', "if (host && (CARRIES_TURRET.includes(host.kind) || host.kind === 'turret')) {", "if (false) {", 'browser'],
  ['src/main.js', "b.disabled = on && ui.aim.length === 1;", "b.disabled = false;", 'browser'],
  ['src/main.js', "if (ui.mode === 'follow') $('axisOpt').hidden = true;", "", 'browser'],
  ['src/main.js', "painting = ev.button === 2 ? 'erase' : holds(c.x, c.y, ui.tool) && ui.tool !== 'start' ? 'remove' : 'place';", "painting = ev.button === 2 ? 'erase' : 'place';", 'browser'],
  ['src/main.js', "if (ui.tool === 'turret' && host && host.kind !== 'turret') { gone.piece = { ...host }; delete host.turret; }", "if (false) {}", 'browser'],
  ['src/main.js', "  if (how === 'remove' && !holds(x, y, ui.tool)) return;\n", "", 'browser'],
  ['src/main.js', "removePiece(); setCell('tri:' + ui.corner);", "removePiece(); setCell('tri:se');", 'browser'],
  ['src/main.js', "if (d !== swipe.last) pending.push(d);", "", 'phone'],
  ['src/main.js', "if (painting && c && ui.tool !== 'start') place(c.x, c.y, painting);", "if (painting && hover && ui.tool !== 'start') place(hover.x, hover.y, painting);", 'phone'],
  ['src/main.js', "$('hideBtn').onclick = () => pending.push('hide');", "", 'phone'],
  ['src/main.js', "const l = portrait() ? emptyLevel(12, 14) : emptyLevel(20, 12);", "const l = emptyLevel(20, 12);", 'phone'],
  ['src/main.js', "const zoom = Math.min(2.5, stage / (level.w * T), room / (level.h * T));", "const zoom = Math.max(1, Math.min(2.5, stage / (level.w * T), room / (level.h * T)));", 'phone'],
  ['src/main.js', "  for (const k of pending) keylog.push({ t: game.tick, k });\n", "", 'phone'],
  ['src/main.js', "played = JSON.parse(JSON.stringify(level)); keylog = [];", "played = level; keylog = [];", 'phone'],
  ['style.css', ".opt[hidden] { display: none; }", "", 'browser'],
  ['style.css', "grid-template-columns: 256px", "grid-template-columns: 200px", 'browser'],
  ['src/main.js', "a.download = 'room.wee';", "a.download = 'room.json';", 'browser'],
  ['src/main.js', "if (!ev.repeat) pending.push(k);", "", 'browser'],
  ['src/main.js', "if (t === 'erase') {\n    if (pi >= 0) removePiece(); else setCell('');", "if (t === 'erase') {", 'browser'],
  ['src/sim.js', "const crushes = (s, e) => e.kind === 'heavy' || e.kind === 'strong' || !s.powers.armored;", "const crushes = (s, e) => true;", 'sim'],
  ['src/sim.js', "const crushes = (s, e) => e.kind === 'heavy' || e.kind === 'strong' || !s.powers.armored;", "const crushes = (s, e) => e.kind === 'heavy' || !s.powers.armored;", 'sim'],
  ['src/sim.js', "const crushes = (s, e) => e.kind === 'heavy' || e.kind === 'strong' || !s.powers.armored;", "const crushes = (s, e) => e.kind === 'strong' || !s.powers.armored;", 'sim'],
  ['src/sim.js', "const HOLDS_DOOR = ['strong', 'heavy', 'mover'];", "const HOLDS_DOOR = ['heavy', 'mover'];", 'sim'],
  ['src/sim.js', "const HOLDS_DOOR = ['strong', 'heavy', 'mover'];", "const HOLDS_DOOR = ['strong', 'heavy', 'mover', 'box', 'enemy'];", 'sim'],
  ['src/sim.js', "|| (youIn(d) && s.powers.armored))) continue;", ")) continue;", 'sim'],
  ['src/sim.js', "for (const e of inside(d)) kill(s, e, 'door');", "", 'sim'],
  ['src/sim.js', "if (youIn(d) && !s.player.hidden) squashed = true;", "", 'sim'],
  ['src/sim.js', "if (!crushes(s, e)) return 'blocked'; die(s); return 'died';", "die(s); return 'died';", 'sim'],
  ['src/sim.js', "      if (!crushes(s, e)) { blocked(); return; }\n      e.x = t.x;", "      e.x = t.x;", 'sim'],
  ['src/sim.js', "    else if (!crushes(s, e)) { blocked(); return; }\n", "", 'sim'],
  ['src/sim.js', "(!crushes(s, e) || (e.kind !== 'heavy'", "((e.kind !== 'heavy'", 'sim'],
  ['src/sim.js', "e.x === p.x && e.y === p.y && crushes(s, e))", "e.x === p.x && e.y === p.y)", 'sim'],
  ['src/render.js', "drawPlayer(g, px, py, p.hidden, scale, 1, s.powers.armored);", "drawPlayer(g, px, py, p.hidden, scale, 1);", 'browser'],
  ['src/main.js', "tool === 'receiver' || tool === 'sensor' || tool === 'gate') return", "tool === 'receiver' || tool === 'gate') return", 'browser'],
  ['src/render.js', "drawPlayer(g, px, py, p.hidden, scale, 1, s.powers.armored);\n  g.restore();", "g.restore();", 'browser'],
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
