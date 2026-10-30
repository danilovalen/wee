// Nothing collides (register 422): on every page, at a phone's and a computer's width, no two visible
// cards or buttons touch, their sticker shadows counted. Buttons joined on purpose (a [data-join]
// strip) are one control and exempt among themselves.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite, pickTool } from './lib.mjs';

const { check, done } = suite('spacing');
const PORT = 5255;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const SHADOW = 4, GAP = 2;
// Pairs of visible cards and buttons on the open page (or the page itself), closer than the gap.
const collisions = page => page.evaluate(({ SHADOW, GAP }) => {
  const top = [...document.querySelectorAll('dialog[open]')].at(-1) || document.body;
  const els = [...top.querySelectorAll('button, .roomRow, .campRow, .menuSec')].filter(e => {
    const r = e.getBoundingClientRect(), c = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && e.closest('dialog, body') && !e.closest('[hidden]');
  });
  // A resize pair (+ and -) and the phone's bottom tab bar are one control each too.
  const join = e => e.closest('[data-join], .grow, .phoneNav');
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j];
    if (a.contains(b) || b.contains(a)) continue;
    if (join(a) && join(a) === join(b)) continue;
    const r = a.getBoundingClientRect(), q = b.getBoundingClientRect();
    // Each one's sticker shadow reaches SHADOW px right and down.
    const gx = Math.max(q.left - (r.right + SHADOW), r.left - (q.right + SHADOW)), gy = Math.max(q.top - (r.bottom + SHADOW), r.top - (q.bottom + SHADOW));
    if (Math.max(gx, gy) < GAP) out.push(`${a.id || a.className || a.tagName}|${b.id || b.className || b.tagName} (${Math.round(Math.max(gx, gy))})`);
  }
  return out;
}, { SHADOW, GAP });
try {
  for (const [label, viewport] of [['phone', { width: 393, height: 852 }], ['computer', { width: 1280, height: 800 }]]) {
    const page = await browser.newPage({ viewport }); await page.addInitScript(() => { window.__noTutorial = true; });
    await page.addInitScript(() => { window.__noWinCard = false; });
    await page.goto(`http://localhost:${PORT}/`); await page.waitForTimeout(500);
    const see = async name => { await page.mouse.move(1, 1); await page.waitForTimeout(200); const c = await collisions(page); check(`${label}: nothing collides on ${name}`, !c.length, c.slice(0, 6).join(', ')); };
    await see('the menu');
    await page.click('#menuCampaign'); await page.waitForTimeout(300); await see('the level list');
    await page.click('#campMenu'); await page.waitForTimeout(300);
    // The Rooms page with the room open now, unsaved, and only the example below it: the case that collided.
    await page.click('#menuSandbox'); await page.waitForTimeout(400);
    await page.click('#roomNew'); await page.waitForTimeout(300);
    // An edit by hand, so the room shows on the Rooms page as unsaved.
    await pickTool(page, 'wall'); const g = await page.locator('#game').boundingBox(); await page.mouse.click(g.x + g.width / 2, g.y + g.height / 2); await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('roomsBtn').click()); await page.waitForTimeout(500);
    check(`${label}: the Rooms page shows the unsaved room above the example`, await page.locator('#openNow .roomRow').count() === 1 && await page.locator('#roomList .example .roomRow').count() === 1);
    await see('the Rooms page');
    await page.click('#moreBtn'); await page.waitForTimeout(150); await see('the Rooms page with More open');
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('roomTitle').click()); await page.waitForTimeout(300);
    await see('This room');
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    await see('the editor');
    await page.click('#strip [data-slot="walls"]'); await page.waitForTimeout(200); await see('the editor with a group open');
    await page.goto(`http://localhost:${PORT}/#/level/16`); await page.waitForTimeout(600); await see('a level');
    await page.close();
  }
} catch (err) { check('the spacing smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
