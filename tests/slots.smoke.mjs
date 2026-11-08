// Who's playing (register 834): Me keeps its progress, Guest starts from nothing every time, Everything
// opens every level, and switching back to Me brings its progress back.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('slots');
const PORT = 5281;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(500);
  // Me with some progress of its own and the sound off.
  await p.evaluate(() => { localStorage.setItem('wee.campaign', JSON.stringify({ v: 4, last: null, levels: { 1: { won: true } }, owned: [], spent: 0 })); localStorage.setItem('wee.sound', '0'); });
  await p.reload(); await p.waitForTimeout(500);
  const pick = async id => { await p.click('#menuSlot'); await p.click(`#slotList [data-slot="${id}"]`); await p.waitForLoadState('load'); await p.waitForTimeout(500); };
  const store = () => p.evaluate(() => ({ camp: localStorage.getItem('wee.campaign'), dev: localStorage.getItem('wee.dev'), sound: localStorage.getItem('wee.sound'), slot: localStorage.getItem('wee.slot') }));
  check('the button sits beside the dev lock and says who is playing', await p.evaluate(() => { const a = document.getElementById('menuSlot').getBoundingClientRect(), b = document.getElementById('menuUnlock').getBoundingClientRect(); return Math.abs(a.top - b.top) < 1 && b.left - a.right < 20 && document.getElementById('menuSlot').title.startsWith('Playing as Me'); }));
  await pick('guest');
  let s = await store();
  check('Guest starts from nothing, and the sound setting stays', !s.camp && s.slot === 'guest' && s.sound === '0', JSON.stringify(s));
  await p.evaluate(() => localStorage.setItem('wee.campaign', '{"v":4,"last":null,"levels":{"2":{"won":true}},"owned":[],"spent":0}'));
  await pick('guest');
  s = await store();
  check('picking Guest again starts it over', !s.camp, JSON.stringify(s));
  await pick('all');
  s = await store();
  check('Everything opens every level', s.dev === '1' && s.slot === 'all' && await p.evaluate(() => document.body.classList.contains('unlocked')), JSON.stringify(s));
  await pick('me');
  s = await store();
  check('back to Me, its own progress is there and dev mode is off', !!s.camp && s.camp.includes('"1"') && !s.dev && s.slot === 'me', JSON.stringify(s));
  await pick('all');
  s = await store();
  check('and Everything keeps its own save too', s.dev === '1', JSON.stringify(s));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the slots smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
