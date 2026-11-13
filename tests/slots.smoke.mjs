// Who's playing (register 834): Me keeps its progress, Guest starts from nothing every time, and switching
// back to Me brings its progress back. The dev lock is the every-level save (835).
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite, opt } from './lib.mjs';

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
  const pick = async id => { await opt(p, 'menuSlot'); await p.click(`#slotList [data-slot="${id}"]`); await p.waitForLoadState('load'); await p.waitForTimeout(500); };
  const store = () => p.evaluate(() => ({ camp: localStorage.getItem('wee.campaign'), dev: localStorage.getItem('wee.dev'), sound: localStorage.getItem('wee.sound'), slot: localStorage.getItem('wee.slot') }));
  check('the player button lives in Options and says who is playing (register 960)', await p.evaluate(() => document.getElementById('menuSlot').closest('#optionsBox') && document.getElementById('menuSlot').title.startsWith('Playing as Me')));
  await pick('guest');
  let s = await store();
  check('Guest starts from nothing, and the sound setting stays', !s.camp && s.slot === 'guest' && s.sound === '0', JSON.stringify(s));
  await p.evaluate(() => localStorage.setItem('wee.campaign', '{"v":4,"last":null,"levels":{"2":{"won":true}},"owned":[],"spent":0}'));
  await pick('guest');
  s = await store();
  check('picking Guest again starts it over', !s.camp, JSON.stringify(s));
  // The lock is the every-level save (register 835): on, Me steps aside; off, Me is back as it was.
  await pick('me');
  await opt(p, 'menuUnlock'); await p.click('#devYes'); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  s = await store();
  check('the lock opens every level in a save of its own', s.dev === '1' && s.slot === 'all' && await p.evaluate(() => document.body.classList.contains('unlocked')), JSON.stringify(s));
  check('and Who\'s playing lists only Me and Guest', await p.evaluate(() => { document.getElementById('menuSlot').click(); const ids = [...document.querySelectorAll('#slotList [data-slot]')].map(b => b.dataset.slot).join(); document.getElementById('slotBox').close(); return ids; }) === 'me,guest');
  await p.evaluate(() => localStorage.setItem('wee.campaign', '{"v":4,"last":null,"levels":{"9":{"won":true}},"owned":[],"spent":0}'));
  await opt(p, 'menuUnlock'); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  s = await store();
  check('locking again brings Me back with its own progress, dev mode off', !!s.camp && s.camp.includes('"1"') && !s.camp.includes('"9"') && !s.dev && s.slot === 'me', JSON.stringify(s));
  await pick('guest');
  await p.evaluate(() => localStorage.setItem('wee.campaign', '{"v":4,"last":null,"levels":{"3":{"won":true}},"owned":[],"spent":0}'));
  await opt(p, 'menuUnlock'); await p.click('#devYes'); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  await opt(p, 'menuUnlock'); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  s = await store();
  check('a guest who peeks with the lock comes back to their own progress', s.slot === 'guest' && !!s.camp && s.camp.includes('"3"'), JSON.stringify(s));
  // The device board (register 839): Me's line and a guest's, highest first, the dev save never on it.
  await p.evaluate(() => localStorage.setItem('wee.board', JSON.stringify([{ id: 'me', slot: 'me', score: 40, at: 1 }, { id: 'guest:1794000000000-ab', slot: 'guest', score: 90, at: 2 }])));
  const lines = await p.evaluate(() => { document.getElementById('menuSlot').click(); const out = [...document.querySelectorAll('#slotBoard li')].map(l => l.textContent); document.getElementById('slotBox').close(); return out; });
  check('Who\'s playing lists the best scores on this device, highest first', lines.length === 2 && /^Guest, .+: 90$/.test(lines[0]) && lines[1] === 'Me: 40', JSON.stringify(lines));
  await pick('me');
  check('the board outlives a switch of player', (await p.evaluate(() => localStorage.getItem('wee.board') || '')).includes('"guest:1794000000000-ab"'));
  // A save from before the lock had its own slot can carry dev mode in it (register 935): the lock still turns it off.
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem('wee.dev', '1'); localStorage.setItem('wee.campaign', '{"v":4,"last":null,"levels":{"3":{"won":true}},"owned":[],"spent":0}'); });
  await p.reload(); await p.waitForTimeout(500);
  await opt(p, 'menuUnlock'); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  s = await store();
  check('dev mode left in your own save turns off with the lock, your progress kept', !s.dev && /"3"/.test(s.camp || ''), JSON.stringify(s));
  await p.evaluate(() => localStorage.setItem('wee.stash.me', JSON.stringify({ 'wee.dev': '1', 'wee.campaign': localStorage.getItem('wee.campaign') })));
  await p.evaluate(() => { localStorage.setItem('wee.slot', 'all'); localStorage.setItem('wee.dev', '1'); localStorage.setItem('wee.slot.back', 'me'); });
  await p.reload(); await p.waitForTimeout(500);
  await opt(p, 'menuUnlock'); await p.waitForLoadState('load'); await p.waitForTimeout(500);
  s = await store();
  check('a set-aside save carrying dev mode comes back without it', !s.dev && s.slot === 'me' && /"3"/.test(s.camp || ''), JSON.stringify(s));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the slots smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
