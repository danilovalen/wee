import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
import { emptyLevel, parseLevel } from '../src/level/format.js';
const OUT = process.argv[2];
const L = emptyLevel(10, 7);
const put = (x, y, c) => { L.cells[y * 10 + x] = c; };
for (let x = 0; x < 10; x++) { put(x, 0, 'wall'); put(x, 6, 'wall'); } for (let y = 0; y < 7; y++) { put(0, y, 'wall'); put(9, y, 'wall'); }
put(2, 1, 'gravel'); put(3, 1, 'gravel'); put(4, 1, 'water'); put(5, 1, 'water'); put(4, 2, 'water'); put(6, 1, 'sticky'); put(7, 1, 'death'); put(8, 1, 'death');
put(2, 2, 'crack'); put(3, 2, 'spring:right'); put(5, 2, 'gate:right'); put(6, 2, 'gate:up,down@blue'); put(7, 2, 'sensor:yellow'); put(8, 2, 'checkpoint');
put(2, 3, 'idoor:red'); put(3, 3, 'door:blue'); put(4, 3, 'toggle:green'); put(5, 3, 'button:yellow'); put(6, 3, 'goal');
L.start = { x: 1, y: 5 };
L.entities = [
  { kind: 'mover', x: 2, y: 4, axis: 'h', mode: 'input' }, { kind: 'enemy', x: 3, y: 4, axis: 'h', dir: 1, mode: 'input' },
  { kind: 'strong', x: 4, y: 4, axis: 'v', dir: 1, mode: 'input' }, { kind: 'bomb', x: 5, y: 4 }, { kind: 'heavy', x: 6, y: 4 },
  { kind: 'box', x: 7, y: 4 },
];
let lvl; try { lvl = parseLevel(JSON.stringify(L)); } catch (e) { console.log('parse', e.message); process.exit(1); }
const srv = await serve(4392);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
await p.addInitScript(() => { window.__noTutorial = true; });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto('http://localhost:4392/'); await p.waitForTimeout(600);
await p.click('#menuSandbox'); await p.waitForTimeout(400); await p.click('#roomNew'); await p.waitForTimeout(400);
await p.evaluate(l => window.wee.loadLevel(l), lvl); await p.waitForTimeout(600);
const box = await p.$eval('#game', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
await p.screenshot({ path: `${OUT}/pieces.png`, clip: box });
console.log(JSON.stringify(errs));
await b.close(); process.exit(0);
