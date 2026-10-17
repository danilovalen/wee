// The band a resize drag draws never outlives the drag: if the release never arrives (some
// phone webviews lose it), the next press anywhere clears it, and a release off the grip ends it.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { suite } from './lib.mjs';

const { check, done } = suite('size-band');
const server = await serve(5237);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
const shown = () => page.$$eval('.sizeBand', bs => bs.filter(b => !b.hidden).length);
try {
  await page.goto('http://localhost:5237/?sandbox');
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close(); });
  const grip = await page.locator('[data-plus="right"]').boundingBox();
  const at = [grip.x + grip.width / 2, grip.y + grip.height / 2];
  // A drag inward whose release is lost: down and moves on the grip, no up anywhere.
  await page.evaluate(([x, y]) => {
    const b = document.querySelector('[data-plus="right"]'), o = { pointerId: 7, bubbles: true, isPrimary: true, pointerType: 'touch' };
    b.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: x, clientY: y }));
    for (let i = 1; i <= 6; i++) b.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x - i * 20, clientY: y }));
  }, at);
  check('a drag draws its band', (await shown()) === 1);
  await page.evaluate(() => document.getElementById('game').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 9, bubbles: true, clientX: 30, clientY: 120 })));
  check('a press anywhere else clears a band whose release never came', (await shown()) === 0);
  // A release heard only by the window still ends the drag and clears the band.
  await page.evaluate(([x, y]) => {
    const b = document.querySelector('[data-plus="right"]'), o = { pointerId: 8, bubbles: true, isPrimary: true, pointerType: 'touch' };
    b.dispatchEvent(new PointerEvent('pointerdown', { ...o, clientX: x, clientY: y }));
    for (let i = 1; i <= 6; i++) b.dispatchEvent(new PointerEvent('pointermove', { ...o, clientX: x - i * 20, clientY: y }));
    document.body.dispatchEvent(new PointerEvent('pointerup', { ...o, clientX: x - 120, clientY: y }));
  }, at);
  check('a release off the grip ends the drag', (await shown()) === 0);
} finally {
  await browser.close();
  server.close();
}
done();
