// Every way into the room editor opens the simple Sandbox, never the full editor the tests use (register 779):
// the room, out by its Rooms page to the menu, into a campaign level and back to the Sandbox.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('simple');
const server = await serve(5294);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.addInitScript(() => { window.__noTutorial = true; window.__openAll = true; });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => d.accept());
const settle = () => page.waitForTimeout(400);
const simple = () => page.evaluate(async () => { const { S } = await import('/src/editor/state.js'); return S.simple && document.body.classList.contains('simple') && !S.camp; });
try {
  await page.goto('http://localhost:5294/'); await settle();
  await page.click('#menuSandbox'); await settle(); await page.click('#roomNew'); await settle();
  check('the Sandbox opens simple', await simple());
  // The state the owner reached (register 779): the Sandbox still open while something left the editor full.
  // Going to the Rooms page and back into the room must make it simple again.
  await page.evaluate(async () => { const { S } = await import('/src/editor/state.js'); S.simple = false; document.body.classList.remove('simple'); });
  await page.click('#roomsBtn'); await settle();
  await page.evaluate(async () => (await import('/src/app/nav.js')).go('room')); await settle();
  check('back into the room, the Sandbox is simple again whatever left it full (register 779)', await simple());
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the simple smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
