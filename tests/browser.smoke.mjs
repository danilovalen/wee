// Drives the real page: edit by clicking, play by keys, save and open a file,
// and checks painted pixels where the text state says the player is.
import { chromium } from 'playwright-core';
import { readFileSync, mkdirSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('browser');
const PORT = 5199;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
mkdirSync('shots', { recursive: true });

try {
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => window.wee);
  const text = async () => JSON.parse(await page.evaluate(() => window.renderGameToText()));
  const box = await page.locator('#game').boundingBox();
  const at = (x, y) => ({ x: box.x + (x + 0.5) * box.width / 20, y: box.y + (y + 0.5) * box.height / 12 });

  // nothing in a panel is cut by its panel: every control sits inside its box
  const cut = await page.evaluate(() => {
    const out = [];
    for (const panel of document.querySelectorAll('aside, header')) {
      const r = panel.getBoundingClientRect();
      for (const el of panel.querySelectorAll('button, label, input, h2, p, small')) {
        if (el.closest('[hidden]')) continue;
        const e = el.getBoundingClientRect();
        if (e.width === 0) continue;
        if (e.left < r.left - 0.5 || e.right > r.right + 0.5 || e.top < r.top - 0.5 || e.bottom > r.bottom + 0.5 || el.scrollWidth > el.clientWidth + 1)
          out.push((el.textContent || el.tagName).trim().slice(0, 20));
      }
    }
    return out;
  });
  check('no control spills out of its panel', cut.length === 0, cut.join(', '));

  // edit by clicking: a block, a right-click erase, then a dragged row of enemies
  // Look is the starting tool: a click with it changes nothing and says what is there
  const before = JSON.stringify((await text()).level);
  let p = at(0, 0), q; await page.mouse.click(p.x, p.y);
  check('Look is the starting tool and a click changes nothing', JSON.stringify((await text()).level) === before);
  check('Look says what is under it', (await page.textContent('#placeHint')) === 'Block', await page.textContent('#placeHint'));
  await page.click('[data-tool=wall]');
  p = at(5, 5); await page.mouse.click(p.x, p.y);
  let lv = (await text()).level;
  check('a click places a block', lv.cells[5 * 20 + 5] === 'wall');
  await page.mouse.click(p.x, p.y, { button: 'right' });
  lv = (await text()).level;
  check('a right click erases it', lv.cells[5 * 20 + 5] === '');
  await page.mouse.click(p.x, p.y); await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  check('clicking a block with Block selected removes it', lv.cells[5 * 20 + 5] === '');
  await page.click('[data-tool=tri]');
  await page.click('[data-corner=ne]');
  await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  check('a triangle places with its chosen corner', lv.cells[5 * 20 + 5] === 'tri:ne');
  await page.mouse.click(p.x, p.y);
  check('and a second click removes it', (await text()).level.cells[5 * 20 + 5] === '');
  await page.click('[data-tool=wall]');
  await page.click('[data-tool=enemy]');
  check('enemy options show', await page.locator('[data-axis=h]').isVisible());
  await page.click('[data-mode=realtime]');
  const a = at(3, 8), b = at(6, 8);
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(b.x, b.y, { steps: 8 }); await page.mouse.up();
  lv = (await text()).level;
  const enemies = lv.entities.filter(e => e.kind === 'enemy' && e.y === 8);
  check('a drag paints a row', enemies.length === 4, String(enemies.length));
  check('placed enemies keep the chosen clock', enemies.every(e => e.mode === 'realtime'));
  // a drag that starts on the selected type removes that type along the way, and nothing else
  await page.click('[data-tool=enemy]');
  const r0 = at(3, 8), r1 = at(5, 8);
  await page.mouse.move(r0.x, r0.y); await page.mouse.down(); await page.mouse.move(r1.x, r1.y, { steps: 6 }); await page.mouse.up();
  lv = (await text()).level;
  const left = lv.entities.filter(e => e.kind === 'enemy' && e.y === 8).map(e => e.x);
  check('a drag from an enemy removes the enemies it crosses', left.join() === '6', left.join());
  await page.click('[data-tool=checkpoint]');
  const c9 = at(9, 10); await page.mouse.click(c9.x, c9.y);
  await page.click('[data-tool=wall]');
  const b0 = at(7, 10), b1 = at(11, 10);
  await page.mouse.move(b0.x, b0.y); await page.mouse.down(); await page.mouse.move(b1.x, b1.y, { steps: 8 }); await page.mouse.up();
  lv = (await text()).level;
  check('a placing drag fills its path, replacing what was there', [7, 8, 9, 10, 11].every(x => lv.cells[10 * 20 + x] === 'wall'));
  await page.click('[data-tool=checkpoint]');
  await page.mouse.click(c9.x, c9.y);
  await page.click('[data-tool=wall]');
  await page.mouse.move(b0.x, b0.y); await page.mouse.down(); await page.mouse.move(b1.x, b1.y, { steps: 8 }); await page.mouse.up();
  lv = (await text()).level;
  check('a drag from a block removes the blocks it crosses', [7, 8, 10, 11].every(x => lv.cells[10 * 20 + x] === ''));
  check('and leaves the checkpoint in its path alone', lv.cells[10 * 20 + 9] === 'checkpoint', lv.cells[10 * 20 + 9]);
  // a turret aims where you choose and mounts on a box it is placed on
  await page.click('[data-tool=box]');
  p = at(10, 3); await page.mouse.click(p.x, p.y);
  await page.click('[data-tool=turret]');
  await page.click('[data-aim=down]');
  await page.click('[data-aim=right]');
  check('the last aimed direction cannot be turned off', await page.locator('[data-aim=down]').isDisabled());
  await page.click('[data-aim=left]');
  await page.mouse.click(p.x, p.y);
  q = at(12, 3); await page.mouse.click(q.x, q.y);
  lv = (await text()).level;
  const mounted = lv.entities.find(e => e.x === 10 && e.y === 3);
  const alone = lv.entities.find(e => e.x === 12 && e.y === 3);
  check('a turret on a box mounts on it', mounted?.kind === 'box' && mounted.turret?.dirs.join() === 'down,left', JSON.stringify(mounted));
  check('a turret on floor stands alone', alone?.kind === 'turret', JSON.stringify(alone));
  await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  const unmounted = lv.entities.find(e => e.x === 10 && e.y === 3);
  check('clicking a mounted turret again takes only the turret off', unmounted?.kind === 'box' && !unmounted.turret, JSON.stringify(unmounted));
  await page.click('[data-tool=mover]');
  await page.click('[data-mode=follow]');
  check('a follower has no patrol axis to pick', !(await page.locator('[data-axis=h]').isVisible()));
  p = at(14, 3); await page.mouse.click(p.x, p.y);
  lv = (await text()).level;
  check('a follow piece saves its clock', lv.entities.find(e => e.x === 14 && e.y === 3)?.mode === 'follow');
  await page.click('[data-mode=input]');
  await page.click('[data-tool=gate]');
  await page.click('[data-pass=left]');
  q = at(15, 3); await page.mouse.click(q.x, q.y);
  check('a one-way tile keeps its directions', (await text()).level.cells[3 * 20 + 15] === 'gate:right,left', (await text()).level.cells[3 * 20 + 15]);
  await page.click('[data-pass=right]');
  check('the last allowed direction cannot be turned off', await page.locator('[data-pass=left]').isDisabled());
  await page.click('[data-tool=spring]');
  await page.click('[data-face=left]');
  q = at(16, 3); await page.mouse.click(q.x, q.y);
  await page.click('[data-tool=death]');
  q = at(17, 3); await page.mouse.click(q.x, q.y);
  lv = (await text()).level;
  check('a spring keeps the way it faces, and a death block places', lv.cells[3 * 20 + 16] === 'spring:left' && lv.cells[3 * 20 + 17] === 'death', lv.cells[3 * 20 + 16] + ' ' + lv.cells[3 * 20 + 17]);
  await page.click('[data-tool=wall]');
  check('enemy options hide for a block', !(await page.locator('[data-axis=h]').isVisible()));
  await page.screenshot({ path: 'shots/edit.png' });

  // play a known room by keys on a fixed clock
  await page.evaluate(l => window.wee.loadLevel(l), room([
    '##########',
    '#P..B...C#',
    '#........#',
    '#..o..D..#',
    '##########',
  ]));
  await page.keyboard.press('e');
  await page.evaluate(() => { window.__manualClock = true; });
  check('E enters play', (await text()).mode === 'play');
  await page.keyboard.press('ArrowRight');
  await page.evaluate(() => window.advanceTime(600));
  let s = await text();
  check('a key slide pushes the box to the wall', s.player.x === 7 && s.pieces[0].x === 8, JSON.stringify(s.player));
  await page.screenshot({ path: 'shots/play.png' });

  // the painted player sits where the text state says
  const px = await page.evaluate(({ x, y }) => {
    const c = document.getElementById('game'), tile = c.width / window.wee.getLevel().w;
    const d = c.getContext('2d').getImageData(Math.round((x + 0.5) * tile), Math.round((y + 0.75) * tile), 1, 1).data;
    return [d[0], d[1], d[2]];
  }, s.player);
  check('the player is painted on its tile', px[1] > 180 && px[2] > 180 && px[0] < 140, px.join(','));

  await page.keyboard.press('ArrowDown');
  await page.evaluate(() => window.advanceTime(600));
  await page.keyboard.press('r');
  await page.evaluate(() => window.advanceTime(120));
  s = await text();
  check('R returns to the start before any checkpoint', s.player.x === 1 && s.player.y === 1, JSON.stringify(s.player));
  await page.keyboard.press('e');
  check('E goes back to editing', (await text()).mode === 'edit');
  check('going back to editing selects Look', await page.locator('[data-tool=look]').evaluate(b => b.classList.contains('on')));
  check('playing did not change the room', (await text()).level.entities[0].x === 4);

  // save writes a .wee file; open reads it back
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#save')]);
  const path = await dl.path();
  const saved = JSON.parse(readFileSync(path, 'utf8'));
  check('save downloads a .wee file', dl.suggestedFilename().endsWith('.wee') && saved.format === 'wee-level');
  await page.evaluate(() => window.wee.loadLevel(JSON.parse(JSON.stringify({ ...window.wee.getLevel(), cells: window.wee.getLevel().cells.map(() => '') }))));
  await page.locator('#file').setInputFiles(path);
  await page.waitForFunction(() => window.wee.getLevel().cells[0] === 'wall');
  check('open restores the saved room', (await text()).level.cells.filter(c => c === 'wall').length === saved.cells.filter(c => c === 'wall').length);

  // a disabled power reads as disabled and cannot be ticked
  const hook = page.locator('[data-power=hook]');
  check('a power that cannot act yet is disabled', await hook.isDisabled());
  check('no page errors', errors.length === 0, errors.join(' | '));
} catch (err) {
  check('the smoke ran to the end', false, err.message);
} finally {
  await browser.close();
  server.close();
}
done();
