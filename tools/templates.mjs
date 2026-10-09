// Writes src/level/templates.js from every rooms/*.wee, so the page carries them as
// read-only templates. Usage: node tools/templates.mjs (the build also checks it is current).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

export function templatesSource() {
  const rooms = readdirSync('rooms').filter(f => f.endsWith('.wee')).sort().map(f => {
    const level = JSON.parse(readFileSync('rooms/' + f, 'utf8'));
    const words = f.replace(/\.wee$/, '').replace(/-/g, ' ');
    return { name: level.name || words[0].toUpperCase() + words.slice(1), level };
  });
  return `// Generated from rooms/*.wee by tools/templates.mjs. Do not edit by hand.\nexport const TEMPLATES = ${JSON.stringify(rooms)};\n`;
}

if (process.argv[1] && process.argv[1].endsWith('templates.mjs')) {
  writeFileSync('src/level/templates.js', templatesSource());
  console.log('src/level/templates.js written');
}
