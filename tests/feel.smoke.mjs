// The good feels in the page (registers 646, 647): clicky buttons that keep their box, sound that the menu
// turns off and that plays each effect once, the wobble (on and off), star counts that count up, and the
// page wipe.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('feel');
const PORT = 5278;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(700);

  // The menu's walls are one mass, drawn as the room draws them: no seam between two side by side (register 648).
  const seam = await p.evaluate(async () => {
    const { MENU_MARGIN: m } = await import('/src/app/menuScene.js'), c = document.getElementById('menuRoom'), g = c.getContext('2d'), u = c.width / (6 + 2 * m);
    const px = (x, y) => [...g.getImageData(Math.round((m + x) * u), Math.round((m + y) * u), 1, 1).data].slice(0, 3);
    return { seam: px(1, 5.5), face: px(0.5, 5.5), floor: px(2.5, 2.5), old: document.querySelectorAll('.msWall, .msWalls').length };
  });
  check('the menu\'s walls join with no seam, like the room\'s', seam.old === 0 && seam.seam.join() === seam.face.join() && seam.face.join() !== seam.floor.join(), JSON.stringify(seam));
  // A pressed button: its lip moves to the top and its icon sinks, its box stays put.
  const press = await p.evaluate(() => {
    const b = document.getElementById('menuLooks'), r0 = b.getBoundingClientRect(), bg0 = getComputedStyle(b).backgroundPosition, i0 = getComputedStyle(b.firstElementChild).translate;
    b.classList.add('down');
    const r1 = b.getBoundingClientRect(), bg1 = getComputedStyle(b).backgroundPosition, i1 = getComputedStyle(b.firstElementChild).translate;
    b.classList.remove('down');
    return { same: r0.x === r1.x && r0.y === r1.y && r0.width === r1.width && r0.height === r1.height, lip: bg0 !== bg1, icon: i0 !== i1 && i1.includes('2px') };
  });
  check('a pressed button sinks into its lip and its icon drops, while its box keeps its place', press.same && press.lip && press.icon, JSON.stringify(press));

  // Sound: the speaker in the menu turns it off and back on, and the choice is kept.
  await p.click('#menuSound');
  check('the speaker turns sound off, and says so', await p.evaluate(() => localStorage.getItem('wee.sound')) === 'off' && await p.$eval('#menuSound', b => b.getAttribute('aria-pressed')) === 'false');
  await p.click('#menuSound');
  check('and back on', await p.evaluate(() => localStorage.getItem('wee.sound')) === 'on');
  const once = await p.evaluate(async () => {
    const m = await import('/src/app/sound.js'); let n = 0; const real = m.VOICES.place; m.VOICES.place = () => { n++; };
    const f = { type: 'place', x: 0, y: 0, at: 0 }; m.soundFx([f]); m.soundFx([f]); m.soundFx([{ ...f }]); m.VOICES.place = real; return n;
  });
  check('each effect sounds once, however often it is drawn', once === 2, String(once));

  // The wobble: a sprite drawn at different moments differs while it is on, and never when it is off.
  const boil = await p.evaluate(async () => {
    window.__boil = true;
    const { drawSprite } = await import('/src/view/sprites.js'), { setBoil } = await import('/src/view/look.js');
    const draw = () => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.scale(2, 2); drawSprite(g, 'blob', 0, 0); return c.toDataURL(); };
    const at = async () => { const seen = new Set(); for (let i = 0; i < 4; i++) { seen.add(draw()); await new Promise(r => setTimeout(r, 270)); } return seen.size; };
    const on = await at(); setBoil(false); const off = await at(); setBoil(true); window.__boil = false;
    return { on, off };
  });
  check('the blob wobbles while the wobble is on (register 647)', boil.on > 1, JSON.stringify(boil));
  check('and holds still when it is turned off', boil.off === 1, JSON.stringify(boil));

  // A star count counts up as Looks opens.
  await p.evaluate(() => localStorage.setItem('wee.campaign', JSON.stringify({ v: 4, last: null, levels: { 1: { beaten: true, goals: { a: true, b: true } } } })));
  await p.reload(); await p.waitForTimeout(600);
  await p.click('#menuLooks');
  const counts = []; for (let i = 0; i < 8; i++) { counts.push(+(await p.$eval('#lookStars', e => e.dataset.count || e.textContent))); await p.waitForTimeout(40); }
  check('the star count on Looks counts up to what you have', counts[0] < counts.at(-1) && counts.at(-1) >= 3, JSON.stringify(counts));
  check('Looks has its Sound and Wobble switches', await p.$eval('#feelSound', b => b.getAttribute('aria-pressed')) === 'true' && await p.$eval('#feelBoil', b => b.getAttribute('aria-pressed')) === 'true');

  // The wipe: a page change shows it over everything for a moment, then it is gone.
  await p.evaluate(() => { window.__wipe = true; });
  await p.click('#lookMenu');
  const during = await p.$eval('#wipe', w => w.matches(':popover-open'));
  await p.waitForTimeout(300);
  check('a page change dissolves through the wipe, which then goes', during && !(await p.$eval('#wipe', w => w.matches(':popover-open'))));
  check('the wipe takes no taps', await p.$eval('#wipe', w => getComputedStyle(w).pointerEvents) === 'none');
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) { check('the feel smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
