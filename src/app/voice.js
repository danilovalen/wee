// The blob's own words (docs/THEME.md rule 18, register 844): it speaks only in its album, under a photo it has
// earned, cutesy and sometimes resentful. A caption is flavour, never an instruction: the achievement's own
// line still says what to do. Every line here is a draft until docs/THEME_COPY.md marks it kept.
export const CAPTIONS = {
  first: 'My first berry; somebody watched me eat it.',
  half: 'Halfway; nobody said thank you.',
  all: "Every room done; they're building more, aren't they?",
  shelf: 'A full shelf of stars, none of them mine.',
  lab: 'Stars on every level; I still sleep in a jar.',
  challenge: 'A challenge; somebody took notes the whole time.',
  pieces: 'Hit by one of everything; now I know.',
  cashback: 'Ten stars on a new coat, worth it.',
  moveit: 'Tiny room, very long walk.',
  oneshot: 'One move, straight in, no applause.',
  gateway: 'Every door here has shut on me once.',
  guardrails: 'Nothing in there could hurt me: suspicious.',
  deadly: 'Every wrong step was the last one; I counted.',
  silver: 'Four side goals in one Run, for one berry.',
  score: "The number keeps growing; the berries don't.",
};
// The caption under an achievement's photo: its own, or the one every score step shares.
export const caption = id => CAPTIONS[id] || (/^score\d+$/.test(id) ? CAPTIONS.score : '');
