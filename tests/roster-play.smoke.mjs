// The designed rooms, played the way a player would: picked from New room, then their answer
// pressed on the keyboard, to the win.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { TEMPLATES } from '../src/level/templates.js';
import { solve } from '../src/solve/solve.js';
import { suite } from './suite.mjs';
import { pickTool } from './lib.mjs';

const { check, done } = suite('roster-play');
const PORT = 5223;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', hide: 'Space' };
try {
  for (const name of ['Overshoot', 'Short fuse']) {
    await page.goto(`http://localhost:${PORT}/?sandbox=full`);
    await page.waitForFunction(() => window.wee && window.wee.roomsReady);
    await page.evaluate(() => window.wee.roomsReady);
    await page.evaluate(n => window.wee.openTemplate(n), name);
    const moves = solve(TEMPLATES.find(t => t.name === name).level).moves;
    await page.evaluate(() => { window.__manualClock = true; });
    await page.keyboard.press('e');
    for (const m of moves) { await page.keyboard.press(KEY[m]); await page.evaluate(() => window.advanceTime(1500)); }
    const end = JSON.parse(await page.evaluate(() => window.renderGameToText()));
    check(`${name}: picked from New room and played on the keyboard, its answer wins (${moves.length} moves)`, end.won && end.deaths === 0 && end.moves === moves.length && await page.locator('#win').isVisible(), JSON.stringify({ won: end.won, deaths: end.deaths, moves: end.moves }));
  }
  // A template you only opened has nothing to lose, so moving on asks nothing; once edited, it asks.
  await page.goto(`http://localhost:${PORT}/?sandbox=full`);
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  const asked = []; page.on('dialog', d => { asked.push(d.message()); d.dismiss(); });
  const pick = async name => { await page.evaluate(() => { for (const id of ['roomsBox']) if (document.getElementById(id).open) document.getElementById(id).close(); }); await page.evaluate(n => window.wee.openTemplate(n), name); };
  await pick('Overshoot'); await pick('Short fuse');
  check('an untouched template is left without asking about unsaved changes', !asked.length && (await page.evaluate(() => window.wee.getLevel().w)) === 8, JSON.stringify(asked));
  await pickTool(page, 'wall');
  const box = await page.locator('#game').boundingBox();
  await page.mouse.click(box.x + 6.5 * box.width / 8, box.y + 3.5 * box.height / 8);
  await pick('Overshoot');
  check('an edited template still asks before it is left', asked.length === 1 && (await page.evaluate(() => window.wee.getLevel().w)) === 8, JSON.stringify(asked));
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the roster smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
