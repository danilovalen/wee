# Goals in keywords (register 537)

2026-10-31. Every goal the 22 listed levels use, today and in the keyword form. Draft; nothing is built.

## The keyword grammar

A goal is **piece, verb, piece**, then a few marks. Pieces are their drawn icons, as today.

| Kind | Keywords | Replaces |
|---|---|---|
| Verbs (8) | hits, through, on, leaves, pushes / pushed, flips, launches, between | collides with, stopped by, goes through, into, over, crosses, onto, ends on, throws out |
| Who | all, one, only, no | every, a, the, at least one |
| How many | ×2 (times), ≥3 (at least), ≤1 (at most), =8 (exactly), 0 (none) | at least 3, at most 1, exactly 8, 2 times, no |
| How | 2 ways (pointing or moving), ⇄ (both ways), 3 sides | pointing 2 ways, moves only 2 ways, both ways, from 3 directions |
| When | ⚑ drawn flag = at the end | at the end |
| State | drawn on the piece's icon: open or closed door, switch on or off, relay lit | open, closed, off, on, lit |

States and the flag are drawn, not written (show, don't tell). So the only words left on a goal are the 8 verbs and 4 who-words.

## Level 3 as an example

| Now (25 words) | Keywords (3 words) |
|---|---|
| at least 4 moves | ≥4 moves (or the move dots, plan step 4) |
| [robot] through an open [door] | [robot] through [door:open] |
| every [door] closed at the end | all [door:closed] ⚑ |
| exactly 8 | =8 |
| 3×3 or smaller | ≤3×3 |
| [robot] collides with a closed [door] | [robot] hits [door:closed] |
| at most 1 [door] | [door] ≤1 |
| any 2 optional goals at once | 2★ at once |

## Every goal

| Goal | Now | Keywords |
|---|---|---|
| `aToggleOffAtEnd` | a [toggle] off at the end | [toggle]:off ⚑ |
| `allRelaysLitAtEnd` | every [relay] lit at the end | all [relay]:lit ⚑ |
| `atMostOneDoor` | at most 1 [door] | [door] ≤1 |
| `boxBetweenTwoRelays` | [box] between two [relay] | [box] between two [relay] |
| `boxHitsAndThroughIdoor` | [box] collides with and goes through an [idoor] | [box] hits+through [idoor] |
| `boxHitsBox` | [box] collides with a [box] | [box] hits [box] |
| `boxHitsIdoor` | [box] collides with a closed [idoor] | [box] hits [idoor]:closed |
| `boxHitsOneWay` | [box] collides with a [gate] | [box] hits [gate] |
| `boxHitsOneWayThreeWays` | [box] collides with a [gate] from 3 directions | [box] hits [gate] 3 sides |
| `boxLaunched` | [gate] throws a [box] out | [gate] launches [box] |
| `boxLeavesEveryDoor` | [box] leaves every [door] | [box] leaves all [door] |
| `boxOnButtonAtEnd` | [box] on a [button] at the end | [box] on [button] ⚑ |
| `boxPushesEveryOneWay` | [box] pushes every [gate] | [box] pushes all [gate] |
| `boxThroughOneWay` | [box] through a [gate] | [box] through [gate] |
| `boxThroughOneWayBothWays` | [box] through a [gate] both ways | [box] through [gate] ⇄ |
| `boxThroughOpenDoor` | [box] into an open [door] | [box] through [door]:open |
| `doorClosedAtEnd` | every [door] closed at the end | all [door]:closed ⚑ |
| `everyBoxEntersSpikes` | every [box] onto [spikes] | all [box] on [spikes] |
| `everyBoxHitOnce` | [start] collides with every [box] | [start] hits all [box] |
| `everyBoxHitsBlockTwice` | every [box] collides with a [block] ×2 | all [box] hits [block] ×2 |
| `everyBoxHitsOneWay` | every [box] collides with a [gate] | all [box] hits [gate] |
| `everyBoxLeavesBeam` | every [box] leaves a [laser] beam | all [box] leaves [laser] beam |
| `everyBoxLeavesGoal` | every [box] leaves the [goal] | all [box] leaves [goal] |
| `everyBoxLeavesSpikes` | every [box] leaves [spikes] | all [box] leaves [spikes] |
| `everyBoxPushedTwice` | every [box] pushed 2 times | all [box] pushed ×2 |
| `everyBoxStuckOnOneWay` | every [box] ends on a [gate] | all [box] on [gate] |
| `everyBoxThroughOneWay` | every [box] through a [gate] | all [box] through [gate] |
| `everyBoxThroughOpenDoor` | every [box] into an open [door] | all [box] through [door]:open |
| `everyDoorOverSpikes` | every [door] over [spikes] | all [door] on [spikes] |
| `everyOneWayOverSpikes` | every [gate] over [spikes] | all [gate] on [spikes] |
| `everyToggleOffAtEnd` | every [toggle] off at the end | all [toggle]:off ⚑ |
| `hitsClosedDoor` | [start] collides with a closed [door] | [start] hits [door]:closed |
| `laserBlockedByDoor` | every [laser] stopped by a closed [door] | all [laser] hits [door]:closed |
| `laserBoxHitsEveryOneWayTwice` | [laser] collides with every [gate] ×2 | [laser] hits all [gate] ×2 |
| `laserCrossesEverySpike` | [laser] crosses every [spikes] | [laser] through all [spikes] |
| `laserOverEveryOneWay` | [laser] over every [gate] | [laser] through all [gate] |
| `laserOverEverySpike` | [laser] over every [spikes] | [laser] through all [spikes] |
| `laserPushedThrice` | [laser] pushed ×3 | [laser] pushed ×3 |
| `laserStoppedByIdoor` | [laser] stopped by a closed [idoor] | [laser] hits [idoor]:closed |
| `laserThroughADoor` | [laser] through an open [door] | [laser] through [door]:open |
| `laserThroughAndStoppedByDoor` | [laser] through an open and stopped by a closed [door] | [laser] through [door]:open, hits [door]:closed |
| `laserThroughGoal` | [laser] through the [goal] | [laser] through [goal] |
| `laserThroughNoRelay` | [laser] through no [relay] | [laser] through no [relay] |
| `laserThroughOneWay` | [laser] through a [gate] | [laser] through [gate] |
| `laserThroughOpenDoor` | every [laser] through an open [door] | all [laser] through [door]:open |
| `lasersTwoWays` | [laser] pointing 2 ways | [laser] 2 ways |
| `noBlocks` | no [block] | [block] 0 |
| `noBoxAtEnd` | no [box] at the end | [box] 0 ⚑ |
| `noRelayAtEnd` | no [relay] at the end | [relay] 0 ⚑ |
| `oneWaysThreeWays` | [gate] pointing 3 ways | [gate] 3 ways |
| `oneWaysTwoWays` | [gate] pointing 2 ways | [gate] 2 ways |
| `onlyBoxesFlipSwitches` | only [box] flips [toggle] | only [box] flips [toggle] |
| `relayHitsRelay` | [relay] collides with a [relay] | [relay] hits [relay] |
| `robotAndBoxHitRelay` | [start] and [box] collide with a [relay] | [start] and [box] hit [relay] |
| `robotFlipsSwitchTwice` | [start] flips a [toggle] ×2 | [start] flips [toggle] ×2 |
| `robotHitsEveryLaserTwice` | [start] collides with every [laser] ×2 | [start] hits all [laser] ×2 |
| `robotHitsEveryOneWay` | [start] collides with every [gate] | [start] hits all [gate] |
| `robotLeavesEveryDoor` | [start] leaves every [door] | [start] leaves all [door] |
| `robotThroughEveryOneWay` | [start] through every [gate] | [start] through all [gate] |
| `robotThroughEveryOneWayBothWays` | [start] through every [gate] both ways | [start] through all [gate] ⇄ |
| `robotThroughEveryPushedOneWay` | [start] through every [gate] | [start] through all [gate] |
| `robotThroughFourDoors` | [start] through all of 4+ [door] | [start] through 4+ [door] |
| `robotThroughIdoor` | [start] through an open [idoor] | [start] through [idoor]:open |
| `robotThroughOneWay` | [start] through a [gate] | [start] through [gate] |
| `robotThroughOneWayBothWays` | [start] through a [gate] both ways | [start] through [gate] ⇄ |
| `robotTwoDirections` | [start] moves only 2 ways | [start] 2 ways |
| `thirdToggleOnAtEnd` | a 3rd [toggle] on at the end | 3rd [toggle] on ⚑ |
| `threeOneWays` | at least 3 [gate] | [gate] ≥3 |
| `threeSpikes` | at least 3 [spikes] | [spikes] ≥3 |
| `threeSwitches` | at least 3 [toggle] | [toggle] ≥3 |
| `throughOpenDoor` | [start] through an open [door] | [start] through [door]:open |
| `throughOpenDoorTwice` | [start] 2 passes through an open [door] | [start] through [door]:open ×2 |
| `touchBlockFourTimes` | touch one [block] ×4 | [start] hits one [block] ×4 |
| `twoBoxes` | at least 2 [box] | [box] ≥2 |
| `twoButtons` | at least 2 [button] | [button] ≥2 |
| `twoDoors` | at least 2 [door] | [door] ≥2 |
| `twoSwitches` | at least 2 [toggle] | [toggle] ≥2 |
| `twoTogglesOffAtEnd` | 2 [toggle] off at the end | 2 [toggle]:off ⚑ |

## Open

1. Does `hits` cover both "collides with" and "stopped by" (a laser beam stopped by a door)? The draft says yes.
2. `through` for a laser beam over spikes or a one-way, and for a robot through a door: one word for both, or `over` for beams?
3. Drawn states need new icons: an open door, a switch off, a lit relay, and the ⚑ flag.
