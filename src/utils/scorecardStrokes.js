import { courseHoles, calc9HoleHandicap } from '../constants';

export const getHolesForWeek = (week) => {
  if (!week) return courseHoles.slice(0, 9);
  return week.nineHoles === 'back' ? courseHoles.slice(9, 18) : courseHoles.slice(0, 9);
};

// Returns an array of 9 numbers — strokes (dots) the player gets on each hole, in tee order.
// Re-ranks the played 9 holes 1..9 by their absolute handicapIndex, then allocates strokes
// using the player's 9-hole handicap (capped at 13 by calc9HoleHandicap).
export const getStrokesPerHole = (playerHandicap18, week) => {
  const holes = getHolesForWeek(week);
  if (playerHandicap18 == null || isNaN(playerHandicap18)) {
    return holes.map(() => 0);
  }

  const hcp9 = calc9HoleHandicap(playerHandicap18);
  if (hcp9 <= 0) return holes.map(() => 0);

  // Re-rank the 9 played holes 1..9 (lowest handicapIndex = rank 1)
  const sortedByDifficulty = [...holes]
    .map((h, idx) => ({ idx, handicapIndex: h.handicapIndex }))
    .sort((a, b) => a.handicapIndex - b.handicapIndex);

  const rankByIdx = new Map();
  sortedByDifficulty.forEach((h, rank) => rankByIdx.set(h.idx, rank + 1));

  const baseline = Math.floor(hcp9 / 9);
  const extraCount = hcp9 % 9;

  return holes.map((_, idx) => {
    const rank = rankByIdx.get(idx);
    return baseline + (rank <= extraCount ? 1 : 0);
  });
};
