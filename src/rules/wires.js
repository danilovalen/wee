// Wires (register 347): an editor-made circuit under the tiles. A level lists them as
// wires: [{x, y, w}] in three colours; touching tiles of one colour form one network. When a run
// starts, each network becomes a colour of its own ('w0', 'w1'...), so the door rules need nothing new:
// a grey ('wire') piece reads only the networks on its tile, and any switch also powers them.
export const WIRES = ['teal', 'violet', 'charcoal'];
const NONE = 'wnone';

// The networks on each tile, by index, and each wire's own: { at: [[ids]], of: {'teal:index': id}, ids }.
export function netsOf(level) {
  const { w, h } = level, at = Array.from({ length: w * h }, () => []), ids = [], of = {};
  const by = new Map((level.wires || []).map(r => [`${r.w}:${r.y * w + r.x}`, r]));
  const seen = new Set();
  for (const r of level.wires || []) {
    const start = `${r.w}:${r.y * w + r.x}`;
    if (seen.has(start)) continue;
    const id = 'w' + ids.length; ids.push(id);
    const todo = [r]; seen.add(start);
    while (todo.length) {
      const c = todo.pop(); at[c.y * w + c.x].push(id); of[`${c.w}:${c.y * w + c.x}`] = id;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const x = c.x + dx, y = c.y + dy, k = `${c.w}:${y * w + x}`;
        if (x < 0 || y < 0 || x >= w || y >= h || seen.has(k) || !by.has(k)) continue;
        seen.add(k); todo.push(by.get(k));
      }
    }
  }
  return { at, of, ids };
}

const SWITCH = /^(button|toggle|receiver|sensor):/;
// The cells a run plays with: a grey piece takes its tile's networks as its colours, and a switch of
// any colour adds them to its own. A grey piece on no wire reads a network that never opens.
export function wireCells(cells, at) {
  return cells.map((c, i) => {
    const [kind, col] = c.split(':');
    if (col === 'wire') return kind + ':' + (at[i].length ? at[i].join('|') : NONE);
    if (at[i].length && SWITCH.test(c)) return c + '|' + at[i].join('|');
    return c;
  });
}

// A drawn piece: its real colours, or 'wire' when it has none, and whether its networks are open.
export function drawnColour(cols, open) {
  const real = cols.filter(c => !/^w(\d+|none)$/.test(c));
  return real.length ? { cols: real } : { cols: ['wire'], on: cols.some(c => open && open[c]) };
}
