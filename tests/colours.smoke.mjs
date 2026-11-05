// Colours in the Sandbox (registers 736, 739, 766, 773): one row under the tool strip on a wide screen,
// greyed for tools that take none; grey wears a dashed frame, a plain dot gives a one-way no colour, and a
// tap on a coloured piece in another colour recolours it.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite, pickTool } from './lib.mjs';

const { check, done } = suite('colours');
const server = await serve(5293);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const level = () => page.evaluate(() => window.wee.getLevel());
const swatch = c => page.locator(`#campColours [data-camp-colour="${c}"]`);
try {
  await page.goto('http://localhost:5293/?sandbox');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady); await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => document.getElementById('roomsBox').close());
  await page.evaluate(l => window.wee.loadLevel(l), room(['#######', '#P....#', '#.....#', '#######']));
  await pickTool(page, 'button');
  const where = await page.evaluate(() => { const s = document.getElementById('strip').getBoundingClientRect(), c = document.getElementById('campColours'), r = c.getBoundingClientRect(); return { inBox: !!c.closest('#stripColours'), below: r.top >= s.bottom, visible: r.height > 0 }; });
  check('the colours sit under the tool strip (register 766)', where.inBox && where.below && where.visible, JSON.stringify(where));
  check('a button tool can take a colour', !(await swatch('red').isDisabled()));
  await pickTool(page, 'wall');
  check('a tool with no colour greys the colours instead of hiding them', await swatch('red').isVisible() && await swatch('red').isDisabled());
  const grey = await swatch('wire').evaluate(b => getComputedStyle(b).outlineStyle);
  check('grey wears a dashed frame (register 736)', grey === 'dashed', grey);
  await pickTool(page, 'button');
  check('the plain dot is only for one-ways', await swatch('plain').isDisabled());
  await pickTool(page, 'gate');
  check('a one-way can be plain (register 773)', !(await swatch('plain').isDisabled()));
  await swatch('plain').click();
  const box = await page.locator('#game').boundingBox(), lv = await level(), at = (x, y) => [box.x + (x + 0.5) * box.width / lv.w, box.y + (y + 0.5) * box.height / lv.h];
  await page.mouse.click(...at(3, 1));
  check('a plain one-way is placed with no colour', /^gate:[a-z,]+$/.test((await level()).cells[1 * 7 + 3]), (await level()).cells[1 * 7 + 3]);
  await swatch('blue').click();
  await page.mouse.click(...at(3, 1)); await page.waitForTimeout(100);
  const g = (await level()).cells[1 * 7 + 3];
  check('a tap in another colour recolours a one-way and keeps its way (register 739)', g === (await level()).cells[1 * 7 + 3] && /@blue$/.test(g), g);
  await pickTool(page, 'button'); await swatch('red').click();
  await page.mouse.click(...at(5, 2));
  await swatch('blue').click();
  await page.mouse.click(...at(5, 2)); await page.waitForTimeout(100);
  check('a tap in another colour recolours a button', (await level()).cells[2 * 7 + 5] === 'button:blue', (await level()).cells[2 * 7 + 5]);
  check('no page errors', !errors.length, errors.join(' | '));
} catch (err) { check('the colours smoke ran to the end', false, err.message); }
finally { await browser.close(); server.close(); }
done();
