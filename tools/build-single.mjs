// Builds dist/wee.html: the whole app in one file that opens from disk or a phone.
// Starts at the entry module, follows its imports, and wraps each module in its own
// scope, so modules may share private names. Refuses an import cycle, a missing
// export, a default export and an exported `let` (a snapshot cannot follow it).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const ENTRY = 'src/app/main.js';
const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*'([^']+)';\s*$/gm;

export function bundle(entry = ENTRY) {
  const mods = new Map(); // path -> { id, imports, names, body }
  const order = [], visiting = new Set();
  const load = (path, from) => {
    if (mods.has(path)) return;
    if (visiting.has(path)) throw new Error(`import cycle: ${[...visiting, path].join(' -> ')}`);
    if (!existsSync(path)) throw new Error(`${from} imports ${path}, which does not exist`);
    visiting.add(path);
    const src = readFileSync(path, 'utf8');
    const imports = [...src.matchAll(IMPORT)].map(m => ({
      from: normalize(join(dirname(path), m[2])).replace(/\\/g, '/'),
      names: m[1].split(',').map(s => s.trim()).filter(Boolean).map(s => { const [a, b] = s.split(/\s+as\s+/); return { name: a, as: b || a }; }),
    }));
    for (const im of imports) load(im.from, path);
    let body = src.replace(IMPORT, '');
    if (/^export\s+(default|\{|\*)/m.test(body)) throw new Error(`${path}: only 'export const|function' is supported`);
    if (/^export\s+let\b/m.test(body)) throw new Error(`${path}: an exported let would be copied, not shared`);
    if (/^\s*import\b/m.test(body)) throw new Error(`${path}: an import the bundler cannot read`);
    const names = [...body.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
    body = body.replace(/^export\s+/gm, '');
    visiting.delete(path);
    mods.set(path, { id: `m${mods.size}`, imports, names, body });
    order.push(path);
  };
  load(entry, 'the entry');
  for (const [path, m] of mods)
    for (const im of m.imports)
      for (const { name } of im.names)
        if (!mods.get(im.from).names.includes(name)) throw new Error(`${path} imports ${name} from ${im.from}, which does not export it`);
  return order.map(path => {
    const m = mods.get(path);
    const pull = m.imports.map(im => `const { ${im.names.map(n => n.name === n.as ? n.name : `${n.name}: ${n.as}`).join(', ')} } = ${mods.get(im.from).id};`).join('\n');
    return `// ---- ${path}\nconst ${m.id} = (() => {\n${pull}\n${m.body.trim()}\nreturn { ${m.names.join(', ')} };\n})();`;
  }).join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('build-single.mjs')) {
  const sample = JSON.parse(readFileSync('rooms/sample.wee', 'utf8'));
  if (readFileSync('src/level/sample.js', 'utf8').indexOf(JSON.stringify(sample)) < 0)
    throw new Error('src/level/sample.js is out of step with rooms/sample.wee');
  const js = bundle();
  const html = readFileSync('index.html', 'utf8')
    .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${readFileSync('style.css', 'utf8')}</style>`)
    .replace(`<script type="module" src="${ENTRY}"></script>`, () => `<script type="module">\n${js}\n</script>`);
  if (!html.includes('const m0 = ')) throw new Error('index.html no longer loads ' + ENTRY);
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/wee.html', html);
  console.log(`dist/wee.html ${(html.length / 1024).toFixed(0)} KB`);
}
