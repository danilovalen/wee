// Navigation (register 359): every screen is a place with an address, so the browser's Back, Escape,
// a reload and a link all land where they should, and the logo is the menu. docs/NAVIGATION.md.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite, pickTool } from './lib.mjs';

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
  await pickTool(page, 'wall').catch(() => {});
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
  await page.evaluate(() => document.getElementById('menuMaker').click()); await page.check('#makerPal tr[data-el="door"] [data-in]');
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
  check('the Sandbox opens on its Rooms page, at #/rooms/start', (await at()).hash === '#/rooms/start' && (await at()).open === 'roomsBox');
  check('a fresh Sandbox asks nothing', asked.length === 0, asked.join(' | '));
  // Its first screen has one way back, Menu, and Escape goes there too (register 395).
  check('the first Sandbox screen has Menu and no Close', await page.locator('#roomsMenu').isVisible() && await page.locator('#roomsClose').isHidden());
  await page.keyboard.press('Escape'); await settle();
  check('Escape on the first Sandbox screen goes to the menu, not the editor', (await at()).open === 'menuBox', JSON.stringify(await at()));
  await page.click('#menuSandbox'); await settle();
  await page.click('#roomNew'); await settle();
  check('a new room from the first screen lands in the room', (await at()).hash === '#/room' && (await at()).open === '', JSON.stringify(await at()));
  await page.evaluate(() => document.getElementById('roomsBtn').click()); await settle();
  check('from the room, the Rooms page has Close and no Menu (register 399)', await page.locator('#roomsClose').isVisible() && await page.locator('#roomsMenu').isHidden());
  await page.click('#roomsBox .roomsHead form button'); await settle();
  check('Close on the Rooms page goes to the room', (await at()).hash === '#/room' && (await at()).open === '');
  await page.evaluate(() => document.getElementById('roomsBtn').click()); await settle();
  await page.keyboard.press('Escape'); await settle();
  check('Escape on the Rooms page goes to the room', (await at()).hash === '#/room' && (await at()).open === '');
  // A page closed and reopened before its late close event lands stays open (the race register 364 found).
  await page.evaluate(() => { document.getElementById('roomsBtn').click(); });
  await settle();
  await page.evaluate(() => { document.getElementById('roomsBox').close(); document.getElementById('roomsBtn').click(); });
  await settle();
  check('a page reopened before its close event lands stays open', (await at()).open === 'roomsBox' && (await at()).hash === '#/rooms', JSON.stringify(await at()));
  await page.click('#roomsBox .roomsHead form button'); await settle();
  await page.reload(); await page.waitForTimeout(900);
  check('a reload in the room stays in the room', (await at()).hash === '#/room' && (await at()).open === '');
  // Opening a template from a fresh Sandbox asks nothing: nothing has changed.
  await page.evaluate(() => document.getElementById('roomsBtn').click()); await settle();
  const hex = page.locator('#roomList .example .roomRow', { hasText: 'Hex counter' });
  check('the example ends the room list (register 399)', await hex.count() === 1);
  if (await hex.count()) { await hex.click(); await settle(); }
  check('the example opens under its own name, unsaved (register 409)', (await page.textContent('#roomTitle')).includes('Hex counter'), await page.textContent('#roomTitle'));
  check('opening an example from an untouched room asks nothing and lands in the room', asked.length === 0 && (await at()).hash === '#/room', asked.join(' | '));
  // A link to a place opens it; a link to a level that does not exist falls back to its list.
  await page.goto(B + '#/levels'); await settle();
  check('a link to #/levels opens the list', (await at()).open === 'campBox');
  await page.goto(B + '#/level/nope'); await settle();
  check('a link to a missing level falls back to the list', (await at()).hash === '#/levels' && (await at()).open === 'campBox');
  // A preview frame (the app's file viewer) cannot change its address: the game still starts on the
  // menu and every way back still works, from entries the router keeps itself.
  const html = await (await fetch(B + 'dist/wee.html')).text().catch(() => '');
  if (html) {
    const fp = await browser.newPage({ viewport: { width: 393, height: 873 } });
    const ferr = []; fp.on('pageerror', e => ferr.push(e.message));
    await fp.setContent('<iframe sandbox="allow-scripts allow-modals" style="width:393px;height:860px;border:0"></iframe>');
    await fp.$eval('iframe', (f, h) => { f.srcdoc = h; }, html); await fp.waitForTimeout(1200);
    const f = fp.frames()[1], fat = () => f.evaluate(() => [...document.querySelectorAll('dialog[open]')].map(d => d.id).join());
    check('in a preview frame the game starts on the menu', await fat() === 'menuBox', ferr.join(' | '));
    await f.click('#menuCampaign'); await f.click('#campList button[data-level="1"]'); await fp.waitForTimeout(300);
    await f.click('#campBack'); await fp.waitForTimeout(300);
    const list = await fat();
    await f.press('#campList button', 'Escape'); await fp.waitForTimeout(300);
    check('in a preview frame, Levels and Escape step back through the router\'s own entries', list === 'campBox' && await fat() === 'menuBox', list);
    await f.click('#menuCampaign'); await f.click('#campList button[data-level="1"]'); await fp.waitForTimeout(300);
    await f.click('#logo'); await fp.waitForTimeout(300);
    check('in a preview frame the logo goes to the menu', await fat() === 'menuBox' && ferr.length === 0, ferr.join(' | '));
    await fp.close();
  } else check('the built single file is served for the preview-frame check', false, 'run npm run build');
  // Register 424: the menu is where history starts, so Back from it leaves the game, never into a room.
  await page.goto('about:blank'); await page.goto(B); await settle();
  await page.click('#menuSandbox'); await settle(); await page.click('#roomNew'); await settle();
  await page.click('#logo'); await settle();
  check('the logo goes to the menu', (await at()).open === 'menuBox' && (await at()).hash === '#/');
  await page.goBack(); await settle();
  check('Back from the menu leaves the game, not into the editor', page.url() === 'about:blank', page.url());
  await page.goto(B); await settle();
  await page.click('#menuCampaign'); await settle(); await page.click('#campList button[data-level="2"]'); await settle();
  await page.click('#logo'); await settle(); await page.goBack(); await settle();
  check('from a level too, Back from the menu leaves the game', page.url() === 'about:blank', page.url());
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
done();
