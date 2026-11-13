// Nothing on a level's screen is pushed around (register 949): the bar, the tray and the room keep their
// places through a tool with a long hint (943), a Run that wins (948) and the marks it earns (944).
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { listed } from '../src/campaign/rules.js';

const { check, done } = suite('static');
const server = await serve(5287);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const HINTED = LEVELS.filter(listed).find(l => l.palette.toggle && l.palette.block);
const WIN = ['P.#.#', '.....', '.###.', '.#...', '.#..G'];
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; });
  await p.goto(`http://localhost:5287/#/level/${HINTED.id}`); await p.waitForTimeout(1200);
  const rects = () => p.evaluate(() => Object.fromEntries(['mode', 'campBack', 'campLast', 'tools', 'game', 'campBrief', 'campRun'].map(id => {
    const e = document.getElementById(id), r = e && e.getBoundingClientRect();
    return [id, r ? [r.x, r.y, r.width, r.height].map(Math.round).join() : null];
  })));
  const moved = (a, b, ids) => ids.filter(id => a[id] !== b[id]).map(id => `${id}: ${a[id]} -> ${b[id]}`);
  const tap = t => p.evaluate(t => document.querySelector(`[data-tool="${t}"]`).click(), t);
  await tap('wall'); await p.waitForTimeout(150);
  const plain = await rects();
  await tap('toggle'); await p.waitForTimeout(150);
  const hinted = await rects();
  const tray = moved(plain, hinted, ['tools', 'game', 'campBrief']);
  check('a tool with a long hint moves nothing (register 943)', !tray.length, tray.join(' | '));
  await p.goto(`http://localhost:5287/#/level/${LEVELS.filter(listed)[0].id}`); await p.waitForTimeout(1200);
  await p.evaluate(rows => {
    const l = window.wee.blank(rows[0].length, rows.length); l.start = null;
    rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === '#') l.cells[y * l.w + x] = 'wall'; if (c === 'G') l.cells[y * l.w + x] = 'goal'; if (c === 'P') l.start = { x, y }; }));
    window.wee.loadLevel(l);
  }, WIN);
  await p.waitForTimeout(300);
  await p.click('#campTest'); await p.waitForTimeout(300);
  const testing = await rects();
  await p.click('#mode'); await p.waitForTimeout(300);
  await p.click('#campRun');
  await p.waitForTimeout(300);
  const playing = await rects();
  await p.waitForFunction(() => !window.wee.demoRunning(), null, { timeout: 20000 });
  await p.waitForTimeout(60);
  const after = await rects();
  const bar = moved(testing, playing, ['mode', 'campBack']).concat(moved(testing, after, ['mode', 'campBack']));
  check('a Run and its win move nothing in the bar (register 948)', !bar.length, bar.join(' | '));
  check('the win shows its star count in the bar', await p.evaluate(() => !!document.querySelector('#campLast .glyph')), await p.evaluate(() => document.getElementById('campLast').outerHTML + ' ' + document.getElementById('campVerdictText')?.textContent));
  // Only marks the Run just earned land, and a redraw does not land them again (register 944).
  const fresh = await p.evaluate(() => ({ unmet: document.querySelectorAll('#campBrief li.unmet.fresh').length, met: document.querySelectorAll('#campBrief li.met.fresh').length }));
  check('only marks the Run just earned land (register 944)', fresh.unmet === 0 && fresh.met > 0, JSON.stringify(fresh));
  await p.evaluate(async () => (await import('/src/app/goalCard.js')).syncBrief());
  check('a redraw lands nothing again (register 944)', await p.evaluate(() => document.querySelectorAll('#campBrief .fresh').length === 0));
  // A failed Run's line sits in the band above the tray (register 941): over no goal, no button and no room.
  await p.goto(`http://localhost:5287/#/level/${HINTED.id}`); await p.waitForTimeout(1200);
  await p.click('#campRun'); await p.waitForTimeout(2500);
  const band = await p.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(), v = r('campVerdict'), off = (a, b) => a.bottom <= b.top + 1 || a.top >= b.bottom - 1; return { shown: !document.getElementById('campVerdict').hidden, clear: ['campBrief', 'campActions', 'tools', 'roomWrap'].every(id => off(v, r(id))) }; });
  check('a failed Run\'s line covers no goal, button or room (register 941)', band.shown && band.clear, JSON.stringify(band));
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close(); server.close();
}
done();
