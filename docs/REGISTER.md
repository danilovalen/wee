# Playtest register

Every report gets the next number and keeps the reporter's words. An item closes only with an
outcome: **done** (commit), **declined** (why), or **moved** (where).

| # | Report | Outcome |
|---|---|---|
| 1 | "The enemy clock is not totally aligned to the player. When I moved forth and back, the enemy went forth and back too, but stopped with one square of difference." Then: "same happened with moving blocks", and his report (an on-your-move enemy). | **done.** A patrolling piece that hit a wall spent that step turning without moving. It now turns and moves the other way in the same step. His report is `tests/reports/patrol-turn-loses-a-step.json` and replays level. |
| 2 | "When jumping, the enemy only moved once. Should have slid all the way." | **done.** A jump makes each on-your-move piece slide along its patrol, a tile per tick, until something stops it. Still one world step. |
| 3 | "If I have selected Block and I click on a block, I want it to remove that block. It's always an eraser if I'm clicking a certain type with that type selected." | **done.** Any tool: clicking what it places removes it; a drag that starts on one removes along the way. A turret tool on a mounted turret takes only the turret off. |
| 4 | "Heavy enemy: if he takes two lasers in a short amount of time, he dies. Like 4 squares of movement." | **done.** Strong enemy: a laser hurts it for 4 of your moves (crack and pips); a second laser in that window kills it. Turret beams count too (my call). |
| 5 | "Add some wall triangles too which redirect all stuff: boxes, enemies, lasers and such. Diagonally." | **done.** Triangle tile, solid in one chosen corner. What enters an open face leaves through the other, turned 90 degrees: you, boxes, heavy boxes, movers, enemies, lasers and beams. A solid side stops things like a wall. |
| 6 | (see 7) "If I slide with my finger I want to add multiple things (replacing what was there) if the first tap was not that type, then remove all instances of that type where I slide." | **done.** A drag starting on the selected type removes that type along the way and nothing else; otherwise it places along the way. Pieces replace pieces and tiles replace tiles; a piece still sits on a floor tile (box on a button) rather than clearing it. |
| 7 | "Nope, tried to slide my finger across many slots and only the first one clicked received a square." | **done.** On a touch screen the drag never looked up the tile under the finger: it read the mouse-hover cell, which is switched off for touch. The phone gate now drags with real touch events; before, it dragged a mouse on a touch-sized page, which could not see this. |
