// The level list with everything unlocked (register 731): no hidden level, numbered levels in number order,
// every card whole (a name on one line, the pieces inside the card), and the progress buttons unclipped, on
// a phone and wide.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { LEVELS } from '../src/level/campaign.js';

const { check, done } = suite('levellist');
const server = await serve(5284);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const hidden = LEVELS.filter(l => l.hidden).map(l => l.id);
try {
  for (const [w, h] of [[393, 852], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, ...(w < 500 ? { isMobile: true, hasTouch: true } : {}) });
    await page.addInitScript(() => { window.__noTutorial = true; });
    await page.goto('http://localhost:5284/'); await page.waitForTimeout(400);
    await page.click('#menuUnlock'); await page.click('#devYes'); await page.waitForTimeout(100);
    await page.evaluate(() => { location.hash = '#/levels'; }); await page.waitForTimeout(500);
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('#campList li.main .campRow')];
      const ids = rows.map(b => b.dataset.level);
      const broken = rows.filter(b => { const c = b.getBoundingClientRect(), n = b.querySelector('.campRowHead > b'), p = b.querySelector('.campParts');
        const nr = n && n.getBoundingClientRect(), lh = n ? parseFloat(getComputedStyle(n).lineHeight) || 20 : 20;
        return (nr && nr.height > lh * 1.5) || (p && [...p.children].some(k => { const q = k.getBoundingClientRect(); return q.right > c.right + 0.5 || q.left < c.left - 0.5 || q.bottom > c.bottom + 0.5; })); }).map(b => b.dataset.level);
      const clipped = [...document.querySelectorAll('.progRow button')].filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent);
      const labels = [...document.querySelectorAll('#campList .campRow .campRowHead > b, #campList .campRow > b')].map(b => b.textContent.trim());
      // Every card, the side ones included (register 788): the whole name, the pieces on one line, the star inside.
      const cut = [...document.querySelectorAll('#campList .campRow')].map(b => {
        const c = b.getBoundingClientRect(), n = b.querySelector('.campRowHead > b'), ps = [...b.querySelectorAll('.campParts > *')], st = b.querySelector('.campStar.main, .campShut');
        const why = [];
        if (n && n.scrollWidth > n.clientWidth + 1) why.push('name cut');
        if (ps.length && new Set(ps.map(k => Math.round(k.getBoundingClientRect().top))).size > 1) why.push('pieces on two lines');
        if (ps.some(k => { const q = k.getBoundingClientRect(); return q.right > c.right - 2 || q.bottom > c.bottom - 2; })) why.push('pieces out');
        if (st) { const q = st.getBoundingClientRect(); if (q.bottom > c.bottom - 2 || q.right > c.right - 2) why.push('star on the edge'); }
        return why.length ? `${b.dataset.level}: ${why.join(', ')}` : null;
      }).filter(Boolean);
      return { ids, broken, clipped, labels, cut };
    });
    const nums = r.ids.filter(id => /^\d+$/.test(id)).map(Number);
    check(`${w}px: no hidden level shows`, !r.ids.some(id => hidden.includes(id)), r.ids.join());
    check(`${w}px: numbered levels run in number order`, nums.length > 10 && nums.every((n, i) => !i || n > nums[i - 1]), nums.join());
    const seq = k => r.labels.filter(t => t.startsWith(k + ' ')).map(t => +t.slice(k.length + 1));
    check(`${w}px: placing and removal challenges and puzzles each count 1, 2, 3... down the list (registers 735, 819)`, ['Place', 'Remove', 'Puzzle'].every(k => seq(k).length > 2 && seq(k).every((n, i) => n === i + 1)), r.labels.join());
    check(`${w}px: every card is whole: a name on one line, the pieces inside`, !r.broken.length, r.broken.join());
    check(`${w}px: every card, two to a slot included, keeps its whole name, its pieces on one line and its star inside (register 788)`, !r.cut.length, r.cut.join(' | '));
    check(`${w}px: the progress buttons fit their labels`, !r.clipped.length, r.clipped.join());
    const head = await page.evaluate(() => { const d = document.getElementById('campBox'); d.scrollTop = d.scrollHeight; const h = d.querySelector('.roomsHead').getBoundingClientRect(), m = document.getElementById('campMenu').getBoundingClientRect(); return { top: Math.round(h.top), menu: m.height > 0 && m.top >= 0 && m.bottom <= innerHeight, scrolled: d.scrollTop > 0 }; });
    check(`${w}px: scrolled to the end, the title and Menu stay at the top (register 763)`, head.scrolled && head.top >= -1 && head.top <= 4 && head.menu, JSON.stringify(head));
    await page.close();
  }
} catch (err) { check('the level list smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
