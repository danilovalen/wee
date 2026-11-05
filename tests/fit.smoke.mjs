// A wide screen never scrolls: not the page, and not a column, whatever tool is picked.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { suite, pickTool } from './lib.mjs';

const { check, done } = suite('fit');
const server = await serve(5191);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  for (const [w, h] of [[874, 900], [760, 900], [701, 900], [1280, 720], [1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('http://localhost:5191/?sandbox=full');
    await page.waitForFunction(() => window.wee && window.wee.roomsReady);
    await page.evaluate(() => window.wee.roomsReady);
    await page.evaluate(() => document.getElementById('roomsBox').close());
    const over = () => page.evaluate(() => [document.documentElement, ...document.querySelectorAll('main > *')].map(e => e.scrollHeight - e.clientHeight).filter(n => n > 0).length);
    const bad = [];
    // The context bar shows every tool whole: its controls on top, one line of text under them.
    const ctxCut = () => page.evaluate(() => { const c = document.getElementById('ctx'), r = c.getBoundingClientRect(), opts = document.getElementById('options').getBoundingClientRect();
      const parts = [...c.querySelectorAll('button, .opt > span, #ctxNote, #placeHint')].filter(e => e.offsetParent);
      return c.scrollWidth > c.clientWidth || c.scrollHeight > c.clientHeight || parts.some(e => { const q = e.getBoundingClientRect(); return q.right > r.right + 0.5 || q.bottom > r.bottom + 0.5 || e.scrollWidth > e.clientWidth + 1; })
        || [...c.querySelectorAll('#ctxNote, #placeHint')].some(e => e.offsetParent && opts.height && c.contains(document.getElementById('options')) && e.getBoundingClientRect().top < opts.bottom - 1)
        // In a wide Sandbox the options float beside the slot (register 697): whole, and inside the window.
        || [...document.querySelectorAll('#toolPop button, #toolPop .opt > span')].filter(e => e.offsetParent).some(e => { const q = e.getBoundingClientRect(), p = document.getElementById('toolPop').getBoundingClientRect(); return q.right > p.right + 0.5 || q.bottom > p.bottom + 0.5 || p.bottom > innerHeight || p.right > innerWidth || e.scrollWidth > e.clientWidth + 1; }); });
    const cutTools = [];
    let turretNote = false;
    for (const t of await page.$$eval('[data-tool]:not([data-camp])', bs => bs.map(b => b.dataset.tool))) {
      await pickTool(page, t);
      if (await over()) bad.push(t);
      if (t === 'turret' && !(await page.locator('[data-aim=up]').getAttribute('class') || '').includes('on')) await page.click('[data-aim=up]');
      if (await ctxCut()) cutTools.push(t);
      if (t === 'turret') turretNote = await page.evaluate(() => !!document.getElementById('ctxNote').offsetParent && document.getElementById('ctxNote').textContent.includes('to mount it') && !document.getElementById('placeHint').offsetParent);
    }
    check(`${w}x${h}: nothing scrolls, with any tool picked`, !bad.length, bad.join(' '));
    check(`${w}x${h}: the context bar shows every tool's controls and text whole, text under the controls`, !cutTools.length, cutTools.join(' '));
    check(`${w}x${h}: a tool's note takes the text line in place of the general hint`, turretNote);
    const cut = await page.evaluate(() => [...document.querySelectorAll('#tools button')].filter(b => b.offsetParent && b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim()));
    check(`${w}x${h}: no tool's name is cut`, !cut.length, cut.join(', '));
    const tall = await page.evaluate(() => { window.wee.loadLevel(window.wee.blank(12, 30)); return new Promise(r => requestAnimationFrame(() => r())); }).then(over);
    check(`${w}x${h}: a tall room still fits`, !tall);
    // Everything open at once: the turret with two aims (its most options), every lens row lit,
    // design notes in the well. Nothing is cut, and only the room gives up height.
    const first = JSON.parse(readFileSync('tests/fixtures/first-room-v1.wee', 'utf8'));
    await page.evaluate(l => window.wee.loadLevel(l), first);
    await pickTool(page, 'turret');
    if (!(await page.locator('[data-aim=up]').getAttribute('class') || '').includes('on')) await page.click('[data-aim=up]');
    // On a narrower screen the icons fold into one Lenses button, which opens them (register 749).
    if (await page.locator('#lensFold').isVisible()) await page.click('#lensFold');
    const lost = await page.evaluate(() => [...document.querySelectorAll('[data-lens-icon]')].filter(b => { const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return r.left < -0.5 || r.right > innerWidth + 0.5 || !(hit && b.contains(hit)); }).map(b => b.dataset.lensIcon));
    check(`${w}x${h}: every lens icon is whole and tappable, in the header or its Lenses fold (registers 721, 749)`, !lost.length, lost.join(' '));
    for (const id of ['stops', 'traps', 'distance', 'solution']) await page.click(`[data-lens-icon=${id}]`);
    if (await page.locator('#lensFold').isVisible()) await page.click('#lensFold');
    await page.click('#checkBtn');
    await page.waitForFunction(() => !!document.getElementById('designBox').dataset.done, null, { timeout: 60000 });
    // Check leaves the well shut (register 680); open it on the notes.
    if (await page.locator('#well').isHidden()) await page.click('#wellBtn');
    const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await settle();
    // A bar's control past the bar's edge, or with its own text cut, is cut off.
    const cutOff = () => page.evaluate(() => ['ctx', 'toolPop', 'statusBar', 'well', 'lensChips'].flatMap(id => { const bar = document.getElementById(id), r = bar.getBoundingClientRect();
      return [...bar.querySelectorAll('button, .opt > span')].filter(b => b.offsetParent && b.closest('.wellBody') === null).filter(b => { const q = b.getBoundingClientRect(); return q.right > r.right + 0.5 || q.bottom > r.bottom + 0.5 || b.scrollWidth > b.clientWidth + 1; }).map(b => `${id}:${b.textContent.trim().slice(0, 16)}`); }));
    // The room's share of the height; a room held back by the window's width loses nothing to height, so it counts as whole.
    const share = () => page.evaluate(() => { const a = document.getElementById('roomArea'), r = document.getElementById('ring'), c = (r.hidden ? document.getElementById('game') : r).getBoundingClientRect(); return c.width >= a.clientWidth - 40 && c.height < a.clientHeight - 40 ? 1 : a.clientHeight / innerHeight; });
    // The room takes the area it is given, less the margin its "+" handles sit in, and no more.
    // Fills its area, less the bars of + and − above and below it (register 298).
    // The room with its outskirts' wall (register 672) is what fills the area.
    const fills = () => page.evaluate(() => { const r = document.getElementById('ring'), c = (r.hidden ? document.getElementById('game') : r).getBoundingClientRect(), a = document.getElementById('roomArea'); return (c.width >= a.clientWidth - 110 || c.height >= a.clientHeight - 90) && c.width <= a.clientWidth + 1 && c.height <= a.clientHeight + 1; });
    // Register 697: in a wide Sandbox they sit beside the turret's slot, inside the window.
    const pop = await page.evaluate(() => { const p = document.getElementById('toolPop'), r = p.getBoundingClientRect(), s = document.querySelector('#strip .slot.on').getBoundingClientRect();
      return { opts: [...p.querySelectorAll('.opt')].filter(o => !o.hidden).length, beside: !p.hidden && Math.abs(r.left - s.right - 6) < 1 && r.top <= s.bottom && r.bottom >= s.top, inside: r.bottom <= innerHeight && r.right <= innerWidth }; });
    check(`${w}x${h}: the turret's options sit beside its slot, inside the window`, pop.opts >= 3 && pop.beside && pop.inside, JSON.stringify(pop));
    await page.dispatchEvent('#strip .slot.on', 'contextmenu'); await page.waitForTimeout(100);
    check(`${w}x${h}: the options panel hides while the flyout is open`, await page.locator('#toolPop').isHidden() && await page.locator('#palette.fly').isVisible());
    await page.keyboard.press('Escape'); await page.waitForTimeout(50);
    const open = await share();
    // Over the room, its four "+" show and none is clipped by the room's area.
    const gb = await page.locator('#game').boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    // Wait for the fade-in itself, not a fixed time: a loaded machine finishes it late.
    await page.waitForFunction(() => [...document.querySelectorAll('[data-grip]')].every(b => getComputedStyle(b).opacity >= 0.9), null, { timeout: 3000 }).catch(() => {});
    const plus = await page.evaluate(() => { const a = document.getElementById('roomArea').getBoundingClientRect(); return [...document.querySelectorAll('[data-grip]')].filter(b => { const r = b.getBoundingClientRect(); return getComputedStyle(b).opacity < 0.9 || r.left < a.left || r.top < a.top || r.right > a.right || r.bottom > a.bottom; }).map(b => b.dataset.plus); });
    check(`${w}x${h}: the room's four grips show, none clipped`, !plus.length, plus.join(' '));
    // The Sandbox's strip is icons at every width (register 381); each slot and each flyout tool is named on hover.
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('#strip .slot:not([hidden]), [data-tool]:not([data-camp])')].filter(b => !b.title).map(b => b.dataset.slot || b.dataset.tool));
    check(`${w}x${h}: the tool strip's slots and tools are always named on hover`, !unnamed.length, unnamed.join(' '));
    check(`${w}x${h}: everything open: nothing scrolls, nothing is cut, the room fills its area`, !(await over()) && !(await cutOff()).length && await page.locator('#well').isVisible() && (await page.locator('#lensBar').isVisible() || await page.locator('#lensFold').isVisible()) && await fills(), JSON.stringify({ cut: await cutOff(), over: await over() }));
    check(`${w}x${h}: everything open, the room keeps at least 65% of the height: Findings is a column beside it (register 730)`, open >= 0.65, open.toFixed(2));
    await page.click('#mode');
    await settle();
    check(`${w}x${h}: play mode: the play buttons sit in the status bar, the lens icons go, and nothing is cut`, await page.locator('#lensBar').isHidden() && !(await over()) && !(await cutOff()).length && await page.evaluate(() => document.getElementById('pad').parentElement.id === 'statusBar' && !!document.getElementById('pad').offsetParent), JSON.stringify(await cutOff()));
    await page.click('#mode');
    await page.click('#roomsBtn'); await page.click('#roomGen');
    await page.locator('.genIngBox summary').click();
    check(`${w}x${h}: the Generator opens from the Rooms page and fits without scrolling`, await page.locator('#genBox').isVisible() && await page.evaluate(() => { const d = document.getElementById('genBox'); return d.scrollHeight <= d.clientHeight; }));
    await page.close();
  }
  // Below about 700 px of height a column may scroll on its own, but nothing may be cut off.
  const low = await browser.newPage({ viewport: { width: 1280, height: 560 } });
  await low.goto('http://localhost:5191/?sandbox=full');
  await low.waitForFunction(() => window.wee && window.wee.roomsReady);
  await low.evaluate(() => window.wee.roomsReady);
  await low.evaluate(() => document.getElementById('roomsBox').close());
  const reach = [];
  await low.click('#powersBtn');
  for (const [col, last] of [['#tools', '#strip .slot:not([hidden])'], ['#powers', 'input[name=clock]:last-of-type']]) {
    const b = await low.locator(col).boundingBox();
    await low.mouse.move(b.x + b.width / 2, b.y + 40);
    await low.mouse.wheel(0, 3000);
    await low.waitForTimeout(200);
    const r = await low.locator(last).last().boundingBox();
    if (!r || r.y + r.height > 560) reach.push(col);
  }
  check('on a short screen every column can still be scrolled to its end', !reach.length, reach.join(' '));
  await low.close();
} catch (err) { check('the fit smoke ran to the end', false, process.env.DBG ? err.message.split('\n').slice(0, 12).join(' | ') : err.message); }
finally { await browser.close(); server.close(); }
done();
