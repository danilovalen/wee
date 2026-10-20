// Reset: the room goes back to the level's start, after a yes (register 291). One undo step.
import { S } from '../editor/state.js';
import { roomOf } from '../campaign/rules.js';
import { $ } from './dom.js';
import { change } from './undo.js';

export function buildReset(after) {
  const box = $('resetBox');
  $('campReset').onclick = () => { if (S.camp && S.mode === 'edit') box.showModal(); };
  $('resetNo').onclick = () => box.close();
  $('resetYes').onclick = () => { box.close(); change(() => { S.level = roomOf(S.camp.def); }); after(); };
}
