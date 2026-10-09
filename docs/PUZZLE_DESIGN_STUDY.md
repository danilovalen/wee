# Puzzle design: a study guide for wee

Written 2026-10-09 for a designer building a deterministic, top-down, single-room puzzle game:
ice sliding, Sokoban pushing, buttons and colour-AND doors, lasers with relays and catchers,
water and swimming, springs, sticky puddles, and Hide (Cycle).

## How the sources were checked, read this first

This container's network blocks direct page fetches to every host involved (YouTube, GDC Vault,
thinkygames.com, arXiv, gamedeveloper.com, marctenbosch.com, amara.org all returned
`EGRESS_BLOCKED`). Every item below was instead confirmed through search-engine retrieval of
the page itself or of its official listing. Each item carries a tag:

- **[V]** confirmed: the primary page or official listing (GDC Vault, the author, the publisher,
  the paper's own abstract) was returned by search, with the claim made here.
- **[S]** secondary: existence confirmed, but what it says comes from a write-up, a transcript
  summary or a reviewer, not from the source itself. Treat the summary as a lead.
- **[U]** not verified: you asked for it, I looked, and could not confirm it. Listed so you know
  the gap exists.

Re-open the [V] items yourself before quoting them in anything public. Lengths are given only
where a listing stated them.

---

## (a) Ranked reading and watching list

Ranked by how much method you can lift into wee, not by fame.

| # | Title | Author | Link | Length | Why it matters | Take from it | Tag |
|---|---|---|---|---|---|---|---|
| 1 | System-Centric Puzzle Design in "Patrick's Parabox" (GDC 2024) | Patrick Traynor | [YouTube](https://www.youtube.com/watch?v=HAvS-RwkjdA), [GDC Vault](https://gdcvault.com/play/1034415/System-Centric-Puzzle-Design-in), [slides PDF](https://media.gdcvault.com/gdc2024/Slides/GDC+slide+presentations/Traynor_Patrick_SystemCentricPuzzle.pdf) | not verified (GDC session) | A Sokoban-family game, mechanic-first, with a designer explaining heuristics for iterating mechanics, building levels, and playtesting. Closest single talk to what you are making. | Goal is to "showcase/communicate, not challenge/stump"; simplify a puzzle as far as it will go; leave spare room for mistakes; move the hardest rooms to optional side content. | [V] |
| 2 | Designing the mind-bending puzzles in Patrick's Parabox | Patrick Traynor, interviewed (Game Developer, 2023-01-18) | [gamedeveloper.com](https://www.gamedeveloper.com/design/patrick-s-parabox-) | article | How he decided how the system should behave before building rooms. | Prefer the system's natural behaviour over arbitrary rules; prefer the behaviour that makes more interesting puzzles; prefer the behaviour that is easier to remember and reason about. Use this as your tiebreak every time a rule in the rules (`src/rules/`) has two plausible readings. | [S] |
| 3 | How Jonathan Blow Designs a Puzzle | Mark Brown, Game Maker's Toolkit (S2E4, 2016-03-09) | search YouTube for the title; transcript hosted at [amara.org](https://amara.org/v/C3BFd) | short video | The clearest compact statement of "puzzles are discovered from a mechanic". | Explore what a rule implies rather than plan puzzles; twist every part of the system; arrange rooms so the player is led to the insight; misdirection that lures an obvious but wrong move. | [S] |
| 4 | Truth in Game Design (GDC Europe 2011) | Jonathan Blow | [GDC Vault 1014982](https://gdcvault.com/play/1014982) (free per GDC), [Game Developer post](https://www.gamedeveloper.com/design/video-jon-blow-on-the-truth-in-game-design-) | not verified | The source of the method in #3. | Games are algorithmic systems biased toward revealing truth; ask the system questions ("what if you could reverse time?") and observe instead of forcing outcomes; more ideas came out of Braid's process than were put in. | [V] |
| 5 | Designing to Reveal the Nature of the Universe (IndieCade 2011) | Jonathan Blow, Marc ten Bosch | [ten Bosch's post](https://marctenbosch.com/news/?p=181), [Game Developer coverage](https://gamedeveloper.com/design/indiecade-inside-jonathan-blow-s-puzzle-design-process) | not verified | Companion to #4, framed against "combinatoric" design. | Find the system's core ideas and express them as cleanly as possible, as opposed to combining mechanics to see what falls out. | [V] listing, [S] recording |
| 6 | Bonfire Peaks explores complex emotions through puzzle design | Corey Martin, interviewed (Game Developer) | [gamedeveloper.com](https://www.gamedeveloper.com/design/bonfire-peaks-explores-complex-emotions-through-puzzle-design) | article | A working Sokoban-family method in two sentences. Alan Hazelden co-designed the puzzles. | Play with the system until you find an interesting interaction, then reverse-engineer a puzzle that forces it. If you cannot say the point of a puzzle in words, it is probably unfocused. | [S] |
| 7 | What Makes a Good Puzzle? | Mark Brown, Game Maker's Toolkit (2018-03-14) | [YouTube](https://www.youtube.com/watch?v=zsjC6fa_YBg) | about 12 min | Survey with designer input; cites Snakebird, Braid, Portal, Talos, Lara Croft GO. | Puzzles come from the rules and limits of the mechanics; "the catch" is an apparent contradiction the player must resolve. Viewers also recall "assumption" and "obvious what to do, not how": re-watch to confirm those. | [S] |
| 8 | Super Mario 3D World's 4 Step Level Design | Mark Brown, Game Maker's Toolkit | transcript at [amara.org](https://amara.org/v/C3BFz), [MCV write-up](https://www.mcvuk.com/development/video-nintendos-level-design-secrets-in-four-steps) | short video | The best-known model for ordering a mechanic across rooms. | Introduce, develop, twist, resolve (kishotenketsu, per director Koichi Hayashida). A mechanic is taught, developed, twisted, then dropped. | [S] |
| 9 | The Puzzle Vocabulary Toolbox (GDC 2024) | Brett Taylor (Linelight) | [GDC Vault](https://gdcvault.com/play/1034203/The-Puzzle-Vocabulary-Toolbox-How) | 1 h session | A shared vocabulary for dissecting puzzles, plus practical advice. Useful because you will be talking design with collaborators. | Terms for analysing and discussing puzzles. Content beyond the abstract not verified. | [V] |
| 10 | Puzzle Game Magic Secrets (GDC 2019) | Brett Taylor | [GDC Vault](https://gdcvault.com/play/1026440/Puzzle-Game-Magic) | not verified | Puzzle design through human cognition; designing flow-inducing puzzles. | Content beyond the abstract not verified. | [V] |
| 11 | What is a Puzzle? (The Art of Puzzle Design series) | Scott Kim | [PDF reprint](https://cs.wellesley.edu/~cs215/Lectures/L17-IntroGamesJigsawPuzzle/ScottKim-What_is_a_Puzzle.pdf), [series](https://www.deepfun.com/the-art-of-puzzle-design/) | 5 pages | The definition everyone quotes, from a puzzle designer, not a video game designer. | "A puzzle is fun and has a right answer" (credited to Stan Isaacs). Too easy disappoints, too hard discourages; the best ones need a shift in how you read the picture. | [V] |
| 12 | Open Ended Puzzle Design at Zachtronics (GDC 2019) | Zach Barth, with Drew Messinger-Michaels | [GDC Vault](https://gdcvault.com/play/1025715/Open-Ended-Puzzle-Design-at) | not verified | The counter-school: many solutions, designers ship puzzles they have not solved. | Read it to know what you are choosing against. wee rooms are closed-answer; Zachtronics shows the cost and value of the other option. | [V] |
| 13 | Editor tooling for A Monster's Expedition (ThinkyCon 2024) | Alan Hazelden | [talk page](https://thinkygames.com/events/thinkycon/2024/talks/ame-editor-tooling/), all talks on the [Thinky Games YouTube](https://thinkygames.com/news/you-can-now-watch-every-thinkycon-2024-talk-on-youtube) | not verified | Hundreds of hand-placed islands needed dozens of iterations each. You are building an editor right now. | What editor features paid off, which did not, quality-of-life features worth copying. | [V] listing |
| 14 | Draknek interview: Alan Hazelden (TouchArcade, 2024-07-19) | Alan Hazelden | [toucharcade.com](https://toucharcade.com/2024/07/19/draknek-interview-lok-digital-thinky-puzzle-games-sokobond-express-mobile-steam-deck-apple-arcade/) | article | His own account of what improved in his design. | The skill that grew most was a mental model of player understanding: what players notice and what needs teaching, and that model partly resets with each new game. | [S] |
| 15 | Q&A: A Good Snowman Is Hard To Build | Alan Hazelden, Benjamin Davis (Game Developer) | [gamedeveloper.com](https://www.gamedeveloper.com/design/q-a-a-good-snowman-is-hard-to-build) | article | Process evidence from a Sokoban-family hit. | Prototyped in PuzzleScript before any real code, to test that the mechanics allowed interesting puzzles; Hazelden made most puzzles in a couple of days at the start, then tuned through playtesting. | [S] |
| 16 | The relaxing, open-world puzzle design of A Monster's Expedition | Alan Hazelden and team (Game Developer) | [gamedeveloper.com](https://www.gamedeveloper.com/game-platforms/the-relaxing-open-world-puzzle-design-of-i-a-monster-s-expedition-i-) | article | Structure for stuck players. | Paths cross so a stuck player can almost always try another puzzle; the goal is that nearly anyone reaches the end, with hard puzzles optional. | [S] |
| 17 | Reading the Rules of "Baba Is You" (GDC 2020) | Arvi Teikari (Hempuli) | [GDC Vault](https://gdcvault.com/play/1026628/Reading-the-Rules-of-Baba), [slides PDF](https://media.gdcvault.com/gdc2020/presentations/Reading%20the%20rules_Teikari_Arvi.pdf) | not verified | Mostly technical (how a rule system is parsed and stored), not a design-method talk. | Watch for implementing rule interactions in a pure sim, not for level design. | [V] |
| 18 | How Baba Is You Works (GMTK Most Innovative 2019) | Mark Brown | transcript at [amara.org](https://amara.org/subtitles/v4T6ECRKBPBx/en/1/download/How%20Baba%20Is%20You%20Works%20%20GMTK%20Most%20Innovative%202019.en.txt) | not verified | A secondhand note says it covers Teikari building puzzles backwards from the solution or mechanic. | Designing backwards. Confirm by watching. | [S] |
| 19 | Make Your Own PuzzleScript Games! | Anna Anthropy (No Starch, 2019) | [nostarch.com](https://nostarch.com/puzzlescriptgames) | 184 pages | Beginner-pitched, but its chapter structure is the right checklist. | Chapters on levels teaching the rules, levels challenging the player to use what they know, and testing levels. Skim for the level chapters only. | [V] |
| 20 | 10 years of grilling: Stephen's Sausage Roll remains one of the most influential puzzle games | Thinky Games | [thinkygames.com](https://thinkygames.com/features/10-years-of-grilling-stephens-sausage-roll-remains-one-of-the-most-influential-puzzle-games-ever-created/) | article | Context for why SSR is the reference text; its own design is the lesson. | Few elements, many layers; undo and restart are part of the design. | [S] |

### Theory and papers (for the ice and Sokoban section)

| # | Title | Author | Link | Take from it | Tag |
|---|---|---|---|---|---|
| T1 | PushPush is NP-hard in 2D | E. Demaine, M. Demaine, J. O'Rourke | [Smith ScholarWorks](https://scholarworks.smith.edu/csc_facpubs/74/) | A pushed block slides to the end of its free range. **That is your light box.** The decision problem is NP-hard, so wee rooms with several light boxes can hide genuinely deep search. | [V] |
| T2 | Pushing Blocks is Hard / Push-* results | Demaine, Demaine, Hoffmann, O'Rourke | [Demaine & Hoffmann](https://erikdemaine.org/papers/PushXCCCG2001/) | The push-family is NP-hard across variants; later work (Demaine, Hoffmann, Holzer) shows PushPush-k PSPACE-complete. | [S] |
| T3 | PSPACE-Completeness of Sliding-Block Puzzles ... Nondeterministic Constraint Logic | R. Hearn, E. Demaine (TCS 343, 2005) | [paper page](https://erikdemaine.org/papers/NCL_TCS/), [Hearn's thesis](https://erikdemaine.org/theses/bhearn.pdf) | NCL is the standard toolkit for proving puzzle hardness; its gadgets (AND, OR, choice) are a vocabulary for room structure: your colour-AND doors are literally AND gadgets. | [V] |
| T4 | Classic Nintendo Games are (Computationally) Hard | Aloupis, Demaine, Guo, Viglietta | [arXiv 1203.1895](https://arxiv.org/abs/1203.1895) | Pokémon is NP-hard; proofs use blocks and switch-operated doors. The gadgets are small rooms worth sketching. | [V] |
| T5 | Ice sliding games | Dorbec, Duchêne, Fabbri, Moncel, Parreau, Sopena (IJGT 2018) | [arXiv 1507.00559](https://arxiv.org/abs/1507.00559) | A robot that stops only at blocks or edges; minimum number of blocks so it can reach every cell, exact on rectangles and tori. Minimum moves reduce to a shortest path in the graph of stops. | [V] |
| T6 | PSPACE-completeness of Bloxorz and of Games with 2-Buttons | (arXiv 1411.5951) | [arXiv](https://arxiv.org/pdf/1411.5951) | Buttons alone push a game to PSPACE. Read the abstract for which button behaviours matter. Title confirmed, contents not. | [S] |
| T7 | Procedural Generation of Sokoban Levels | J. Taylor, I. Parberry (2011) | [Semantic Scholar](https://www.semanticscholar.org/paper/Procedural-Generation-of-Sokoban-Levels-Taylor-Parberry/702b8c6205a1f8b65dd5515807c792454b4ea7a2) | Empty-room templates plus brute-force enumeration of box positions; guaranteed solvable; exponential run time but fine offline at human-designed sizes. | [V] |
| T8 | Automatic making of Sokoban problems (PRICAI'96) | Y. Murase, H. Matsubara, Y. Hiraga | [DOI](https://doi.org/10.1007/3-540-61532-6_50) | Generate, solve, evaluate: random candidates, a solver drops unsolvable ones, an evaluator drops trivial ones. Experts judged the survivors good; the Japanese version admits some were dull. | [V] |
| T9 | Sokoban deadlocks | JSoko documentation | [jsokoapplet.sourceforge.io](https://jsokoapplet.sourceforge.io/sokoban/deadlocks.html) | Simple (dead squares), freeze, and corral deadlocks, with diagrams. | [V] |
| T10 | Sokoban research slides | University of Alberta games group | [webdocs.cs.ualberta.ca](https://webdocs.cs.ualberta.ca/~games/Sokoban/TALK/slide4_5.html) | Dead squares are easy to precompute; hand-coded deadlock rules are error-prone, hence pattern databases. | [S] |

### Asked for, not verified

- **Stephen Lavelle (increpare) talk on puzzle design.** [U] No talk or essay found. Play his games instead (exercise 1).
- **Alan Hazelden "lessons in puzzle design" blog post, or a GDC talk on Cosmic Express or level generation.** [U] He spoke at GDC 2019 ([speaker page](https://schedule2019.gdconf.com/speaker/hazelden-alan.38777)) but the session title was not confirmed. Blog: [blog.draknek.org](https://blog.draknek.org/tagged/interview) exists; no design-lessons post confirmed. Also a casual chat: [DialogBoxLive 90](https://www.youtube.com/watch?v=PiXjZkPOb2c) [S].
- **Hazelden or Lavelle using solvers in design.** [U] No source confirmed it. The Snowman Q&A describes hand design plus playtesting. Do not repeat this claim.
- **Jack Lance design writing.** [U] No essays found. Tributes ([Puzzles for Progress](https://www.puzzlesforprogress.net/post/the-puzzling-xlnc-of-jack-lance-1997-2023), [Puzzle Wiki](https://www.puzzles.wiki/wiki/Jack_Lance)) describe him as a game, logic and hunt puzzle designer, many games in PuzzleScript. I found no evidence he made Recursed; check before crediting.
- **Bennett Foddy on puzzles.** [U] His talks are about difficulty and frustration, not puzzle construction.
- **Snakebird designers' talk.** [U] Only a short development-history blog post ([Game Developer](https://gamedeveloper.com/production/snakebird-development-images-and-history)).
- **The Witness design posts on the-witness.net.** [U] Not found by search.
- **Arvi Teikari podcast on puzzle systems** (Nice Games Club, November 2024). [S] Listed on [Chartable](https://chartable.com/podcasts/nice-games-club) as covering freedom versus constraint and puzzle sequencing; episode number not confirmed.
- **Thinky Direct.** [V] Exists, but it is a trailer showcase, not teaching. Low value for method; [Hazelden's monthly column](https://thinkygames.com/features/alan-hazeldens-thinky-third-thursday/) is the better Thinky Games habit.
- **A formal analysis of Pokémon ice puzzles as a graph of rest positions.** [U] None found. Section (c) builds it from T5.

---

## (b) Core concepts

Attribution follows the source tags above. Lines marked *(practice)* are standard craft, not
taken from a verified source.

### 1. Discover puzzles in the rules, do not invent them on top

Blow (#3, #4): treat the mechanic as a system to interrogate. Ask it questions, watch the
answers, keep the surprising ones. Martin (#6) is the same idea as a procedure: play until an
interaction surprises you, then build a room that forces it.

- **Room: "Boomerang overshoot."** Boomerang stops you at the far wall *past where you started*.
  Put the only exit one tile beyond the start along the slide line. A plain slide can never reach
  it; the reverse-arrow can. The insight is the rule itself.
- **Room: "The shocking pond."** A beam touching water shocks the whole connected body. Two pools
  that look separate are joined by one water tile behind a wall. A weak enemy blocks the near
  pool; your only clear laser shot is at the far pool. The aha: shooting the far pool kills the
  enemy in the near one. Check the connectivity rule in the rules (`src/rules/`) (cells joined side by side)
  before building it.

### 2. One idea per room, minimal elements

Traynor (#1): simplify each puzzle as far as it goes while still showing the mechanic; but warns
that oversimplifying leaves no real challenge. Martin (#6): state the point in one sentence.
A fan analysis of Parabox's tutorial puts it as at most one new concept per level [S].

Test for every element in a room: delete it. If the solution is unchanged, it was noise
*(practice)*.

- **Room: two elements only.** One spring, one light box, walls. The spring launches whatever is
  in front of it only when the way ahead is free. Aha: you must clear the lane first, then use
  the box as a stopper so the spring launches *you* to the right tile.
- **Room: sticky alone.** Puddle, one light box, one goal tile not on any slide stop. Sticky glues
  the box to you; it comes along until the first move it cannot follow, and drops there. The only
  way to place it is to make a move it cannot follow.

### 3. The catch: an apparent contradiction

GMTK (#7): the good puzzle presents what looks impossible. The player must find the rule that
dissolves the contradiction.

- **Room: "Doors need two buttons, you have one box."** Red door opens only while both red
  buttons are held (AND). One box, one player. You can stand on a button, but then you cannot pass
  through the door. The resolution: a red laser catcher counts as a red button. Aim a turret beam
  at it.
- **Room: "You must cross the beam."** A turret beam kills you on its lane. Hide makes beams pass
  over you while the world takes one step. The contradiction dissolves only if the player also
  times what is on their tile when they return.

### 4. Teach, develop, twist, drop

GMTK (#8), from Nintendo's kishotenketsu. Anthropy (#19): levels teach the rules, then challenge
the player to use them. Blow (#3): teach without words, the room is the explanation.

A run for **relays**:

1. *Teach:* one turret, one red relay on the beam's path, a red door. Nothing can go wrong.
2. *Develop:* a piece on the relay keeps the beam off it. Room where a box sits on the relay at
   start; you must push it away.
3. *Twist:* the relay is also on the path you need the beam to continue along (the beam goes on
   past a relay), so the same beam holds a relay and then ends on a catcher of the same colour:
   two presses from one beam.
4. *Drop:* move on. Use relays later only as one part of a bigger room.

### 5. Misdirection, false solutions and near misses

Blow (#3): rooms that lure the obvious move. A near miss is a sequence that works for every
element but one *(practice)*. It is the best kind of difficulty because the player learns from
it. A red herring that is pure clutter is the worst kind, see concept 2.

- **Room: "Almost."** Three light boxes, three buttons. The obvious push order fills two buttons
  and leaves the third box frozen against a wall (a freeze deadlock, section c). The real order
  starts with the box that looks least relevant.
- **Room: "Free door."** A heavy box sits next to a green door. Heavy boxes hold doors open when in
  them. The bait: get the heavy box into the door (needs Dive). The real answer: the door just
  needs the two green buttons; the heavy box is the stopper you need on ice.

### 6. Every element should do work (dead pieces versus decoys)

*(practice)* A **dead piece** does nothing in any solution and no near miss uses it: cut it. A
**decoy** sustains a near miss: keep it, but only one per room. Kim (#11): too easy disappoints,
too hard discourages; decoys are a dial on that.

### 7. Uniqueness versus elegance

Traynor (#1, #2): prefer what makes interesting puzzles and what is easy to reason about.
Zachtronics (#12) shows the opposite pole: many valid answers. For closed rooms *(practice)*:

- Unique *insight* matters more than a unique *move list*. Two orderings of the same idea are
  fine; a second, dumber idea that also works is a bug (a "cheese").
- A cheese usually means one element can be used in a role you did not intend. Either cut it or
  make that role the real puzzle.

- **Room: cheese check for springs.** Spring rooms leak because springs launch boxes, enemies and
  movers too. After building one, ask: can I stand somewhere else and let the spring carry a box
  to the button for me?

### 8. Checkpoints of understanding

Hazelden (#14): the main skill is a model of what the player already understands. Each room
should end with the player knowing one new true thing about the system *(practice)*. Write it
down per room, as one sentence, in the level file or REGISTER.

- "Water stops light boxes but not heavy boxes."
- "Hidden, you survive a shocked pool."

If two consecutive rooms have the same sentence, cut or merge one.

### 9. Design backwards

Martin (#6) and the Baba note (#18): start from the interaction or the final state, then work
back to the start. For wee *(practice)*:

1. Draw the final state: player on exit, doors open, boxes on buttons.
2. Undo moves one at a time, choosing reverse moves that look unlikely from the start.
3. Stop when the start position hides the insight.
4. Then play it forwards, and run a solver (concept 10) to find cheeses.

Pushing is irreversible, so "reverse" moves are pulls. A pull-based reverse search is how many
Sokoban generators work; T7 and T8 enumerate forward instead.

### 10. Solvers as a design tool

T7 and T8: generate, solve, evaluate. Murase et al. found survivors good but sometimes dull: a
solver finds solvability, not interest. Anthropy-adjacent tooling measures difficulty as the
number of states a solver needs, which does not always match human judgement [S].

For wee *(practice)*: the rules (`src/rules/`) is pure and deterministic, which is exactly what a breadth-first
solver needs. Hash `gameText()` state, BFS over inputs (four slides plus each power key), report
shortest solution length and the number of distinct solutions up to that length. Use it for:

- **Cheese finding:** any solution shorter than yours is a bug or a better room.
- **Dead piece finding:** remove each piece, re-solve; unchanged answer means dead piece.
- **Not for difficulty.** Playtest that.

Real-time movers break the BFS (the state depends on ticks, not inputs). Solve rooms with only
on-input pieces, or include the tick in the state.

### 11. Reset and undo

SSR (#20) ships undo and restart. Snakebird and Baba allow undoing every action, keeping the
focus on trying ideas rather than dying [S]. wee has R and checkpoints only.
*(practice)* Without undo, every irreversible push costs a full replay, so rooms must be shorter
or need fewer committed moves. Decide this before tuning difficulty: an undo button changes what
a fair room is. Input replay (already a layer-1 rule) makes undo cheap: replay the log minus one.

### 12. Ordering and curves

Hazelden (#16): when stuck, the player should have somewhere else to go. Traynor (#1): move the
hardest rooms to optional content. GMTK (#8): one mechanic per arc. *(practice)* Sort rooms by
the sentence in concept 8, not by solve time: a room is in the right place when every sentence
it relies on came earlier.

---

## (c) Ice sliding and Sokoban, specifically

### The graph of rest positions

On ice the player is not on a grid; you are on a **graph** *(practice, formalised in T5)*:

- Nodes: tiles where a slide can end (one tile before a block, a box, a closed door, water when
  not swimming, a Hook tile, the spring's launch end).
- Edges: one slide from a node in a direction.
- Minimum moves is a shortest path on this graph (T5).

Design with the graph drawn. Usually 8 to 20 stops is a whole room. Rules of thumb:

- **Count reachable stops from the start.** Under five, the room is a corridor. Over thirty, the
  player cannot hold it in their head.
- **Look for one-way edges.** Ice makes many edges one-directional: A slides to B, but B slides
  somewhere else. One-way tiles make it explicit. Rooms that matter usually have a one-way commit
  near the end.
- **Every element changes the graph.** A box moved is a stop created or destroyed. An open door
  deletes a stop. That is the whole design space: puzzles are about editing the graph.

### Stoppers

Pokémon's Ice Path uses rocks pushed into holes that become stopping points on the floor below,
and Snowpoint Temple uses rough tiles as extra stops [S, walkthroughs:
[StrategyWiki](https://strategywiki.org/wiki/Pok%C3%A9mon_Gold_and_Silver/Ice_Path),
[LP Archive](https://lparchive.org/Pokemon-Crystal-(by-Crosspeice)/Update%2041/)]. Your
equivalents:

| Stopper | How it appears in wee | Cost to the player |
|---|---|---|
| Light box | pushed into place, slides till a block (PushPush, T1) | placing it on the right tile is the puzzle |
| Heavy box | only Dive moves it | needs Dive; a fixed stopper that is movable once |
| Closed door | appears when buttons release | a stop that exists only in some states |
| Water | stops you unless swimming | toggling Swim turns stops on and off |
| Hook tile | stops you only with Hook | a power-gated stop |
| Moving block | stops a slide, moves | timed stop, avoid in BFS-solved rooms |
| Sticky | you stop at whatever you meet | a one-shot "stop on contact" |

- **Room: "Make your own stop."** Goal on open ice with no adjacent wall. One light box. Push the
  box so it lands one past the goal along a lane, then slide into the box. You stop on the goal.
- **Room: "Stops that come and go."** Blue door between you and the exit lane. Standing on the
  blue button opens it (deleting a stop); leaving closes it (creating a stop). The route needs the
  door closed for one slide and open for another.

### Your box is PushPush, and that matters

A light box slides to the end of its free range with you stopping behind it. That is exactly
PushPush (T1), NP-hard. Consequences *(practice)*:

- Two or three light boxes already give rooms whose state space explodes. You do not need many
  pieces for depth. SSR (#20) is the proof by example.
- Box positions are also rest-graph edits, so every push changes where you can stop next. Pushes
  and slides interleave: the real state is (player stop, box positions, door states).
- **Boomerang with a box:** you reverse mid-slide, the box keeps going. Box and player separate
  in one move: the box goes one way to a wall, you go back past your start. That is a move no
  plain Sokoban has.

- **Room: "Split."** Box in a lane, button at the far end, exit behind you past the start. Push,
  reverse mid-slide: the box reaches the button, you reach the exit tile beyond your start.

### Deadlocks, in wee's terms

From T9 and T10, adapted *(practice)*:

- **Dead squares (simple deadlock).** A tile from which a box can never reach any goal. With
  sliding boxes, these are much more common than in Sokoban: a box can only stop against
  something, so most open-ice tiles are unreachable for boxes at all. Precompute them in the
  editor: for each tile, can a box come to rest here?
- **Freeze deadlock.** A box that can no longer be moved, not on a button. On ice, a box in a
  corner is frozen; a box against a wall can only slide along it.
- **Corral deadlock.** A region you cannot enter whose boxes can still move but never reach a
  button. Water does this to you without Swim; a closed door does it whenever its buttons release.

Why they matter for design: a deadlock without reset or undo is a soft lock. Either make every
deadlock visibly obvious the moment it happens, or give undo (concept 11). A deadlock the player
does not notice for twenty moves is the worst experience a push puzzle can give.

A deliberate deadlock is also a tool: it is the cleanest near miss (concept 5).

### Doors as AND gates

T3 and T4 build hardness proofs out of tiny rooms: AND, OR, choice, switch-operated doors. Your
colour wiring is AND by construction (every button of a colour must be held). OR comes free:
two different paths to the same door. *(practice)* Sketch rooms as gadget diagrams first:

- **AND:** two red buttons, one held by a box, one by a catcher. Both needed.
- **Latch:** a heavy box in a door holds that colour's doors open regardless of buttons. That is
  a one-way commit: once you Dive it in, the door is permanently open.
- **Mutual exclusion:** a box that can sit on button A or button B, not both, with doors that
  need A for one stretch and B for the next.

### Springs, triangles, one-way tiles

- Springs are stops that become launches: anything stopping in front of one leaves again, if the
  way ahead is free. Model the tile in front as a node with a forced outgoing edge.
- Triangles turn slides 90 degrees: they make the graph non-planar-looking from the player's view,
  which is where most "how did I end up here" moments come from. One triangle per room until the
  player has seen several.
- One-way tiles make commits explicit. Put one where you want the room to say "this step
  cannot be taken back".

- **Room: "Spring relay."** Spring fires a light box across the room only when the lane is free.
  A weak enemy patrols that lane on the input clock. Each of your slides advances it. Get the
  timing so the lane is empty on the slide when the box arrives in front of the spring.

### Lasers, water, hide

- **Beams are always on and recomputed every tick.** A beam is an edge in a second graph: what it
  touches. Moving a box changes both graphs at once. *(practice)* Draw both.
- **Water couples distant tiles** (the shock fills the whole connected body). Use it once as the
  insight, then as a hazard.
- **Hide trades one world step for invulnerability**, with a squash risk on return. It is the
  only action that changes the world without moving you. That makes it a "wait" move: useful for
  timing puzzles with on-input pieces.

- **Room: "Shock the pool, survive it."** You must cross a pool to reach a button, while a weak
  enemy swims in it. Shoot the water mid-slide (Laser) from the bank: the enemy dies. But a turret
  beam crosses the pool every few steps. Hide in the water as it crosses.
- **Room: "Box on the relay."** A box on a relay keeps the beam off it; the beam must pass through
  the relay to reach a catcher. Pushing the box off the relay with a slide is easy; the box then
  lands on the only stop near the exit. Choose which use of the box you can afford.

---

## (d) Exercises

Do them in order. Write one line per room per exercise in a notebook: the room's sentence
(concept 8), and one thing that surprised you.

1. **Play Stephen's Sausage Roll, the first area (about 10 rooms).** For each room write: the
   single new fact, which element looked like a decoy, and the first wrong move you made. Stop
   when two consecutive rooms teach the same fact, and note how the game avoids that.
2. **Play A Good Snowman Is Hard to Build or Cosmic Express, first 10 rooms.** For each room,
   delete one element in your head. Does the room still work? Count the rooms where every element
   is load-bearing.
3. **Play the first world of Patrick's Parabox.** Write which rooms are "showcase" and which are
   "stump" in Traynor's sense (#1). Then watch #1.
4. **Draw three Pokémon ice rooms as rest graphs** (Ice Path B1F and Snowpoint Temple from the
   walkthroughs). Count nodes and one-way edges. Note which stops are walls, rocks, rough tiles.
5. **Two-element rooms.** Design five wee rooms, each using exactly two element types beyond
   walls and ice: (box, button), (spring, box), (sticky, box), (relay, door), (water, laser). Each
   must have one sentence. Run each past someone; if they solve it in under a minute without a
   wrong move, it was a corridor.
6. **One arc.** Take relays or springs and build the four-room arc from concept 4 (teach,
   develop, twist, drop). Playtest the arc, not the rooms.
7. **Backwards design.** Pick the boomerang split (section c). Draw the solved state, unwind four
   moves, and stop at the first start position that hides the split. Compare with the room you
   would have drawn forwards.
8. **Write the solver.** BFS over the rules (`src/rules/`) states keyed by `gameText()`, on-input pieces only.
   Run it on your ten rooms. Record shortest length, number of shortest solutions, and every
   piece whose removal leaves the answer unchanged. Fix each cheese.
9. **Deadlock pass.** For each box room, mark every dead square a box can enter. If a player can
   create a deadlock without seeing it, either make it visible or add undo. Decide undo for the
   whole game here.
10. **Order the set.** Put the ten rooms in an order where each room's sentence relies only on
    earlier sentences. Move the two hardest to optional. Watch #8 and #16 after, and compare.

Optional reading when you hit a specific problem: T5 for minimum stoppers on open ice, T3 for
gadget rooms, T7 and T8 if you ever want generated rooms to test against.
