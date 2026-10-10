// The entry point: builds the panels, wires input, starts the loop, and exposes the
// text state and a fixed clock for tests and agents.
import { TICK_MS } from '../rules/base.js';
import { replay, gameText } from '../rules/game.js';
import { parseLevel, emptyLevel } from '../level/format.js';
import { newHistory } from '../editor/history.js';
import { S, starterLevel } from '../editor/state.js';
import { portrait } from './dom.js';
import { fit, watchStage } from './fit.js';
import { buildPanels, syncPanel } from './panels.js';
import { bindInput } from './input.js';
import { setMode, frame, render, tick, report, copyReport } from './play.js';
import { buildRooms, bootRooms } from './rooms.js';
import { buildGenerator } from './generator.js';

S.level = starterLevel(portrait());

window.renderGameToText = () => S.mode === 'play' ? gameText(S.game, 'play') : JSON.stringify({ mode: 'edit', level: S.level });
window.advanceTime = ms => {
  if (S.mode !== 'play') return;
  for (let i = 0; i < Math.round(ms / TICK_MS); i++) tick();
  S.acc = 0; render();
};
window.wee = { draws: () => S.draws, blank: (w, h) => emptyLevel(w, h), report, replay, gameText, press: k => S.pending.push(k), setMode, getLevel: () => S.level, loadLevel: l => { S.level = parseLevel(JSON.stringify(l)); S.history = newHistory(); syncPanel(); fit(); } };

buildPanels({ setMode, copyReport, fit });
buildRooms({ setMode, syncPanel, fit });
buildGenerator({ setMode, syncPanel, fit });
bindInput();
syncPanel();
addEventListener('resize', fit);
watchStage();
// Any input may change what the room looks like; the next frame redraws it.
for (const t of ['pointerdown', 'pointermove', 'pointerup', 'keydown', 'click', 'input', 'change', 'resize']) addEventListener(t, () => { S.redraw = true; }, true);
fit();
setMode('edit');
requestAnimationFrame(frame);
window.wee.roomsReady = bootRooms();
