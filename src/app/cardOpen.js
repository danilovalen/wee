// A level card opens into the level's clipboard (register 934): the header stays put, the tapped card's
// box grows into the clipboard's place, and the room fades in under it, instead of the whole page wiping.
let from = null;
const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.webdriver && !window.__wipe);

export function bindCardOpen() {
  document.addEventListener('click', ev => {
    const card = ev.target.closest && ev.target.closest('#campList .campRow');
    from = card && !card.classList.contains('locked') ? card.getBoundingClientRect() : null;
  }, true);
}
// Whether this change of screen is a card opening, which plays instead of the wipe.
export const opens = (was, to) => !!from && was === 'levels' && (to === 'level' || to === 'puzzle') && !still();

export function playOpen() {
  const box = from; from = null;
  // The brief, not the sheet in it: the sheet is drawn again on every change, which would drop the motion.
  const sheet = [...document.querySelectorAll('.campBrief')].find(e => e.checkVisibility());
  if (!box || !sheet || still()) return;
  const t = sheet.getBoundingClientRect();
  if (!t.width || !t.height) return;
  const grow = `translate(${box.x - t.x}px, ${box.y - t.y}px) scale(${box.width / t.width}, ${box.height / t.height})`;
  sheet.animate([{ transform: grow, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: 240, easing: 'cubic-bezier(.2, .8, .2, 1)' });
  const room = document.getElementById('roomArea');
  room?.animate([{ opacity: 0 }, { opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
}
