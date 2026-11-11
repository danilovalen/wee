// The blob's own words (docs/THEME.md rule 18, register 844): it speaks only in its album, under a photo it has
// earned, cutesy and sometimes resentful. A caption is flavour, never an instruction: the achievement's own
// line still says what to do. Every line here is a draft until docs/THEME_COPY.md marks it kept.
export const CAPTIONS = {
  first: 'My first berry, and somebody watched me eat it.',
  half: 'Halfway through, and nobody has said thank you.',
  all: 'Every room is done, so now they will build more.',
  shelf: 'A full shelf of stars that I am not allowed to keep.',
  lab: 'The whole lab has stars on it, and I still sleep in a jar.',
  challenge: 'They called it a challenge, and then they took notes.',
  pieces: 'I have now been hit by one of everything.',
  cashback: 'Ten stars went on a new coat, and it was worth it.',
  moveit: 'It was a tiny room and a very long walk.',
  oneshot: 'One move, straight in, and nobody clapped.',
  gateway: 'So many doors, and every one has shut on me once.',
  guardrails: 'Nothing in there could hurt me, which felt like a trick.',
  deadly: 'Every wrong step was the last one, and I counted them.',
  silver: 'Four side goals in one go, all for a berry.',
  score: 'The number got bigger, and the berries stayed the same size.',
};
// The caption under an achievement's photo: its own, or the one every score step shares.
export const caption = id => CAPTIONS[id] || (/^score\d+$/.test(id) ? CAPTIONS.score : '');
