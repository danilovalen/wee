// Options (registers 960, 963): sound, the player, dev mode and the progress buttons, behind one button on the
// menu's bar instead of three, so a new player sees less.
import { $ } from './dom.js';
import { glyph } from './glyphs.js';

export function bindOptions() {
  $('menuOptions').innerHTML = glyph('gear');
  $('menuOptions').onclick = () => $('optionsBox').showModal();
  $('optionsClose').onclick = () => $('optionsBox').close();
}
