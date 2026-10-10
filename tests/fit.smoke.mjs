// A wide screen never scrolls: not the page, and not a column, whatever tool is picked.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('fit');
const server = await serve(5191);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  for (const [w, h] of [[874, 900], [760, 900], [1280, 720], [1366, 768], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto('http://localhost:5191/');
    await page.waitForFunction(() => window.wee && window.wee.roomsReady);
    await page.evaluate(() => window.wee.roomsReady);
    const over = () => page.evaluate(() => [document.documentElement, ...document.querySelectorAll('main > *')].map(e => e.scrollHeight - e.clientHeight).filter(n => n > 0).length);
    const bad = [];
    // The context bar shows every tool whole: its controls on top, one line of text under them.
    const ctxCut = () => page.evaluate(() => { const c = document.getElementById('ctx'), r = c.getBoundingClientRect(), opts = document.getElementById('options').getBoundingClientRect();
      const parts = [...c.querySelectorAll('button, .opt > span, #ctxNote, #placeHint')].filter(e => e.offsetParent);
      return c.scrollWidth > c.clientWidth || c.scrollHeight > c.clientHeight || parts.some(e => { const q = e.getBoundingClientRect(); return q.right > r.right + 0.5 || q.bottom > r.bottom + 0.5 || e.scrollWidth > e.clientWidth + 1; })
        || [...c.querySelectorAll('#ctxNote, #placeHint')].some(e => e.offsetParent && opts.height && e.getBoundingClientRect().top < opts.bottom - 1); });
    const cutTools = [];
    let turretNote = false;
    for (const t of await page.$$eval('[data-tool]', bs => bs.map(b => b.dataset.tool))) {
      await page.click(`[data-tool=${t}]`);
      if (await over()) bad.push(t);
      if (t === 'turret' && !(await page.locator('[data-aim=up]').getAttribute('class') || '').includes('on')) await page.click('[data-aim=up]');
      if (await ctxCut()) cutTools.push(t);
      if (t === 'turret') turretNote = await page.evaluate(() => !!document.getElementById('ctxNote').offsetParent && document.getElementById('ctxNote').textContent.includes('To mount it') && !document.getElementById('placeHint').offsetParent);
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
    await page.click('[data-tool=turret]');
    if (!(await page.locator('[data-aim=up]').getAttribute('class') || '').includes('on')) await page.click('[data-aim=up]');
    await page.click('#stopsBtn');
    for (const g of ['colour', 'lines']) await page.click(`[data-chip=${g}]`);
    await page.click('#checkBtn');
    await page.waitForFunction(() => /changes the answer|nothing changes|same job/.test(document.getElementById('designList').textContent), null, { timeout: 60000 });
    const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await settle();
    // A bar's control past the bar's edge, or with its own text cut, is cut off.
    const cutOff = () => page.evaluate(() => ['ctx', 'statusBar', 'well', 'lensChips'].flatMap(id => { const bar = document.getElementById(id), r = bar.getBoundingClientRect();
      return [...bar.querySelectorAll('button, .opt > span')].filter(b => b.offsetParent && b.closest('.wellBody') === null).filter(b => { const q = b.getBoundingClientRect(); return q.right > r.right + 0.5 || q.bottom > r.bottom + 0.5 || b.scrollWidth > b.clientWidth + 1; }).map(b => `${id}:${b.textContent.trim().slice(0, 16)}`); }));
    const share = () => page.evaluate(() => document.getElementById('roomArea').clientHeight / innerHeight);
    // The room takes the area it is given, less the margin its "+" handles sit in, and no more.
    const fills = () => page.evaluate(() => { const c = document.getElementById('game').getBoundingClientRect(), a = document.getElementById('roomArea'); return (c.width >= a.clientWidth - 40 || c.height >= a.clientHeight - 40) && c.width <= a.clientWidth + 1 && c.height <= a.clientHeight + 1; });
    const ctxOpts = await page.evaluate(() => [...document.querySelectorAll('#ctx .opt')].filter(o => !o.hidden).length);
    check(`${w}x${h}: the turret's options sit in the context bar`, ctxOpts >= 3, String(ctxOpts));
    const open = await share();
    // Over the room, its four "+" show and none is clipped by the room's area.
    const gb = await page.locator('#game').boundingBox();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.waitForTimeout(250);
    const plus = await page.evaluate(() => { const a = document.getElementById('roomArea').getBoundingClientRect(); return [...document.querySelectorAll('[data-plus]')].filter(b => { const r = b.getBoundingClientRect(); return getComputedStyle(b).opacity < 0.9 || r.left < a.left || r.top < a.top || r.right > a.right || r.bottom > a.bottom; }).map(b => b.dataset.plus); });
    check(`${w}x${h}: the room's four + show on hover, none clipped`, !plus.length, plus.join(' '));
    const unnamed = await page.evaluate(() => [...document.querySelectorAll('[data-tool]')].filter(b => !b.title || (b.querySelector('.lbl').offsetParent === null) !== (innerWidth <= 1100)).map(b => b.dataset.tool));
    check(`${w}x${h}: tools are icons up to 1100 px wide, labelled above it, and always named on hover`, !unnamed.length, unnamed.join(' '));
    check(`${w}x${h}: everything open: nothing scrolls, nothing is cut, the room fills its area`, !(await over()) && !(await cutOff()).length && await page.locator('#well').isVisible() && await page.locator('#lensChips').isVisible() && await fills(), JSON.stringify({ cut: await cutOff(), over: await over() }));
    check(`${w}x${h}: everything open, the room keeps at least 45% of the height`, open >= 0.45, open.toFixed(2));
    await page.click('#wellClose');
    await settle();
    const shut = await share();
    check(`${w}x${h}: with the well shut the room keeps at least 70%`, shut >= 0.7 && await fills(), shut.toFixed(2));
    await page.click('#mode');
    await settle();
    check(`${w}x${h}: play mode: the play buttons sit in the status bar, the lens chips go, and nothing is cut`, await page.locator('#lensChips').isHidden() && !(await over()) && !(await cutOff()).length && await page.evaluate(() => document.getElementById('pad').parentElement.id === 'statusBar' && !!document.getElementById('pad').offsetParent), JSON.stringify(await cutOff()));
    await page.click('#genBtn');
    await page.locator('.genIngBox summary').click();
    check(`${w}x${h}: the Generator opens from the header and fits without scrolling`, await page.locator('#genBox').isVisible() && await page.evaluate(() => { const d = document.getElementById('genBox'); return d.scrollHeight <= d.clientHeight; }));
    await page.close();
  }
  // Below about 700 px of height a column may scroll on its own, but nothing may be cut off.
  const low = await browser.newPage({ viewport: { width: 1280, height: 560 } });
  await low.goto('http://localhost:5191/');
  await low.waitForFunction(() => window.wee && window.wee.roomsReady);
  await low.evaluate(() => window.wee.roomsReady);
  const reach = [];
  for (const [col, last] of [['#tools', '#palette button:last-child'], ['#powers', 'input[name=clock]:last-of-type']]) {
    const b = await low.locator(col).boundingBox();
    await low.mouse.move(b.x + b.width / 2, b.y + 40);
    await low.mouse.wheel(0, 3000);
    await low.waitForTimeout(200);
    const r = await low.locator(last).last().boundingBox();
    if (!r || r.y + r.height > 560) reach.push(col);
  }
  check('on a short screen every column can still be scrolled to its end', !reach.length, reach.join(' '));
  await low.close();
} catch (err) { check('the fit smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
