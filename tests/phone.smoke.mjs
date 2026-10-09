// A phone held upright: the room fits the width, nothing scrolls sideways, every
// control is big enough for a thumb, a tap places and a swipe slides.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('phone');
const PORT = 5197;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
mkdirSync('shots', { recursive: true });

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.wee);
  const text = async () => JSON.parse(await page.evaluate(() => window.renderGameToText()));
  // A tool sits in one tab of the palette: open its tab, then pick it.
  const pick = async t => { const tab = page.locator(`[data-group=${await page.getAttribute(`[data-tool=${t}]`, 'data-in')}]`); if (await tab.isVisible()) await tab.click(); await page.click(`[data-tool=${t}]`); };
  const lv = (await text()).level;
  check('a new room is taller than wide', lv.h > lv.w, `${lv.w}x${lv.h}`);

  const layout = await page.evaluate(() => {
    const c = document.getElementById('game').getBoundingClientRect(), st = document.getElementById('stage');
    const pad = parseFloat(getComputedStyle(st).paddingLeft) + parseFloat(getComputedStyle(st).paddingRight);
    return { scroll: document.documentElement.scrollWidth, width: innerWidth, room: c.width, stage: st.clientWidth - pad, tile: c.width / window.wee.getLevel().w };
  });
  check('nothing scrolls sideways', layout.scroll <= layout.width, JSON.stringify(layout));
  check('the room fits inside its area', layout.room <= layout.stage + 0.5, JSON.stringify(layout));
  check('a tile is big enough to tap', layout.tile >= 28, layout.tile.toFixed(1));
  // every tool, picked from its tab, fits with its options under the room on one screen
  const over = [];
  for (const [t, g] of await page.$$eval('[data-tool]', bs => bs.map(b => [b.dataset.tool, b.dataset.in]))) {
    await page.click(`[data-group=${g}]`); await page.click(`[data-tool=${t}]`);
    const bottom = await page.evaluate(() => Math.max(...[...document.querySelectorAll('#tools button, #tools .opt')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect().bottom)));
    if (bottom > 844) over.push(`${t}:${Math.round(bottom)}`);
  }
  check('the room, a tab of tools and its options fit on one screen, for every tool', over.length === 0, over.join(' '));
  check('a tab shows only its own tools', await page.evaluate(() => [...document.querySelectorAll('#palette button')].filter(b => b.offsetParent).length <= 6));
  await pick('look');

  const small = await page.evaluate(() => [...document.querySelectorAll('header button, #palette button, .opt:not([hidden]) button')]
    .filter(b => b.offsetParent).map(b => [b.textContent.trim() || b.title, b.getBoundingClientRect().height]).filter(([, h]) => h < 40));
  check('every control is thumb-sized', small.length === 0, JSON.stringify(small));

  const box = await page.locator('#game').boundingBox();
  const at = (x, y) => ({ x: box.x + (x + 0.5) * box.width / lv.w, y: box.y + (y + 0.5) * box.height / lv.h });
  let p = at(5, 6);
  await page.touchscreen.tap(p.x, p.y);
  check('with Look, a tap changes nothing', (await text()).level.cells[6 * lv.w + 5] === '');
  await pick('wall');
  await page.touchscreen.tap(p.x, p.y);
  check('a tap places a block', (await text()).level.cells[6 * lv.w + 5] === 'wall');
  // a finger dragged across a row places on every tile, then a drag from one removes them
  const cdp = await page.context().newCDPSession(page);
  const finger = async (type, pt) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pt ? [{ x: pt.x, y: pt.y }] : [] });
  const drag = async (from, to) => {
    await finger('touchStart', from);
    for (let i = 1; i <= 8; i++) await finger('touchMove', { x: from.x + (to.x - from.x) * i / 8, y: from.y + (to.y - from.y) * i / 8 });
    await finger('touchEnd');
  };
  await drag(at(2, 9), at(8, 9));
  let row = (await text()).level.cells.slice(9 * lv.w + 2, 9 * lv.w + 9);
  check('a finger drag places on every tile it crosses', row.every(c => c === 'wall'), row.join(','));
  await drag(at(2, 9), at(8, 9));
  row = (await text()).level.cells.slice(9 * lv.w + 2, 9 * lv.w + 9);
  check('a finger drag from a block removes them all', row.every(c => c === ''), row.join(','));
  await page.screenshot({ path: 'shots/phone-edit.png' });

  await pick('water');
  await page.click('#mode');
  await page.evaluate(() => { window.__manualClock = true; });
  check('the play buttons show in play', await page.locator('#hideBtn').isVisible());
  // a swipe right: the player starts at (1,1) and slides to the wall
  const s0 = at(3, 3), s1 = at(6, 3);
  await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.mouse.move(s1.x, s1.y, { steps: 6 }); await page.mouse.up();
  await page.evaluate(() => window.advanceTime(1200));
  let s = await text();
  check('a swipe slides the player', s.player.x === lv.w - 2 && s.player.y === 1, JSON.stringify(s.player));
  await page.click('#respawnBtn');
  await page.evaluate(() => window.advanceTime(60));
  s = await text();
  check('the Reset button sends you back', s.player.x === 1 && s.player.y === 1, JSON.stringify(s.player));
  await page.click('#hideBtn');
  await page.evaluate(() => window.advanceTime(60));
  check('the hide button hides', (await text()).player.hidden);
  // the tap button names only what the tap does with the powers that are on
  const tapBtn = async () => page.evaluate(() => { const b = document.getElementById('hideBtn'); return b.offsetParent ? b.textContent : null; });
  check('with Cycle alone it says Hide', await tapBtn() === 'Hide', String(await tapBtn()));
  await page.locator('[data-power=swim]').setChecked(true);
  check('with Swim too it says Hide / Swim', await tapBtn() === 'Hide / Swim', String(await tapBtn()));
  await page.locator('[data-power=cycle]').setChecked(false);
  check('with Swim alone it says Swim', await tapBtn() === 'Swim', String(await tapBtn()));
  await page.locator('[data-power=swim]').setChecked(false);
  check('with neither it is gone', await tapBtn() === null, String(await tapBtn()));
  await page.locator('[data-power=cycle]').setChecked(true);
  // a report replays to exactly the state the run ended in, including a power turned off mid-run
  await page.locator('[data-power=boomerang]').setChecked(false);
  await page.mouse.move(s0.x, s0.y); await page.mouse.down(); await page.mouse.move(s0.x, s0.y + 80, { steps: 6 }); await page.mouse.up();
  await page.evaluate(() => window.advanceTime(1500));
  const same = await page.evaluate(() => {
    const r = JSON.parse(window.wee.report());
    const again = JSON.parse(window.wee.gameText(window.wee.replay(r.level, r.keys, r.ticks)));
    return JSON.stringify(again) === JSON.stringify(r.end) && r.keys.length >= 4 && r.level.powers.boomerang === true && r.keys.some(k => k.k === 'power:boomerang:0');
  });
  check('a copied report replays to the same end', same);
  const cutPad = await page.evaluate(() => [...document.querySelectorAll('#pad button')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent));
  check('the play buttons fit their labels', cutPad.length === 0, cutPad.join(', '));
  await page.screenshot({ path: 'shots/phone-play.png' });
  await page.click('#mode');
  check('back in edit, Look is picked on its open tab', await page.locator('[data-tool=look]').isVisible() && await page.locator('[data-tool=look]').evaluate(b => b.classList.contains('on')));
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  check('the smoke ran to the end', false, err.message);
} finally {
  await browser.close();
  server.close();
}
done();
