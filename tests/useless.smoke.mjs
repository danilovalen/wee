// No control that would do nothing is left clickable: in each state, every visible, enabled
// button in the header, the status bar and the play pad must change something when clicked
// (the room, the run, what is on screen, an open page, or the clipboard). A picked option is
// exempt: it shows a choice, and picking it again is how such controls read everywhere.
import { chromium } from 'playwright-core';
import { serve } from '../tools/serve.mjs';
import { room, suite } from './lib.mjs';

const { check, done } = suite('useless');
const PORT = 5217;
const server = await serve(PORT);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const goalRoom = room(['#######', '#P....#', '#.....#', '#######']); goalRoom.cells[2 * 7 + 5] = 'goal';
const noStart = { ...goalRoom, start: null };

// What a click could change, with the clock stopped (a run moves on its own) and the clicked
// control itself left out (its own look changing is not an effect).
const look = id => page.evaluate(id => {
  window.advanceTime(300);
  const me = document.getElementById(id), own = me ? me.innerText : '';
  return JSON.stringify({
    game: (({ tick, worldSteps, ...rest }) => JSON.stringify(rest))(JSON.parse(window.renderGameToText())),
    open: [...document.querySelectorAll('dialog, #sizePop, #well, #keysBox, #win')].filter(d => d.open || (d.getClientRects().length && !d.hidden)).map(d => d.id),
    text: document.body.innerText.split(own).join(''),
    pressed: [...document.querySelectorAll('[aria-pressed], [aria-expanded]')].filter(e => e !== me).map(e => e.getAttribute('aria-pressed') + e.getAttribute('aria-expanded')).join(),
    copied: window.__copied,
  });
}, id);
const SCENES = {
  editing: async () => { await page.evaluate(l => window.wee.loadLevel(l), goalRoom); },
  playing: async () => { await page.evaluate(l => window.wee.loadLevel(l), goalRoom); await page.keyboard.press('e'); },
  // On a checkpoint, Reset would put you right where you stand.
  'on a checkpoint': async () => {
    const l = JSON.parse(JSON.stringify(goalRoom)); l.cells[2 * 7 + 1] = 'checkpoint';
    await page.evaluate(l => window.wee.loadLevel(l), l); await page.keyboard.press('e');
    await page.keyboard.press('ArrowDown'); await page.evaluate(() => window.advanceTime(1500));
  },
  'no start': async () => { await page.evaluate(l => window.wee.loadLevel(l), noStart); },
};
const boot = async scene => {
  await page.goto(`http://localhost:${PORT}/?sandbox=full`);
  await page.waitForFunction(() => window.wee && window.wee.roomsReady);
  await page.evaluate(() => window.wee.roomsReady);
  await page.evaluate(() => { document.getElementById('roomsBox').close(); window.__copied = 0; navigator.clipboard.writeText = async () => { window.__copied++; }; window.__manualClock = true; });
  await SCENES[scene]();
  // Background work (the live check, the stuck watch) settles first, so a change is the click's.
  for (let i = 0, a = await look(''), same = 0; i < 30 && same < 3; i++) { await page.waitForTimeout(250); const b = await look(''); same = a === b ? same + 1 : 0; a = b; }
};
const SCOPE = 'header button, #statusBar button, #pad button';
const live = () => page.$$eval(SCOPE, bs => bs.filter(b => b.offsetParent && !b.disabled && !(b.classList.contains('on') && !b.hasAttribute('aria-pressed'))).map(b => b.id || b.textContent.trim()));


try {
  for (const scene of Object.keys(SCENES)) {
    await boot(scene);
    const ids = await live(), idle = [];
    for (const id of ids) {
      await boot(scene);
      const before = await look(id);
      const target = page.locator(SCOPE).filter({ has: page.locator(':scope') }).and(page.locator(`[id="${id}"]`).or(page.getByRole('button', { name: id, exact: true })));
      await target.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(250);
      const after = await look(id);
      if (after === before) idle.push(id);
    }
    check(`${scene}: every clickable control in the bars does something (${ids.length} tried)`, ids.length > 2 && !idle.length, idle.join(', '));
  }
  // The other way round: a greyed-out Reset would have done something.
  await boot('editing');
  const pushRoom = room(['#######', '#PB...#', '#.....#', '#######']); pushRoom.cells[1 * 7 + 4] = 'checkpoint';
  await page.evaluate(l => window.wee.loadLevel(l), pushRoom); await page.keyboard.press('e');
  await page.keyboard.press('ArrowRight'); await page.evaluate(() => window.advanceTime(1500));
  check('on a checkpoint with a box pushed away, Reset is offered, since it puts the box back', JSON.parse(await page.evaluate(() => window.renderGameToText())).checkpoint.x === 4 && !(await page.locator('#respawnBtn').isDisabled()), await page.evaluate(() => window.renderGameToText()));
  await boot('playing');
  check('playing: every control that works on the room being edited is greyed out', await page.$$eval('[data-edit]', bs => bs.length >= 4 && bs.every(b => b.disabled)));
  await boot('editing');
  check('editing: none of them is', await page.$$eval('[data-edit]', bs => bs.every(b => !b.disabled)));
  check('no page errors', !errors.length, errors.join(' | '));
} finally {
  await browser.close(); server.close();
}
done();
