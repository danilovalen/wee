// The menu's blob makes the game's own sounds (register 778): one launch, land and hit per slide of its loop,
// the doors as the switch turns, the win at the berry, through the same voices a room plays, and none while
// the menu is shut.
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
  await page.waitForFunction(() => document.querySelector('.msRobot'));
  const tl = await page.evaluate(async () => (await import('/src/app/menuSound.js')).menuTimeline());
  const n = v => tl.filter(([, x]) => x === v).length;
  // The loop slides down, right, down, right, left and down: six slides.
  check('each of the loop\'s six slides launches, lands and hits, read off its keyframes', n('launch') === 6 && n('land') === 6 && n('hit') === 6, JSON.stringify(tl));
  check('the doors sound once, as the switch turns on', n('doors') === 1 && tl.find(([, v]) => v === 'doors')[0] > 40 && tl.find(([, v]) => v === 'doors')[0] < 43, JSON.stringify(tl));
  check('and the win sounds as the last slide reaches the berry', n('win') === 1 && tl[tl.length - 1][1] === 'win' && tl[tl.length - 1][0] > 60, JSON.stringify(tl));
  // Count what the voices are asked to play, at ten times the speed.
  const heard = await page.evaluate(async () => {
    const { VOICES } = await import('/src/app/sound.js'), got = [];
    for (const k of Object.keys(VOICES)) VOICES[k] = () => got.push(k);
    const r = document.querySelector('.msRobot'); r.style.animationDuration = '1.2s, 12s';
    r.style.animationName = 'none'; void r.offsetWidth; r.style.animationName = '';
    await new Promise(res => setTimeout(res, 1300));
    const shown = got.slice();
    document.getElementById('menuSandbox').click(); await new Promise(res => setTimeout(res, 300));
    got.length = 0; await new Promise(res => setTimeout(res, 1300));
    return { shown, shut: got.slice(), open: document.getElementById("menuBox").open, menus: [...document.querySelectorAll("dialog[open]")].map(d => d.id) };
  });
  check('on the menu the blob plays the room\'s voices', ['launch', 'land', 'hit', 'doors', 'win'].every(v => heard.shown.includes(v)), JSON.stringify(heard.shown));
  check('and none while the menu is shut', heard.shut.length === 0, JSON.stringify(heard));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the menu sound smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
