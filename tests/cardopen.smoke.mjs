// The menu's bar is every page's bar, and a level card opens into the level's clipboard (register 934).
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('cardopen');
const server = await serve(5284);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const box = (p, sel) => p.evaluate(s => { const e = [...document.querySelectorAll(s)].find(e => e.checkVisibility()); const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(Math.round); }, sel);
try {
  for (const [w, h] of [[393, 852], [1280, 800]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 500, isMobile: w < 500 });
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.addInitScript(() => { window.__noTutorial = true; window.__wipe = true; });
    await p.goto('http://localhost:5284/'); await p.waitForTimeout(1200);
    const looks = await box(p, '#menuLooks'), lock = await box(p, '#menuUnlock');
    await p.click('#menuCampaign'); await p.waitForTimeout(1200);
    const back = await box(p, '#campMenu');
    check(`${w}px: the menu's buttons sit where every page's bar puts them`, looks.join() === back.join() && lock[1] === back[1] && lock[3] === back[3] && w - (lock[0] + lock[2]) === back[0], `${looks} ${lock} ${back}`);
    const card = await box(p, '#campList button[data-level="1"]');
    await p.evaluate(() => { window.__rects = []; const tick = () => { const e = [...document.querySelectorAll('.campBrief')].find(e => e.checkVisibility()); if (e) { const r = e.getBoundingClientRect(); window.__rects.push([r.x, r.width].map(Math.round)); } if (window.__rects.length < 30) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
    await p.click('#campList button[data-level="1"]'); await p.waitForTimeout(700);
    const rects = await p.evaluate(() => window.__rects), end = await box(p, '.campBrief');
    check(`${w}px: the clipboard starts as the card it was`, rects.some(([x, wd]) => Math.abs(wd - card[2]) <= 30 && Math.abs(x - card[0]) <= 6), JSON.stringify(rects.slice(0, 3)) + ' ' + card);
    check(`${w}px: and grows into its own place`, rects.at(-1)[1] === end[2], JSON.stringify(rects.at(-1)) + ' ' + end);
    check(`${w}px: no page wipe over it`, await p.evaluate(() => !document.getElementById('wipe').matches(':popover-open')));
    check(`${w}px: no page errors`, errors.length === 0, errors.join(' | '));
    await p.close();
  }
} finally {
  await browser.close(); server.close();
}
done();
