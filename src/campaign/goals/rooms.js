// Side goals about the room as built (register 734): many berries, all eaten (702), and no bare floor.
export const ROOM_GOALS = {
  // A win eats every berry, so the berries in the room are the berries eaten.
  fiveBerries: {
    text: 'Eat 5 or more berries.',
    short: ['≥5', { el: 'berry' }],
    judge: room => room.cells.filter(c => c === 'goal').length >= 5,
  },
  // Every tile holds something: a block, a piece, a switch, a berry or the blob; nothing is bare floor.
  noEmptySpace: {
    text: 'No bare floor: every tile holds something.',
    short: ['no', 'floor'],
    judge: room => room.cells.every((c, i) => c || room.entities.some(e => !e.dead && e.y * room.w + e.x === i) || (room.start && room.start.y * room.w + room.start.x === i)),
  },
};
