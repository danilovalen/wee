// Wires in the Sandbox (register 347): the Wire tool lays a wire by dragging, its dots become the
// three wire colours, the grey dot places a grey door, and the counter room counts on screen.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('wires');
const PORT = 5229;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
try {
  await page.goto(`http://localhost:${PORT}/`); await page.waitForTimeout(400);
  await page.click('#menuSandbox'); await page.waitForTimeout(400); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.evaluate(() => { const l = window.wee.blank(6, 5); l.start = { x: 0, y: 0 }; window.wee.loadLevel(l); });
  await page.click('#palette [data-tool="wire"]');
  const dots = await page.evaluate(() => [...document.querySelectorAll('[data-camp-wire]')].filter(b => b.offsetParent).map(b => b.dataset.campWire).join());
  check('with the Wire tool, the dots are the three wire colours', dots === 'teal,violet,charcoal', dots);
  await page.click('[data-camp-wire="violet"]');
  const box = await page.locator('#game').boundingBox(), w = (await page.evaluate(() => window.wee.getLevel())).w, t = box.width / w;
  const at = (x, y) => [box.x + (x + 0.5) * t, box.y + (y + 0.5) * t];
  await page.mouse.move(...at(1, 2)); await page.mouse.down(); for (let x = 2; x <= 4; x++) await page.mouse.move(...at(x, 2), { steps: 3 }); await page.mouse.up();
  const wires = await page.evaluate(() => window.wee.getLevel().wires || []);
  check('dragging lays a wire of the chosen colour on every tile crossed', wires.length === 4 && wires.every(r => r.w === 'violet' && r.y === 2), JSON.stringify(wires));
  await page.click('#palette [data-tool="door"]'); await page.click('[data-camp-colour="wire"]'); await page.mouse.click(...at(4, 2));
  check('the grey dot places a grey door', await page.evaluate(() => window.wee.getLevel().cells[2 * 6 + 4]) === 'door:wire');
  // The counter room, played: it shows a count that moves on.
  const room = JSON.parse(readFileSync('rooms/4-bit-counter.wee', 'utf8'));
  await page.evaluate(l => { window.wee.loadLevel(l); window.wee.setMode('play'); }, room);
  const lit = () => page.evaluate(() => JSON.parse(window.renderGameToText()).open.join());
  const a = await lit(); await page.waitForTimeout(2500); const b = await lit();
  check('the counter room runs on screen: its bit colours change', a !== b, `${a} | ${b}`);
  check('no page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close(); server.close();
}
done();
