// Known winning rooms per level, in the tests' legend (# block, t switch, D door, o button, B box,
// P start, G goal; blue Q door, q button, T switch; ^>v< one-ways; n e s w a laser firing that way). The campaign tests prove each
// one wins, and tools/levelSearch.mjs --seeded climbs from them (register 272).
export const KNOWN = {
  small: { 1: ['.GP', '...', '..#'], 2: ['.tD', '...', '.GP'], 3: ['D..', 't.G', '..P'], 4: ['Pt.', 'D..', 'G.t', '...'],
    5: ['...#....', '.....PG.', '..#.B...', '...#....', '....B...', '....#...'], 6: ['...', '.P.', '.D.', 'GB.', 'tB.'], 7: ['.GoD', '....', '..B.', '..P.'], 8: ['..P..', '...D.', '...BG', '...Bo'],
    9: ['....', '..<.', '...^', '.GP.'], 10: ['.G.^', '....', '.^..', '.B..', '.P..'], 11: ['...P', 'BBDq', 'o.Q#', '#..G'], 12: ['#P.#..', 'G>.>Bo'], 13: ['PB>..GD', '.......', '#t.....'],
    14: ['GD.', 'Dw.', 'tP.'], // His 6x5 room (register 293) plus one block from a search: 11 moves.
    15: ['#..##.', '...P..', '...B..', '#.....', 'e..>G#'],
    // His room (registers 304, 306): 7 moves, 5x4, two lasers; the robot steps on the button.
    16: ['..#P#', 'G..B.', 'D....', 'ne.o.'] },
  optional: {
    // Found by tools/levelSearch.mjs (2026-10-19, register 283): two lasers, pointing right and down, 4 moves.
    14: ['..G', 'DeD', 't.t', '.sP', '#D.'],
    // His room (registers 304, 306): 7 moves, 5x4, two lasers; the robot steps on the button.
    16: ['..#P#', 'G..B.', 'D....', 'ne.o.'],
    // His room (register 293): a box goes through the one-way.
    15: ['#..#.P...#', '#....B....', '#B.#......', 'e....>.G.#'],
    4: ['PtttD.', '......', '......', '......', '.#.G..'],
    // Found by tools/levelSearch.mjs --seeded (register 276, with boxes pushing boxes): 6 moves.
    6: ['BB#DP.', '..#.B.', 'DBBGt.', '.DDDB.'],
    7: ['BP.B.o', '.BB#..', 'D.....', '.oG.#.'],
    8: ['.G.......', 'Do....B..', '...PD...#', '........D', '#........', '....D....'],
    9: ['G.<.', '##..', '..^#', 'Pv..', '....', '...#', '....', '.#..', '....'],
    10: ['...<B.', '..BG>^', '..P...'],
    11: ['P.QQ.', 'BB.q.', 'oBBQ.', '#DDB.', 'B..##', '#.BG.', 'BQQ..', '.....'],
    // Found by tools/levelSearch.mjs --seeded (2026-10-19, register 277): 8 moves, a box thrown out by the turning one-way.
    12: ['PBB.v', '.G>.B', '..>.o'],
  },
  wins: {
    1: ['P.#.#', '.....', '.###.', '.#...', '.#..G'],
    2: ['P..D#', '..t..', '.##.#', '.#...', '#...G'],
    3: ['P.#.#', '..###', '#..#.', 'Dt...', '..t#G'],
    4: ['Pt.tD', '.#...', '.....', '###.#', '.#..G'],
    // His room (register 271): 19 moves; boxes push boxes since register 278, so two boxes are needed.
    5: ['#P.#..', '......', '.B.#..', '##....', '...#.#', '......', '.B.#..', '##....', '.#....', '...G.#', '..##..'],
    6: ['P....', '....B', 'B..#t', 'D.#.#', '....G'],
    // His room (2026-10-18): won in 4, the box ends off the button.
    // His room (2026-10-18), the old level 8 that became 7: won in 5.
    7: ['P.#.', '.B#.', 'D...', '.oG.'],
    // Found by tools/levelSearch.mjs (2026-10-19): 7 moves, level 8's exact count.
    8: ['.#.B.', '#B..G', '.#.B.', '.#...', '.#DPD', '.D...', '....B', '..#..', '..Bo.'],
    // His room (2026-10-18): 8 moves, level 9's exact count.
    9: ['G....', '##..#', '..^#.', '.v...', '..#..', '....#', 'P#...'],
    // Found by tools/levelSearch.mjs (2026-10-19): 10 moves, level 10's exact count (his number, register 240).
    10: ['#..#.#...', '...B..>..', '.....#.B.', 'B#...G...', '.#P.#..^.'],
    // Found by tools/levelSearch.mjs --from (2026-10-19): 7 moves, level 11's exact count (mine, provisional).
    11: ['.Bo#', '....', 'QBP.', '.DQG', '.q#.'],
    // Found by tools/levelSearch.mjs (2026-10-19): 7 moves, level 12's exact count (mine, provisional).
    12: ['PBB..', 'BG>.B', '..>.o'],
    // Built by hand and checked (2026-10-19): the closed door stops the box past the one-way; the
    // switch opens the door and turns the one-way; the robot comes through the door and pushes it back. 9 moves.
    13: ['PB>..GD', '.......', '#t.....'],
    // Found by tools/levelSearch.mjs (2026-10-19, registers 255, 256): level 14 in 8 moves.
    14: ['e.D...D', 'D...t..', 'P..tD.G', '.......'],
    // His room (register 293): 14 moves, level 15's exact count.
    15: ['#..#.P...#', '#....B....', '#B.#......', 'e....>.G.#'],
    // His room (registers 304, 306): 7 moves, 5x4, two lasers; the robot steps on the button.
    16: ['..#P#', 'G..B.', 'D....', 'ne.o.'],
  },
};

// Every known room of a level, as rows.
export const roomsOf = id => [KNOWN.small, KNOWN.optional, KNOWN.wins].map(m => m[id]).filter(Boolean);
