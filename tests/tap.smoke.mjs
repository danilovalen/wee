// A tap on a phone (register 531): a button presses down and comes back to rest; it never pops up higher
// than it started, which read as a flicker on every button.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';
import { LEVELS } from '../src/level/campaign.js';
import { listed } from '../src/campaign/rules.js';
// Levels by place in the list, not by number (register 581).
const LISTED = LEVELS.filter(listed), A = LISTED[0].id, B = (LISTED[1] || LISTED[0]).id, C = (LISTED[2] || LISTED[0]).id;

const { check, done } = suite('tap');
const PORT = 5265;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  const p = await browser.newPage({ viewport: { width: 393, height: 735 }, hasTouch: true, isMobile: true });
  await p.addInitScript(() => { window.__noTutorial = true; window.__noWinCard = true; });
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(800);
  // Every frame for ~0.7s after the tap: the largest shadow offset and whether the button ever moved.
  const tap = async sel => {
    await p.evaluate(sel => { const el = document.querySelector(sel), rest = parseFloat(getComputedStyle(el).boxShadow.match(/(-?[\d.]+)px (-?[\d.]+)px 0px 0px/)?.[1] || 0); window.__t = { rest, most: rest, moved: false }; let n = 0;
      const f = () => { const s = getComputedStyle(el), m = [...s.boxShadow.matchAll(/(-?[\d.]+)px (-?[\d.]+)px 0px 0px/g)].map(x => +x[1]); window.__t.most = Math.max(window.__t.most, ...m); if (s.transform !== 'none' && !/^matrix\(1, 0, 0, 1, 0, 0\)$/.test(s.transform)) window.__t.moved = true; if (++n < 45) requestAnimationFrame(f); }; requestAnimationFrame(f); }, sel);
    await p.tap(sel); await p.waitForTimeout(800);
    return p.evaluate(() => window.__t);
  };
  const steady = t => t.most <= t.rest + 0.01 && !t.moved;
  let t = await tap('#menuCampaign'); check('the menu\'s Campaign button never pops up after a tap', steady(t), JSON.stringify(t));
  await p.waitForTimeout(400); await p.tap(`.campRow[data-level="${C}"]`); await p.waitForTimeout(800);
  t = await tap('#palette [data-tool="wall"]'); check('a piece button never pops up after it is picked', steady(t), JSON.stringify(t));
  t = await tap('#campTools [data-tool="erase"]'); check('a tool button never pops up after it is picked', steady(t), JSON.stringify(t));
  t = await tap('#campTest'); check('Test never pops up after a tap', steady(t), JSON.stringify(t));
  t = await tap('#mode'); check('Edit never pops up after a tap', steady(t), JSON.stringify(t));
  t = await tap('#campBack'); check('Levels never pops up after a tap', steady(t), JSON.stringify(t));
} catch (err) { check('the tap smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
