// Writes src/level/templates.js from every rooms/*.wee, so the page carries them as
// read-only templates, and src/level/campaign.js from campaign/. Usage: node tools/templates.mjs
// (the build also checks both are current).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

export function templatesSource() {
  const rooms = readdirSync('rooms').filter(f => f.endsWith('.wee')).sort().map(f => {
    const level = JSON.parse(readFileSync('rooms/' + f, 'utf8'));
    const words = f.replace(/\.wee$/, '').replace(/-/g, ' ');
    return { name: level.name || words[0].toUpperCase() + words.slice(1), level };
  });
  return `// Generated from rooms/*.wee by tools/templates.mjs. Do not edit by hand.\nexport const TEMPLATES = ${JSON.stringify(rooms)};\n`;
}

// The campaign's levels, in number order; a named one (hidden, kept for later) comes after them.
export function campaignSource() {
  const levels = readdirSync('campaign/levels').filter(f => f.endsWith('.json'))
    .sort((a, b) => (parseInt(a) || 1e9) - (parseInt(b) || 1e9))
    .map(f => ({ id: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync('campaign/levels/' + f, 'utf8')) }));
  return `// Generated from campaign/ by tools/templates.mjs. Do not edit by hand.\nexport const LEVELS = ${JSON.stringify(levels)};\n`;
}

if (process.argv[1] && process.argv[1].endsWith('templates.mjs')) {
  writeFileSync('src/level/templates.js', templatesSource());
  writeFileSync('src/level/campaign.js', campaignSource());
  console.log('src/level/templates.js and src/level/campaign.js written');
}
