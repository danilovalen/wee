import { chromium } from '/home/user/wee/node_modules/playwright-core/index.mjs';
import { serve } from '/home/user/wee/tools/serve.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = process.cwd(); process.chdir('/home/user/wee');
mkdirSync(OUT + '/cards2', { recursive: true });
await serve(5296);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
await p.addInitScript(() => { window.__noTutorial = true; window.__x = 1; });
await p.addInitScript(() => { const L = {}; const opt = { 1: ['touchBlockFourTimes'], 2: ['throughOpenDoorTwice','everySwitchFlipsTwice'], 3: ['hitsClosedDoorTwice'], 4: [], 5: ['boxHitsBox'], 6: ['aToggleOffAtEnd','twoSwitches'], 7: ['boxOnButtonAtEnd'], 8: [] };
  for (let i = 1; i <= 8; i++) L[i] = { beaten: true, goals: Object.fromEntries(opt[i].map(g => [g, true])) };
  L.tutorial = { beaten: true }; L.p1 = { beaten: true, moves: 9 }; L.p2 = { beaten: true, moves: 12, goals: { fewest: true } }; L.p3 = { beaten: true, moves: 7 };
  localStorage.setItem('wee.campaign', JSON.stringify({ last: '9', levels: L, v: 4 })); });
await p.goto('http://localhost:5296/#/levels'); await p.waitForTimeout(2500);
await p.addStyleTag({ content: '.campList li.main::after, .campList li.side::before { display:none !important } *:focus, *:focus-visible { outline: none !important; } #campList li.main { width: 162px; }' });
await p.evaluate(() => document.activeElement && document.activeElement.blur());
const rows = await p.evaluate(() => [...document.querySelectorAll('#campList > li')].map(li => ({ cls: li.className, cards: [...li.querySelectorAll('.campRow')].map(c => ({ id: c.dataset.level || '', text: c.innerText.split('\n')[0] })) })));
const out = [];
const els = await p.$$('#campList > li');
for (let i = 0; i < els.length; i++) {
  const cs = await els[i].$$('.campRow');
  for (let j = 0; j < cs.length; j++) {
    const f = 'cards2/' + i + '-' + j + '.png';
    await cs[j].screenshot({ path: OUT + '/' + f });
    out.push({ row: i, j, f, cls: rows[i].cls, ...rows[i].cards[j] });
  }
}
writeFileSync(OUT + '/cards2-list.json', JSON.stringify(out));
console.log(out.map(o => o.row + ':' + o.cls + ':' + o.text).join(' | '));
await b.close(); process.exit(0);
