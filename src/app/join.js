// A strip of buttons reads as one object (register 322): square seams inside, round only at its two
// ends. Which buttons are the ends depends on what shows, so they are marked again on every sync.
export function joinEnds() {
  const on = document.body.classList.contains('campaign') || document.body.classList.contains('simple');
  for (const strip of document.querySelectorAll('[data-join]')) {
    const kids = [...strip.children].filter(b => b.tagName === 'BUTTON');
    for (const b of kids) b.classList.remove('joinFirst', 'joinLast');
    const shown = on ? kids.filter(b => !b.hasAttribute('data-alone') && getComputedStyle(b).display !== 'none') : [];
    if (!shown.length) continue;
    shown[0].classList.add('joinFirst'); shown[shown.length - 1].classList.add('joinLast');
  }
}
