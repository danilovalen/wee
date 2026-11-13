// One look for one thing across every page (register 938, docs/UI_CONSISTENCY_DIAGNOSIS.md).
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('consistency');
const server = await serve(5285);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const B = 'http://localhost:5285/';
try {
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; });
  const at = async h => { await p.goto(B + h); await p.waitForTimeout(900); };
  // Locked fades (1), on every page that has something locked.
  await at('#/looks');
  const looks = await p.evaluate(() => { const b = document.querySelector('#lookPalettes button:disabled'); return b && { name: +getComputedStyle(b.querySelector('b')).opacity, price: +getComputedStyle(b.querySelector('.lookCost')).opacity }; });
  check('a locked palette fades, its price does not', looks && looks.name < 0.6 && looks.price === 1, JSON.stringify(looks));
  check('the star count in the bar is not framed (2)', await p.evaluate(() => getComputedStyle(document.getElementById('lookStars')).boxShadow === 'none'));
  const width = async () => p.evaluate(() => { const d = [...document.querySelectorAll('dialog[open]')].pop(); const s = getComputedStyle(d); return Math.round(d.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)); });
  const widths = { looks: await width() };
  const labels = await p.evaluate(() => [...document.querySelectorAll('.looks h3')].map(h => getComputedStyle(h).font + getComputedStyle(h).color));
  await at('#/achievements');
  check('an achievement not yet earned fades on the same sheet', await p.evaluate(() => { const li = document.querySelector('.achList li:not(.done)'); return getComputedStyle(li).outlineStyle === 'none' && +getComputedStyle(li.firstElementChild).opacity < 0.6; }));
  widths.ach = await width();
  await at('#/levels'); widths.levels = await width();
  await at('#/rooms'); widths.rooms = await width();
  check('every page is one column wide on a wide window (6)', new Set(Object.values(widths)).size === 1 && widths.looks > 800, JSON.stringify(widths));
  const roomLabels = await p.evaluate(() => [...document.querySelectorAll('.rooms h3')].filter(h => h.checkVisibility()).map(h => getComputedStyle(h).font + getComputedStyle(h).color));
  check('a section label is the same on every page (9)', labels.length > 0 && roomLabels.length > 0 && new Set([...labels, ...roomLabels]).size === 1, [...new Set([...labels, ...roomLabels])].join(' | '));
  // A level: a confirming button is coloured, Cancel plain (10); the win card's stars have no coin (4).
  await at('#/level/1');
  await p.evaluate(() => document.getElementById('resetBox')?.showModal?.());
  const reset = await p.evaluate(() => { const y = document.getElementById('resetYes'), n = document.getElementById('resetNo'); return y && [getComputedStyle(y).backgroundColor, getComputedStyle(n).backgroundColor]; });
  check('a dialog\'s confirming button is coloured, Cancel is not (10)', reset && reset[0] !== reset[1], JSON.stringify(reset));
  check('a win card star wears no coin behind it (4)', await p.evaluate(() => { const s = document.createElement('span'); s.className = 'winStar'; document.querySelector('.winStars, body').append(s); const d = getComputedStyle(s, '::before').display; s.remove(); return d === 'none'; }));
  // Playing a room: Undo and Reset are the level's icons (3).
  await at('?sandbox');
  check('playing a room, Undo and Reset are icons (3)', await p.evaluate(() => ['playUndo', 'respawnBtn'].every(id => !!document.getElementById(id).querySelector('svg'))));
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close(); server.close();
}
done();
