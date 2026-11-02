// Every mutant in tools/mutate.mjs still finds its text and names a test that exists: a stale
// mutant breaks nothing and protects nothing (register 608).
import { M } from '../tools/mutate.mjs';
import { locate, testFile } from '../tools/mutantLocate.mjs';
import { suite } from './suite.mjs';

const { check, done } = suite('mutants');
check('the list holds mutants', M.length > 0, String(M.length));
const stale = M.filter(([where, from]) => !locate(where, from)).map(([where, from]) => `${where}: ${from.slice(0, 60)}`);
check('every mutant finds its text, in one file', stale.length === 0, `${stale.length} stale: ${stale.join(' || ')}`);
const lost = [...new Set(M.map(m => m[3]).filter(t => !testFile(t)))];
check('every mutant names a test file that exists', lost.length === 0, lost.join(' '));
// The finder itself: text that is nowhere, or in two source files, is stale.
check('text found nowhere is stale', locate('src', 'no source file holds this text 608') === null && locate('index.html', 'no source file holds this text 608') === null);
check('text in two source files is stale', locate('src', 'export function') === null);
done();
