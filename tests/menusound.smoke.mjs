// The menu's blob makes the game's own sounds (registers 778, 782): its room is a real one, run by the rules,
// so each slide launches, lands and hits, the doors sound as the switch turns and the win at the berry, through
// the same voices a room plays, and none while the menu is shut.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('menu-sound');
const server = await serve(5295);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto('http://localhost:5295/');
  await page.waitForFunction(() => document.getElementById('menuRoom'));
  // Count what the voices are asked to play over one whole loop, then with the menu shut.
  const heard = await page.evaluate(async () => {
    const { VOICES } = await import('/src/app/sound.js'), { menuRoom } = await import('/src/app/menuScene.js'), got = [];
    for (const k of Object.keys(VOICES)) VOICES[k] = () => got.push(k);
    const start = menuRoom.game;
    await new Promise(res => { const t0 = performance.now(); const w = () => (menuRoom.game !== start || performance.now() - t0 > 15000) ? res() : setTimeout(w, 100); w(); });
    const shown = got.slice();
    document.getElementById('menuSandbox').click(); await new Promise(res => setTimeout(res, 300));
    got.length = 0; const ticks = menuRoom.ticks; await new Promise(res => setTimeout(res, 2500));
    return { shown, shut: got.slice(), ran: menuRoom.ticks - ticks };
  });
  const n = v => heard.shown.filter(x => x === v).length;
  check('on the menu the blob plays the room\'s voices: launch, land, hit, the doors and the win', ['launch', 'land', 'hit', 'doors', 'win'].every(v => heard.shown.includes(v)), JSON.stringify(heard.shown));
  check('each of the loop\'s six slides launches once, and the win sounds once', n('launch') === 6 && n('win') === 1, JSON.stringify(heard.shown));
  check('with the menu shut the room stands still and makes no sound', heard.shut.length === 0 && heard.ran === 0, JSON.stringify(heard));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the menu sound smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
