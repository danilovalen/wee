// Colour pairs that touch inside a sprite but differ in hue at nearly the same lightness (register 811): a
// shade or an edge must read by lightness, not by hue. Usage: node tools/clashProbe.mjs [palette]
import { chromium } from 'playwright-core';
import { serve } from './serve.mjs';
const PORT = 5391, pal = process.argv[2] || 'neon';
const server = await serve(PORT);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
const p = await b.newPage();
await p.addInitScript(v => { try { localStorage.setItem('wee.look', JSON.stringify({ palette: v, skins: {} })); } catch {} }, pal);
await p.goto(`http://localhost:${PORT}/index.html`); await p.waitForTimeout(800);
const out = await p.evaluate(async () => {
  const { drawSprite, SPRITES } = await import('/src/view/sprites.js');
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const hue = ([r, g, b]) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 40) return -1; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
  const hex = c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const res = [];
  for (const name of SPRITES) {
    const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
    try { drawSprite(g, name, 0, 0, { exact: true }); } catch { continue; }
    const d = g.getImageData(0, 0, 32, 32).data, px = (x, y) => { const i = (y * 32 + x) * 4; return d[i + 3] > 200 ? [d[i], d[i + 1], d[i + 2]] : null; };
    const seen = new Map();
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const a = px(x, y), q = x + dx < 32 && y + dy < 32 ? px(x + dx, y + dy) : null; if (!a || !q || hex(a) === hex(q)) continue;
      const ha = hue(a), hq = hue(q); if (ha < 0 || hq < 0) continue;
      const dh = Math.min(Math.abs(ha - hq), 360 - Math.abs(ha - hq)); if (dh < 45) continue;
      const la = L(a), lq = L(q), ratio = (Math.max(la, lq) + 0.05) / (Math.min(la, lq) + 0.05);
      if (ratio < 1.5) { const k = [hex(a), hex(q)].sort().join(' ~ '); seen.set(k, (seen.get(k) || 0) + 1); }
    }
    for (const [k, n] of seen) if (n >= 3) res.push(`${name}: ${k} (${n} edges)`);
  }
  return res;
});
console.log(`${pal}: ${out.length} clashing pairs\n` + out.join('\n'));
await b.close(); server.close();
