// Everything is pixel art (register 621): no element or pseudo-element on the main screens has a rounded
// corner, and nothing drawn on any canvas uses an arc, an ellipse, a curve or a rounded rectangle.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('pixelart');
const PORT = 5277;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const ROUND = ['arc', 'arcTo', 'ellipse', 'roundRect', 'quadraticCurveTo', 'bezierCurveTo'];
// Elements (and their ::before, ::after) with a rounded corner, as "tag#id.class radius".
const rounded = page => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('body *')) for (const pseudo of [null, '::before', '::after']) {
    const c = getComputedStyle(el, pseudo);
    if (pseudo && c.content === 'none') continue;
    const r = c.borderTopLeftRadius;
    if (r && r !== '0px' && c.display !== 'none') out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${el.classList.length ? '.' + [...el.classList].join('.') : ''}${pseudo || ''} ${r}`);
  }
  return [...new Set(out)];
});
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(round => {
    window.__noTutorial = true; window.__openAll = true; window.__round = [];
    const proto = CanvasRenderingContext2D.prototype, path = Path2D.prototype;
    for (const k of round) for (const o of [proto, path]) if (o[k]) { const f = o[k]; o[k] = function (...a) { window.__round.push(k); return f.apply(this, a); }; }
  }, ROUND);
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(800);
  const pages = ['the menu', 'the level list', 'a level', 'Looks', 'the Sandbox editor'];
  const seen = {};
  seen['the menu'] = await rounded(p);
  // A pixel icon is squares only: no stroke from a place's line-icon style rounds or thickens it (register 643).
  const stroked = await p.$$eval('svg.glyph.px path', ps => ps.filter(e => getComputedStyle(e).stroke !== 'none').map(e => e.closest('[id]')?.id || '?'));
  check('no pixel icon on the menu is stroked', stroked.length === 0 && await p.$$eval('svg.glyph.px path', ps => ps.length > 0), stroked.join());

  await p.click('#menuCampaign'); await p.waitForTimeout(400); seen['the level list'] = await rounded(p);
  await p.click('.campRow[data-level="3"]'); await p.waitForTimeout(600); seen['a level'] = await rounded(p);
  const icons = await p.$$eval('canvas[data-icon]', cs => cs.filter(c => c.getBoundingClientRect().width).map(c => getComputedStyle(c).imageRendering));
  check('the drawn icons in a level scale without smoothing', icons.length > 0 && icons.every(r => r === 'pixelated'), icons.join());
  await p.evaluate(() => { location.hash = '#/looks'; }); await p.waitForTimeout(500); seen['Looks'] = await rounded(p);
  await p.evaluate(() => { location.hash = '#/'; }); await p.waitForTimeout(400);
  await p.click('#menuSandbox'); await p.waitForTimeout(400); await p.click('#roomNew'); await p.waitForTimeout(400);
  await p.click('#strip [data-slot="walls"]'); await p.waitForTimeout(200); seen['the Sandbox editor'] = await rounded(p);
  // The watch itself: a planted round element and a planted arc are both seen.
  const planted = await p.evaluate(() => { const d = document.createElement('div'); d.id = 'plant'; d.style.cssText = 'width:9px;height:9px;border-radius:50%'; document.body.append(d); document.createElement('canvas').getContext('2d').arc(1, 1, 1, 0, 1); return window.__round.includes('arc'); });
  check('the watch sees a planted arc', planted);
  check('the watch sees a planted round element', (await rounded(p)).some(r => r.startsWith('div#plant')));
  await p.evaluate(() => { document.getElementById('plant').remove(); window.__round.length = 0; });
  for (const name of pages) check(`nothing on ${name} has a rounded corner`, seen[name].length === 0, seen[name].slice(0, 6).join(', '));
  // Every piece and tile on one room, in the editor and in play, with lens marks on.
  await p.evaluate(() => {
    const l = window.wee.blank(8, 6), put = (x, y, c) => { l.cells[y * 8 + x] = c; };
    ['gravel', 'water', 'sticky', 'death', 'crack', 'spring:right', 'gate:right', 'sensor:yellow'].forEach((c, i) => put(i, 0, c));
    ['checkpoint', 'idoor:red', 'door:blue', 'toggle:green', 'button:yellow', 'goal', 'tri:ne', 'wall'].forEach((c, i) => put(i, 5, c));
    l.start = { x: 1, y: 2 };
    l.entities = [{ kind: 'mover', x: 3, y: 2, axis: 'h', mode: 'input' }, { kind: 'enemy', x: 4, y: 2, axis: 'h', dir: 1, mode: 'input' }, { kind: 'bomb', x: 5, y: 2 }, { kind: 'heavy', x: 6, y: 2 }, { kind: 'box', x: 3, y: 3 },
      { kind: 'turret', x: 5, y: 3, turret: { dirs: ['left', 'right'], mode: 'realtime' } }];
    l.powers.armored = true; l.wires = [{ w: 'teal', x: 2, y: 3 }, { w: 'teal', x: 2, y: 4 }];
    window.wee.loadLevel(l); window.__round.length = 0;
  });
  await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelectorAll('[data-lens]').forEach(b => b.click())); await p.waitForTimeout(300);
  await p.evaluate(() => { window.wee.setMode('play'); window.wee.press('right'); window.advanceTime(1500); window.wee.press('down'); window.advanceTime(1500); });
  await p.waitForTimeout(300);
  const drawn = await p.evaluate(() => [...new Set(window.__round)]);
  check('no canvas draws anything round (arcs, ellipses, curves, rounded rectangles)', drawn.length === 0, drawn.join());
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the pixel art smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
