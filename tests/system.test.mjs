// The design system (register 915): every type size, icon size and button height on every screen comes from a
// token in :root, so changing one value there changes it everywhere. Nothing else may write a size of its own.
import { readFileSync } from 'node:fs';
import { suite } from './suite.mjs';

const { check, done } = suite('system');
const css = readFileSync('style.css', 'utf8'), root = (css.match(/^:root \{([^}]*)\}/m) || [])[1] || '';
const rest = css.slice(css.indexOf('}', css.indexOf(':root {')) + 1).replace(/\/\*[\s\S]*?\*\//g, '');
const TOKENS = ['--t-s', '--t-m', '--t-l', '--btn-s', '--btn-m', '--mark', '--icon', '--icon-l', '--head-h'];
check('the system\'s tokens are declared once, in :root', TOKENS.every(t => new RegExp(`${t}:`).test(root)) && TOKENS.every(t => !new RegExp(`(?<![-\\w])${t}:`).test(rest)), TOKENS.filter(t => !new RegExp(`${t}:`).test(root) || new RegExp(`(?<![-\\w])${t}:`).test(rest)).join());
// A size is a number with a unit that is not inside a var()'s fallback.
const sized = v => /(?<![\w.(,-])[0-9.]+(px|em|rem)\b/.test(v.replace(/var\([^()]*\)/g, ''));
const rules = [...rest.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => [m[1].trim(), m[2]]);
// The title's big letters are drawn, not typed: its 64 px only reserves room and is the one size allowed.
const ALLOWED = ['.menu .menuLogo'];
const typed = rules.flatMap(([sel, d]) => [...d.matchAll(/(?<![-\w])font(-size)?:\s*([^;]+)/g)].filter(m => sized(m[2].replace(/\/\s*[0-9.]+/, '')) && !/^0\b/.test(m[2].trim()) && !ALLOWED.includes(sel)).map(m => `${sel} { ${m[0]} }`));
check('no type size is written outside the tokens', !typed.length, typed.slice(0, 6).join(' | '));
const icons = rules.filter(([sel]) => /\.glyph/.test(sel)).flatMap(([sel, d]) => [...d.matchAll(/(?<![-\w])(width|height):\s*([^;]+)/g)].filter(m => sized(m[2])).map(m => `${sel} { ${m[0]} }`));
check('no icon size is written outside the tokens', !icons.length, icons.slice(0, 6).join(' | '));
done();
