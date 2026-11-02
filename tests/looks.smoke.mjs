// Looks (registers 612, 613): palettes and one alternate skin per object, opened by stars. A palette
// recolours the page's tokens and everything drawn on a canvas; a skin swaps an object's sprite; the
// choice is kept; a look stays shut until the campaign's stars reach its cost (or unlock-all is on).
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { PALETTES, SKINS } from '../src/view/look.js';

const { check, done } = suite('looks');
const PORT = 5275;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const hex = s => s.trim().toLowerCase();
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(800);
  await p.click('#menuLooks'); await p.waitForTimeout(300);
  check('the menu\'s corner opens Looks', await p.$eval('#lookBox', d => d.open));
  const shut = await p.$$eval('#lookPalettes [data-palette]', bs => bs.map(b => [b.dataset.palette, b.disabled]));
  check('with no stars only the first palette is open', shut.length === PALETTES.length && shut.every(([id, off]) => off === (id !== 'neon')), JSON.stringify(shut));
  check('with no stars every other skin is shut', await p.$$eval('#lookSkins [data-alt=true]', bs => bs.length > 0 && bs.every(b => b.disabled)));

  // Stars open what they reach: one beaten level with two side goals is three stars.
  await p.evaluate(() => localStorage.setItem('wee.campaign', JSON.stringify({ v: 4, last: null, levels: { 1: { beaten: true, goals: { a: true, b: true } } } })));
  await p.reload(); await p.waitForTimeout(600);
  check('Looks has its own address, so a reload stays on it', await p.$eval('#lookBox', d => d.open));
  check('the page counts the stars earned', (await p.textContent('#lookStars')).trim() === '3');
  const opened = await p.$$eval('#lookPalettes [data-palette]', bs => bs.filter(b => !b.disabled).map(b => b.dataset.palette));
  check('a palette opens once the stars reach its cost', opened.join() === PALETTES.filter(x => x.cost <= 3).map(x => x.id).join(), opened.join());
  const skinsOpen = await p.$$eval('#lookSkins [data-skin]', rs => rs.filter(r => !r.querySelector('[data-alt=true]').disabled).map(r => r.dataset.skin));
  check('a skin opens once the stars reach its cost', skinsOpen.join() === SKINS.filter(x => x.cost <= 3).map(x => x.id).join(), skinsOpen.join());

  // A palette recolours the page and the canvases.
  await p.click('[data-palette=gameboy]'); await p.waitForTimeout(200);
  const gb = PALETTES.find(x => x.id === 'gameboy').greys;
  const paper = hex(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper')));
  check('the Pocket palette recolours the page\'s tokens', gb.includes(paper), paper);
  const icon = await p.evaluate(() => { const c = document.querySelector('canvas[data-icon=wall]'); const d = c.getContext('2d').getImageData(c.width / 2, c.height / 2, 1, 1).data; return '#' + [...d].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''); });
  check('and the icons already on the page', gb.includes(icon), icon);
  const pic = await p.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 4; const g = c.getContext('2d'); g.fillStyle = '#ff6188'; g.fillRect(0, 0, 4, 4); return '#' + [...g.getImageData(1, 1, 1, 1).data].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join(''); });
  check('and anything drawn after it', gb.includes(pic), pic);

  // A skin swaps the object's sprite wherever it is drawn.
  await p.click('[data-skin=hero] [data-alt=true]'); await p.waitForTimeout(200);
  const same = await p.evaluate(async () => {
    const { drawSprite } = await import('/src/view/sprites.js');
    const draw = (name, exact) => { const c = document.createElement('canvas'); c.width = c.height = 32; drawSprite(c.getContext('2d'), name, 0, 0, { exact }); return c.toDataURL(); };
    return { asSkin: draw('blob', false) === draw('blobAlt', true), differs: draw('blob', true) !== draw('blobAlt', true) };
  });
  check('the hero\'s other skin is what the room draws for the blob', same.asSkin && same.differs, JSON.stringify(same));

  // Kept across a reload.
  await p.reload(); await p.waitForTimeout(600);
  check('the palette is kept', await p.evaluate(() => document.documentElement.dataset.palette) === 'gameboy');
  check('the skin is kept', await p.$eval('[data-skin=hero] [data-alt=true]', b => b.classList.contains('on')));
  // Back to the first palette: the tokens are the stylesheet's own again.
  await p.click('[data-palette=neon]'); await p.waitForTimeout(200);
  check('the first palette restores the neon tokens', hex(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--paper'))) === '#221f22');
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the looks smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
