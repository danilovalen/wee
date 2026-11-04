// Nothing moves (registers 679, 680): every visible element keeps its box when a tool is picked (and its
// hint or options show), on Check, on Play and back, and in a level on Run and Test, wide and on a phone.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('still');
const server = await serve(5279);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const boxes = p => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[id]')].filter(e => e.checkVisibility({ visibilityProperty: true }))
  .map(e => [e.id, e.getBoundingClientRect()]).filter(([, r]) => r.width && r.height).map(([k, r]) => [k, [r.x, r.y, r.width, r.height].map(Math.round).join()])));
// A tool's options are the content of a fixed slot: they change with the tool, and nothing round them may.
const SLOTS = new Set(['options']);
const moved = (a, b) => Object.keys(a).filter(k => !SLOTS.has(k) && b[k] && a[k] !== b[k]).map(k => `${k} ${a[k]} -> ${b[k]}`);
const page = async (w, h) => { const p = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 }); await p.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; window.__noWinCard = true; }); return p; };
async function still(p, label, act, wait) {
  const a = await boxes(p); await act(); await p.waitForTimeout(wait); const m = moved(a, await boxes(p));
  check(`${label}: nothing moves`, !m.length, m.join(' | '));
}
const click = (p, sel) => () => p.evaluate(s => document.querySelector(s).click(), sel);
try {
  for (const [w, h] of [[1280, 800], [965, 760], [393, 852]]) {
    const p = await page(w, h);
    await p.goto('http://localhost:5279/?sandbox=full');
    await p.waitForFunction(() => window.wee && window.wee.roomsReady); await p.evaluate(() => window.wee.roomsReady);
    await p.evaluate(() => document.getElementById('roomsBox').close()); await p.waitForTimeout(400);
    for (const t of ['wall', 'door', 'mover', 'look', 'select', 'wall']) await still(p, `${w}px Sandbox, picking ${t}`, click(p, `[data-tool="${t}"]`), 300);
    await still(p, `${w}px Sandbox, Check`, click(p, '#checkBtn'), 3000);
    await still(p, `${w}px Sandbox, Play`, click(p, '#mode'), 600);
    await still(p, `${w}px Sandbox, back to editing`, click(p, '#mode'), 600);
    if (w > 700) {
      // With the well opened by hand, it keeps its space through Play and back.
      await p.evaluate(() => { const b = document.getElementById('wellBtn'); b.disabled = false; b.click(); }); await p.waitForTimeout(400);
      check(`${w}px Sandbox: the well is open for the next two checks`, await p.locator('#well').isVisible());
      await still(p, `${w}px Sandbox with the well open, Play`, click(p, '#mode'), 600);
      await still(p, `${w}px Sandbox with the well open, back to editing`, click(p, '#mode'), 600);
    }
    await p.close();
  }
  // The menu's box sits on the same centre as the title and the screen (register 678).
  for (const w of [1280, 965, 701, 393]) {
    const p = await page(w, 900); await p.goto('http://localhost:5279/'); await p.waitForTimeout(500);
    const c = await p.evaluate(() => { const r = document.querySelector('.menuSec').getBoundingClientRect(); return Math.round(r.x + r.width / 2); });
    check(`${w}px menu: the button box is centred`, Math.abs(c - w / 2) <= 1, String(c));
    await p.close();
  }
  for (const [w, h] of [[1280, 800], [393, 852]]) {
    const p = await page(w, h);
    await p.goto('http://localhost:5279/'); await p.click('#menuCampaign'); await p.waitForTimeout(600);
    await p.click('.campRow[data-level]'); await p.waitForTimeout(800);
    await still(p, `${w}px level, Run`, click(p, '#campRun'), 2500);
    await still(p, `${w}px level, Test`, click(p, '#campTest'), 1000);
    await still(p, `${w}px level, back from Test`, click(p, '#campTest'), 1000);
    await p.close();
  }
} catch (err) { check('the still smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
