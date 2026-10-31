// The game's own line icons (register 535): no emoji, drawn in the button's ink. A button keeps its word as
// its accessible name and tooltip, and in data-label for code that asks what it says.
const G = {
  levels: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
  run: '<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>',
  test: '<path d="M12 3.5l2.8 3.3H9.2zM12 20.5l2.8-3.3H9.2zM3.5 12l3.3-2.8v5.6zM20.5 12l-3.3-2.8v5.6z" fill="currentColor"/><circle cx="12" cy="12" r="2"/>',
  edit: '<path d="M5 19l1-4L15.5 5.5a2.1 2.1 0 0 1 3 3L9 18z"/><path d="M13.5 7.5l3 3"/>',
  undo: '<path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"/>',
  redo: '<path d="M15 7l4.5 4.5L15 16"/><path d="M19 11.5h-9a5 5 0 0 0 0 10h2"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4.5v4h4"/><rect x="10" y="10" width="4" height="4" rx=".8" fill="currentColor" stroke="none"/>',
  menu: '<path d="M5 7h14M5 12h14M5 17h14"/>',
  next: '<path d="M5 12h12"/><path d="M13 7l5 5-5 5"/>',
  skip: '<path d="M6 6l7 6-7 6z" fill="currentColor"/><path d="M17 6v12"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  cross: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4.5h11l-2.5 4 2.5 4H6" fill="currentColor" fill-opacity=".25"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.7-4.4 4 1.2 5.9L12 16.6l-5.3 2.9 1.2-5.9-4.4-4 5.9-.7z"/>',
};
export const glyph = key => `<svg class="glyph" viewBox="0 0 24 24" aria-hidden="true">${G[key]}</svg>`;

// Puts an icon on a button, its word kept as its name.
export function iconOn(el, key, label) {
  if (!el) return;
  if (el.dataset.icon !== key) { el.innerHTML = glyph(key); el.dataset.icon = key; }
  el.setAttribute('aria-label', label); el.title = label; el.dataset.label = label;
}

export function bindGlyphs() {
  const $ = id => document.getElementById(id);
  iconOn($('campBack'), 'levels', 'Levels'); iconOn($('campRun'), 'run', 'Run'); iconOn($('campTest'), 'test', 'Test: play it yourself');
  iconOn($('undo'), 'undo', 'Undo'); iconOn($('redo'), 'redo', 'Redo'); iconOn($('campReset'), 'reset', 'Clear the room');
  for (const id of ['campMenu', 'puzzleMenu', 'makerMenu', 'roomsMenu']) iconOn($(id), 'menu', 'Menu');
  iconOn($('tutSkip'), 'skip', 'Skip'); iconOn($('tutNext'), 'next', 'Next'); iconOn($('fitBtn'), 'fit', 'Show the whole room');
}
