// A named list of checks that ends on one 'N/M passed' line. Imports nothing from src,
// so a broken source tree still gets a readable report.
export function suite(name) {
  const results = [];
  const check = (label, cond, detail = '') => {
    results.push(!!cond);
    if (!cond) console.log(`FAIL ${name}: ${label}${detail ? ' :: ' + detail : ''}`);
  };
  const done = () => {
    const ok = results.filter(Boolean).length;
    console.log(`${name}: ${ok}/${results.length} passed`);
    if (results.length === 0) { console.log('FAIL: checked nothing'); process.exit(1); }
    process.exit(ok === results.length ? 0 : 1);
  };
  return { check, done };
}
