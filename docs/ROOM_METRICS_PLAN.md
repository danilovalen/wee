# Sandbox room metrics (register 650)

Every number below comes from one map the Sandbox can already draw: every position the blob can reach
with plain moves, and where each move from it goes (the design notes and the safety search build it).
Prototype: `node tools/roomMetrics.mjs`, run on the campaign's smallest known winning rooms.

## Danger

| metric | what it says | known rooms |
|---|---|---|
| **Ruin %** | of the moves that change something, from places you can still win from, how many kill you or lock you out | 0-36% |
| ...split **hazard / lock** | the same, killed (spikes, lasers) vs locked (can no longer reach the berry) | 18/18 on level 17 |
| **First ruin** | fewest moves from the start to a move that ruins the run | 0 (the very first move) to none |
| **Lock share** | how many reachable places are locks (the existing Traps note counts these) | |

## Branching

| metric | what it says | known rooms |
|---|---|---|
| **Places** | how many positions the blob can reach | 4-47 |
| **Choices per step** | along the shortest path, how many moves keep the berry in reach | 1.5-2.5 |
| **Forced steps %** | steps on that path with only one move that keeps you alive: high is a corridor, an obvious room | 0-50% |
| **Detour %** | places you can reach and still win from that no shortest path passes: room to wander | 0-89% |

## Ways to win

| metric | what it says | known rooms |
|---|---|---|
| **Shortest ways** | how many different shortest paths win (Routes already counts these) | 1 on every smallest room |
| **Near ways** | wins within the shortest plus 2 moves | |
| **Winning first moves** | of the first moves, how many can still win | |

## Recommendation

Show six, in plain words, under the room's check:
Ruin % (hazard / lock), First ruin, Places, Choices per step, Forced steps %, Shortest ways.
