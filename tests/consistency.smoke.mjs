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
  // Register 946: a number inside a filled star reads against the gold, at least 4.5 to 1.
  await at('#/levels');
  const read = await p.evaluate(() => { const s = document.createElement('span'); s.className = 'campStar main on'; s.innerHTML = '<i>12</i>'; document.getElementById('campList').append(s); const rgb = c => c.match(/[\d.]+/g).slice(0, 3).map(Number); const tmp = document.createElement('b'); tmp.style.color = getComputedStyle(s).getPropertyValue('--gold'); document.body.append(tmp); const fill = rgb(getComputedStyle(tmp).color), ink = rgb(getComputedStyle(s.querySelector('i')).color); tmp.remove(); s.remove(); const L = c => { const [r, g, b] = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }; const [a, b] = [L(fill), L(ink)].sort((x, y) => y - x); return (a + 0.05) / (b + 0.05); });
  check('a number in a filled star reads against its gold (register 946)', read >= 4.5, read.toFixed(2));
  // Playing a room: Undo and Reset are the level's icons (3).
  await at('?sandbox');
  check('playing a room, Undo and Reset are icons (3)', await p.evaluate(() => ['playUndo', 'respawnBtn'].every(id => !!document.getElementById(id).querySelector('svg'))));
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close(); server.close();
}
done();
