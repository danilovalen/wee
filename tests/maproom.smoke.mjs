// The campaign map room in the Sandbox (register 932): listed and editable in dev mode only, with its
// Map tools offered there and nowhere else.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('maproom');
const server = await serve(5283);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const open = async (dev, q = '?sandbox') => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(on => { window.__noTutorial = true; if (on) localStorage.setItem('wee.dev', '1'); }, dev);
  await p.goto('http://localhost:5283/' + q);
  await p.waitForFunction(() => window.wee && window.wee.roomsReady); await p.evaluate(() => window.wee.roomsReady);
  return { p, errors };
};
const slotShown = p => p.evaluate(() => !document.querySelector('[data-slot="map"]').hidden);
try {
  const { p, errors } = await open(true);
  check('dev mode lists the Map room', await p.evaluate(() => [...document.querySelectorAll('#roomsBox li')].some(li => /^MapExample/.test(li.textContent))));
  await p.evaluate(() => document.getElementById('roomsBox').close()); await p.waitForTimeout(200);
  check('a room that is not the map offers no Map tools', !(await slotShown(p)));
  await p.evaluate(() => window.wee.openTemplate('Map')); await p.waitForTimeout(500);
  check('the map room offers the Map tools', await slotShown(p));
  await p.evaluate(() => document.querySelector('[data-slot="map"]').click()); await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('#palette [data-tool="spot"]').click()); await p.waitForTimeout(200);
  const opts = await p.evaluate(() => [...document.querySelectorAll('#spotFor option')].map(o => o.textContent));
  check('a spot offers every room the campaign opens', opts.length >= 40 && opts.some(o => /^Level 1\b/.test(o)) && opts.some(o => /^Place 1 /.test(o)), String(opts.length));
  check('a level already on the map says so', opts.filter(o => /\(placed\)$/.test(o)).length === opts.length);
  check('no page errors', errors.length === 0, errors.join(' | '));
  const off = await open(false);
  await off.p.evaluate(() => { document.getElementById('roomsBox').close(); window.wee.openTemplate('Map'); }); await off.p.waitForTimeout(500);
  check('without dev mode the map room offers no Map tools', !(await slotShown(off.p)));
  const full = await open(true, '?sandbox=full');
  await full.p.evaluate(() => document.getElementById('roomsBox').close()); await full.p.waitForTimeout(200);
  check('the full Sandbox offers no Map tools outside the map room', !(await slotShown(full.p)));
  check('without dev mode the Map room is not listed', await off.p.evaluate(() => ![...document.querySelectorAll('#roomsBox li')].some(li => /^MapExample/.test(li.textContent))));
} finally {
  await browser.close(); server.close();
}
done();
