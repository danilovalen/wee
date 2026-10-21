// Navigation (register 359): every screen is a place with an address, so the browser's Back, Escape,
// a reload and a link all land where they should, and the logo is the menu. docs/NAVIGATION.md.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('nav');
const server = await serve(5243);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 393, height: 873 }, isMobile: true, hasTouch: true });
const errors = [], asked = [];
page.on('pageerror', e => errors.push(e.message));
page.on('dialog', d => { asked.push(d.message()); d.accept(); });
const B = 'http://localhost:5243/';
const at = () => page.evaluate(() => ({ open: [...document.querySelectorAll('dialog[open]')].map(d => d.id).join(), hash: location.hash, camp: document.body.classList.contains('campaign') }));
const settle = () => page.waitForTimeout(300);
try {
  await page.goto(B); await settle();
  check('the game opens on the menu, at #/', (await at()).open === 'menuBox' && (await at()).hash === '#/');
  await page.keyboard.press('Escape'); await settle();
  check('Escape on the menu leaves the menu open', (await at()).open === 'menuBox');
  await page.click('#menuCampaign'); await settle();
  await page.keyboard.press('Escape'); await settle();
  check('Escape on the Levels list goes up to the menu, never into the screen behind', (await at()).open === 'menuBox');
  await page.click('#menuCampaign'); await page.click('#campList button[data-level="2"]'); await settle();
  let a = await at();
  check('a level has its own address', a.hash === '#/level/2' && a.camp && a.open === '');
  await page.goBack(); await settle(); a = await at();
  check('Back from a level goes to the Levels list', a.hash === '#/levels' && a.open === 'campBox' && !a.camp);
  await page.goBack(); await settle();
  check('Back again goes to the menu, not out of the game', (await at()).open === 'menuBox' && page.url().startsWith(B));
  await page.goForward(); await page.goForward(); await settle();
  check('Forward comes back into the level', (await at()).hash === '#/level/2');
  // A reload keeps the level and what was placed in it (ruling 3).
  await page.click('[data-tool="wall"]').catch(() => {});
  const before = await page.evaluate(() => JSON.stringify(window.wee.getLevel().cells));
  await page.mouse.click(200, 400); await page.waitForTimeout(300);
  const placed = await page.evaluate(() => JSON.stringify(window.wee.getLevel().cells));
  await page.reload(); await page.waitForTimeout(600); a = await at();
  const after = await page.evaluate(() => JSON.stringify(window.wee.getLevel().cells));
  check('a reload inside a level lands in that level', a.hash === '#/level/2' && a.camp && a.open === '');
  check('a reload keeps what was placed in the level', placed !== before && after === placed);
  await page.click('#campBack'); await settle();
  check('Levels after a reload (no history) still goes to the list', (await at()).open === 'campBox');
  // Ruling 1: Back goes where you came from, so a made level opened from the Maker goes back to it.
  await page.click('#campMenu'); await settle();
  await page.click('#menuMaker'); await page.check('#makerPal tr[data-el="door"] [data-in]');
  await page.selectOption('#makerGoals li[data-goal="throughOpenDoor"] select', 'require');
  await page.click('#makerBuild'); await settle();
  check('a made level has its address too', /^#\/level\/m\d+$/.test((await at()).hash));
  await page.click('#campBack'); await settle();
  check('Maker in a made level goes back to the Maker', (await at()).open === 'makerBox');
  // Ruling 2: the logo is the menu, one tap from a level.
  await page.goForward(); await settle();
  await page.click('#logo'); await settle();
  check('the logo goes to the menu from inside a level', (await at()).open === 'menuBox' && !(await at()).camp);
  check('the logo is on screen on a phone', await page.locator('#logo').isVisible());
  // The Sandbox: the Rooms page, the room, Close, Menu and a reload.
  await page.click('#menuSandbox'); await page.waitForTimeout(800);
  check('the Sandbox opens on its Rooms page, at #/rooms', (await at()).hash === '#/rooms' && (await at()).open === 'roomsBox');
  check('a fresh Sandbox asks nothing', asked.length === 0, asked.join(' | '));
  await page.click('#roomsBox .roomsHead form button'); await settle();
  check('Close on the Rooms page goes to the room', (await at()).hash === '#/room' && (await at()).open === '');
  await page.evaluate(() => document.getElementById('roomsBtn').click()); await settle();
  await page.keyboard.press('Escape'); await settle();
  check('Escape on the Rooms page goes to the room', (await at()).hash === '#/room' && (await at()).open === '');
  await page.reload(); await page.waitForTimeout(900);
  check('a reload in the room stays in the room', (await at()).hash === '#/room' && (await at()).open === '');
  // Opening a template from a fresh Sandbox asks nothing: nothing has changed.
  await page.evaluate(() => document.getElementById('roomsBtn').click()); await settle();
  await page.click('#exampleList button'); await settle();
  check('opening an example from an untouched room asks nothing and lands in the room', asked.length === 0 && (await at()).hash === '#/room', asked.join(' | '));
  // A link to a place opens it; a link to a level that does not exist falls back to its list.
  await page.goto(B + '#/levels'); await settle();
  check('a link to #/levels opens the list', (await at()).open === 'campBox');
  await page.goto(B + '#/level/nope'); await settle();
  check('a link to a missing level falls back to the list', (await at()).hash === '#/levels' && (await at()).open === 'campBox');
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
