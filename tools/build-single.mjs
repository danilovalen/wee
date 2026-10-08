// Builds dist/wee.html: the whole app in one file that opens from disk or a phone.
// Modules are concatenated in dependency order with imports and exports stripped,
// so a top-level name defined twice would shadow silently; the build refuses that.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ORDER = ['src/sim.js', 'src/sample.js', 'src/render.js', 'src/main.js'];
const sample = JSON.parse(readFileSync('rooms/sample.wee', 'utf8'));
if (readFileSync('src/sample.js', 'utf8').indexOf(JSON.stringify(sample)) < 0)
  throw new Error('src/sample.js is out of step with rooms/sample.wee');

const seen = new Map();
const parts = ORDER.map(f => {
  const src = readFileSync(f, 'utf8')
    .replace(/^import [^;]+;\n/gm, '')
    .replace(/^export (const|function|let)/gm, '$1');
  for (const m of src.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (seen.has(m[1])) throw new Error(`${m[1]} is defined in both ${seen.get(m[1])} and ${f}`);
    seen.set(m[1], f);
  }
  if (/^\s*(import|export)\b/m.test(src)) throw new Error(`${f} still has an import or export`);
  return `// ---- ${f}\n${src}`;
});

const html = readFileSync('index.html', 'utf8')
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${readFileSync('style.css', 'utf8')}</style>`)
  .replace('<script type="module" src="src/main.js"></script>', () => `<script type="module">\n${parts.join('\n')}</script>`);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/wee.html', html);
console.log(`dist/wee.html ${(html.length / 1024).toFixed(0)} KB`);
