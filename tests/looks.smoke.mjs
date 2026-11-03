// Looks (registers 612, 613, 638): palettes and one alternate skin per object, bought with stars. A palette
// recolours the page's tokens and everything drawn on a canvas; a skin swaps an object's sprite; the
// choice is kept; a look stays shut until the stars cover it, and buying it spends them.
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
  // A piece the campaign teaches opens in the Sandbox once placed in a level; one it never teaches is open (register 558).
  const kit = await p.evaluate(async () => { const k = await import('/src/app/known.js'); const before = k.known('box', ['box']); k.markUsed(['box']); const after = k.known('box', ['box']); return { before, after, other: k.known('wire', ['box']) }; });
  check('a campaign piece opens in the Sandbox only once used', !kit.before && kit.after && kit.other, JSON.stringify(kit));
  await p.evaluate(() => localStorage.removeItem('wee.pieces'));
  // The Sandbox offers every piece on a fresh save, nothing locked (register 649).
  const sand = await browser.newPage({ viewport: { width: 393, height: 852 } });
  await sand.addInitScript(() => { window.__noTutorial = true; });
  await sand.goto(`http://localhost:${PORT}/index.html`); await sand.waitForTimeout(600);
  await sand.click('#menuSandbox'); await sand.waitForTimeout(500); await sand.click('#roomNew'); await sand.waitForTimeout(300);
  const slots = await sand.$$eval('#strip .slot', ss => ss.filter(s => s.getBoundingClientRect().width > 0).map(s => s.dataset.slot));
  check('on a fresh save the Sandbox offers every group of pieces', slots.length === 7, slots.join());
  await sand.close();
  check('with no stars every other skin is shut', await p.$$eval('#lookSkins [data-alt=true]', bs => bs.length > 0 && bs.every(b => b.disabled)));

  // Stars open what they reach: one beaten level with two side goals is three stars.
  await p.evaluate(() => localStorage.setItem('wee.campaign', JSON.stringify({ v: 4, last: null, levels: { 1: { beaten: true, goals: { a: true, b: true } } } })));
  await p.reload(); await p.waitForTimeout(600);
  check('Looks has its own address, so a reload stays on it', await p.$eval('#lookBox', d => d.open));
  // Three stars from the level (beaten, two side goals) and one from the First berry achievement.
  check('the page counts the stars to spend, achievements included', (await p.textContent('#lookStars')).trim() === '4', await p.textContent('#lookStars'));
  const opened = await p.$$eval('#lookPalettes [data-palette]', bs => bs.filter(b => !b.disabled).map(b => b.dataset.palette));
  check('a palette can be bought once the stars cover its cost', opened.join() === PALETTES.filter(x => x.cost <= 4).map(x => x.id).join(), opened.join());
  const skinsOpen = await p.$$eval('#lookSkins [data-skin]', rs => rs.filter(r => !r.querySelector('[data-alt=true]').disabled).map(r => r.dataset.skin));
  check('a skin can be bought once the stars cover its cost', skinsOpen.join() === SKINS.filter(x => x.cost <= 4).map(x => x.id).join(), skinsOpen.join());
  check('each look you can buy wears a dot, one you own or cannot afford does not (register 640)', await p.$$eval('#lookPalettes [data-palette]', bs => bs.every(b => b.classList.contains('dot') === (!b.disabled && b.dataset.owned === 'false'))));

  // Buying spends (register 638): the Pocket palette costs its price, once, and is worn.
  const cost = PALETTES.find(x => x.id === 'gameboy').cost;
  await p.click('[data-palette=gameboy]'); await p.waitForTimeout(200);
  check('buying a palette spends its stars and wears it', (await p.textContent('#lookStars')).trim() === String(4 - cost) && await p.evaluate(() => document.documentElement.dataset.palette) === 'gameboy', await p.textContent('#lookStars'));
  await p.click('[data-palette=neon]'); await p.click('[data-palette=gameboy]'); await p.waitForTimeout(200);
  check('wearing it again costs nothing', (await p.textContent('#lookStars')).trim() === String(4 - cost));
  const dear = PALETTES.filter(x => x.cost > 4 - cost && x.cost <= 4).map(x => x.id);
  check('a look the stars covered before buying is shut once they no longer do', await p.$$eval('#lookPalettes [data-palette]', (bs, ids) => ids.every(id => bs.find(b => b.dataset.palette === id).disabled), dear), dear.join());

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

  check('the skin was bought with stars', (await p.textContent('#lookStars')).trim() === String(4 - cost - SKINS.find(x => x.id === 'hero').cost));
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
