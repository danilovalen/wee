// Known winning rooms per level, in the one legend (tools/legend.mjs). The campaign tests prove each
// one wins, and tools/levelSearch.mjs --seeded climbs from them (register 272).
export const KNOWN = {
  // The smallest winning room found per level; its size is the size goal (register 486).
  small: {
    1: ['P#', 'G.', '..'],
    2: ['.tD', 'G.#', 'DP.'],
    3: ['#G#', 'PtD', '#.D'],
    4: ['Pt.', 'D.t', '..G', 'D.D'],
    5: ['.G..', '.#..', '.B.P', '....'],
    6: ['DD.', 'DD.', 'GB.', 'tBP'],
    7: ['BP#B', 'DB..', '.oG.'],
    8: ['P##', '.D.', '.BG', '.Bo'],
    9: ['P>..', '#..#', '..>G'],
    10: ['..#^vP', 'G...^.', '>..<B.'],
    11: ['PBB.', 'BBDq', 'oGQB'],
    12: ['#P.#..', 'G>.>Bo'],
    13: ['PB>..GD', '.......', '#t.....'],
    14: ['GD.', 'Dw.', 'tP.'],
    15: ['...#.P.', '#....B.', '.B.#..B', 'e....>G'],
    16: ['o..', 'GBP', '.eD', 'n..'],
    17: ['oB.wB', 'PBBB#', '.IG.w'],
    18: ['rP#', 'nB.', '.G.', '#I#'],
    19: ['##..', '.DD.', 'DESG', '.Pr.'],
    20: ['........', '........', '.BDGrrPw'],
    21: ['#P.', 'xB#', '.B#', '.Gx', '#xx'],
    22: ['#.P..x', '....x.', '.B>xG.'],
    23: ['.B..', 'PBDx', '.B..', '..xG', '.o..'],
    24: ['S.#.', '.r.x', '.N.G', 'v##W', 'N.#.', 'P...'],
    'twocolour': ['X.o', 'G..', 'reP'],
    5: ['..P#', 'G#B.', '....'],
  },
  // A winning room that meets two side goals at once, per level (register 506).
  pair: {
    1: ['P.#.', '...#', '.#..', '..#G'],
    2: ['Dt.', '..P', 'DGD'],
    3: ['DG.', 't..', 'PD.'],
    4: ['Pt.', 'D..', 'G.t', '...'],
    5: ['#..#..', '......', '.B.#..', '#.P...', '...#.#', '......', '.B.#..', '##....', '.#....', '.#.G.#', '..##..'],
    6: ['GD#', 'DB#', 'tB.', 'tBP'],
    7: ['.GoD', 'DBB.', 'oBB.', '..P.'],
    8: ['...', '.DP', '.BG', '.Bo'],
    9: ['G.<.', '##..', 'P.^#', '#v..', '....'],
    10: ['.....v..', '..#....#', '.....B.v', '#...<...', '#<GP<...'],
    11: ['P.Q.D', 'BB.qo', 'oBDQ.', '#.B#.', '#..##', '#..GD', '.QQB#'],
    12: ['^.B..', 'BG>B.', 'P.Bvo'],
    13: ['PB>..GD', '.......', '#t.....'],
    14: ['s..', 'DtG', '#DP'],
    15: ['#..#.P...#', '#....B....', '#B.#......', 'e....>.G.#'],
    16: ['o..', 'GBP', '.eD', 'n..'],
    17: ['o.BwB', 'PBG..', 'I...w'],
    18: ['rP#', 'nB.', '.G.', '#I#'],
    19: ['##..', '.DD.', 'DESG', '.Pr.'],
    20: ['..B.....', '.B......', 'DGr.rrPw'],
    21: ['.x.', 'x..', 'GBP', 'B..', '...'],
    22: ['..Bx<B.', '#..#P..', '..B>xG.'],
    23: ['BB..', 'PBDx', 'BBx.', '..xG', 'ooB.'],
    24: ['.#..', '.r.x', '.N.G', 'v.#.', '.N.N', '..P.'],
  },
  optional: {
    // Found by tools/climb.mjs from level 24's wins (register 458): three spikes, 7 moves, 10x3.
    24: ['#.xG...S..', '....rW.r..', '.xx.EE>>WP'],
    // Found by tools/climb.mjs (registers 450, 454, 460): two one-ways in 5 moves, 7x3; two doors in 18 moves, 6x7.
    22: ['..Bx<BP', '#......', '..B>xG.'],
    23: ['..G.B.', '.##...', '.o..x.', '#B..D.', '....D.', '..B.B.', '...BP.'],
    // Sketched by hand (registers 436, 439): 28 moves, 8x9, the boxes push each other off the spike.
    21: ['.#..#..#', '.#......', '#..#....', '....G.#.', 'PBBx.#..', '.....#..', '#......#', '....#...', '..#.....'],
    // Found by tools/levelSearch.mjs --all (register 387): the fewest moves found with a relay pushed into another, 5, in 9x3.
    20: ['....G...e', '........e', '.BD.r.rPw'],
    // Found by tools/levelSearch.mjs with the goal required (register 365): 8 moves, the laser through the goal.
    19: ['#D.##', '...##', 'rG.WP', 'rW..D', 'D....', '..#..', '.....'],
    // Found by tools/levelSearch.mjs (2026-10-19, register 283): two lasers, pointing right and down, 4 moves.
    14: ['..G', 'DeD', 't.t', '.sP', '#D.'],
    // Found by tools/climb.mjs (register 425): no pushable laser, the box pushed in 2 moves and hit once, 7 moves, 6x6.
    16: ['..o.q.', '.BD..G', '.P....', '..s.s.', 'Q.q#..', 'Qs..D.'],
    // Found by tools/levelSearch.mjs (register 371): 9 moves, 4x7; the robot and a box each stop against a relay.
    18: ['.II.', 'I..s', 'B.Br', '....', '.B..', '...P', '.G.r'],
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
    10: ['.....v..', '..#....#', '.....B.v', '#...<...', '#<GP<...'],
  },
  wins: {
    // The tutorial's own answer: one block stops the robot above the star (register 512).
    tutorial: ['.....', '.P..#', '.....', '.....', '...G.'],
    // Found by tools/levelSearch.mjs (register 388): 8 moves, level 20's exact count, a relay pushed into another on the way.
    20: ['...GB..#', '.B.B....', 'D.r..rPw'],
    // Found by tools/climb.mjs (register 444): 12 moves, level 21's exact count.
    21: ['..#.P...', 'xxxBB.x.', '.x.G....'],
    // Found by tools/climb.mjs (registers 448, 452): the exact counts, 22 in 10 and 23 in 12.
    22: ['..BBx<B.', '..G..B.P', 'xB.....B'], 23: ['....', 'PBD.', 'B.Bx', '.BxG', 'xox.'],
    // Found by tools/climb.mjs (register 456): 11 moves, level 24's exact count.
    24: ['.#..', '.r.x', '.N.G', 'v.#.', '.N.N', '..P.'],
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
    // Exact counts tightened to the search's fewest (register 365): 16 and 18 in 4 moves, 19 in 7.
    16: ['o..', 'GBP', '.eD', 'n..'],
    17: ['.#...', '...#.', 'PBo#.', 'e...I', '..#..', '....G'], 18: ['rP#', 'nB.', '.G.', '#I#'], 19: ['##..', '.DD.', 'DESG', '.Pr.'], twocolour: ['..eXqR', '.G.#P#', 'wX..o.', '..#...'],
    5: ['..P#', 'G#B.', '....'],
    10: ['.....v..', '..#....#', '.....B.v', '#...<...', '#<GP<...'],
    22: ['..Bx<B.', '#..#P..', '..B>xG.'],
  },
};

// Every known room of a level, as rows.
export const roomsOf = id => [KNOWN.small, KNOWN.pair, KNOWN.optional, KNOWN.wins].map(m => m[id]).filter(Boolean);
