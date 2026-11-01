// Calculate 9-hole handicap from 18-hole handicap
// Formula: round((handicap18/2)*(slope/113)+(courseRating-par))
// Arlington Lakes Black-Front (9 holes): Slope=123, Course Rating=33.1, Par=34
// Maximum 9-hole handicap is capped at 13
export const calc9HoleHandicap = (handicap18) => {
  const slope = 123;
  const standardSlope = 113;
  const courseRating = 33.1;
  const par = 34;
  const MAX_HANDICAP = 13;
  return Math.min(Math.round((handicap18 / 2) * (slope / standardSlope) + (courseRating - par)), MAX_HANDICAP);
};

// Calculate team handicap based on USGA format-specific allowances
// playerHandicaps: array of 9-hole course handicaps (already calculated via calc9HoleHandicap)
// handicapFormat: 'scramble' | 'fourBall' | 'shamble' | 'aggregate'
export const calcTeamHandicap = (playerHandicaps, handicapFormat) => {
  const hcps = [...playerHandicaps].filter(h => h != null);
  if (hcps.length === 0) return 0;

  // Sort ascending (lowest handicap first)
  hcps.sort((a, b) => a - b);

  switch (handicapFormat) {
    case 'scramble': {
      // USGA Scramble Allowance
      // 2-person: 35% of low + 15% of high
      // 3-person: 25% of low + 15% of mid + 10% of high
      // 4-person: 20% of A + 15% of B + 10% of C + 5% of D
      if (hcps.length === 2) {
        return Math.round(0.35 * hcps[0] + 0.15 * hcps[1]);
      } else if (hcps.length === 3) {
        return Math.round(0.25 * hcps[0] + 0.15 * hcps[1] + 0.10 * hcps[2]);
      } else {
        return Math.round(0.20 * hcps[0] + 0.15 * hcps[1] + 0.10 * hcps[2] + 0.05 * hcps[3]);
      }
    }
    case 'fourBall': {
      // USGA Four-Ball (Best Ball) Allowance: 85% of each player's course handicap
      // Team handicap = lowest adjusted handicap in the team
      const adjusted = hcps.map(h => Math.round(h * 0.85));
      return Math.min(...adjusted);
    }
    case 'shamble': {
      // Shamble: 75% of each player's course handicap, summed for team total
      return hcps.reduce((sum, h) => sum + Math.round(h * 0.75), 0);
    }
    case 'aggregate':
    default: {
      // Aggregate: sum of all full course handicaps (100%)
      return hcps.reduce((sum, h) => sum + h, 0);
    }
  }
};

// Generate season weeks (2nd week of April through last week of August 2026)
export const generateSeasonWeeks = () => {
  const weeks = [];
  const startDate = new Date('2026-04-13');
  let currentDate = new Date(startDate);
  let weekNum = 1;
  let isFrontNine = true;

  while (currentDate <= new Date('2026-08-31')) {
    const dateStr = currentDate.toISOString().split('T')[0];
    // Skip Memorial Day (May 25, 2026) — no league play.
    // Still advance the front/back toggle so the alternation tracks the
    // calendar rather than the count of played weeks.
    if (dateStr === '2026-05-25') {
      currentDate.setDate(currentDate.getDate() + 7);
      isFrontNine = !isFrontNine;
      continue;
    }
    weeks.push({
      id: weekNum,
      date: dateStr,
      nineHoles: isFrontNine ? 'front' : 'back',
      teeSheet: [],
      scoresEntered: false,
      moneyEntered: false,
      weatherCancelled: false
    });
    currentDate.setDate(currentDate.getDate() + 7);
    isFrontNine = !isFrontNine;
    weekNum++;
  }
  return weeks;
};

// Fixed-partner scheduling rule.
// When auto-generating tee sheets, the anchor player is guaranteed to be grouped
// with at least one of the allowed partners (and never grouped with anyone outside
// that list). Names must match the roster exactly.
export const SCHEDULE_FIXED_PARTNER = {
  anchorName: 'Justin Shook',
  allowedPartnerNames: [
    'Rob Conley',
    'Andy DeTolve',
    'Chris Gronow',
    'Erik Latkow',
    'Steve Oleary',
    'Jack Linden'
  ]
};

// 12 Tee times from 3:30 PM to 5:20 PM in 10-minute intervals
export const teeTimes = [
  '3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM',
  '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'
];

// Arlington Lakes Golf Club - All 18 holes (Black Tees - Par 68, 5252 yards)
// handicapIndex is the 1-18 stroke-allocation rank from the Black Tees scorecard (1 = hardest)
export const courseHoles = [
  { number: 1, par: 4, yards: 325, handicapIndex: 7 },
  { number: 2, par: 5, yards: 480, handicapIndex: 1 },
  { number: 3, par: 3, yards: 140, handicapIndex: 17 },
  { number: 4, par: 4, yards: 389, handicapIndex: 5 },
  { number: 5, par: 3, yards: 172, handicapIndex: 13 },
  { number: 6, par: 4, yards: 393, handicapIndex: 3 },
  { number: 7, par: 4, yards: 314, handicapIndex: 9 },
  { number: 8, par: 3, yards: 122, handicapIndex: 15 },
  { number: 9, par: 4, yards: 320, handicapIndex: 11 },
  { number: 10, par: 4, yards: 374, handicapIndex: 4 },
  { number: 11, par: 3, yards: 187, handicapIndex: 14 },
  { number: 12, par: 4, yards: 371, handicapIndex: 6 },
  { number: 13, par: 4, yards: 264, handicapIndex: 10 },
  { number: 14, par: 3, yards: 143, handicapIndex: 18 },
  { number: 15, par: 4, yards: 270, handicapIndex: 12 },
  { number: 16, par: 4, yards: 333, handicapIndex: 8 },
  { number: 17, par: 3, yards: 180, handicapIndex: 16 },
  { number: 18, par: 5, yards: 475, handicapIndex: 2 }
];

// Money categories
export const moneyCategories = [
  { id: '1st', name: '1st Place', icon: '🥇' },
  { id: '2nd', name: '2nd Place', icon: '🥈' },
  { id: '3rd', name: '3rd Place', icon: '🥉' },
  { id: 'gross', name: 'Low Gross', icon: '💪' },
  { id: 'other', name: 'Other / Hole Prize', icon: '🏆' },
  { id: 'ctp1', name: 'CTP #1', icon: '🎯' },
  { id: 'ctp2', name: 'CTP #2', icon: '🎯' },
  { id: 'ctp3', name: 'CTP #3', icon: '🎯' }
];

// ─── League Championship flights ───
// The Championship rounds. Money won in these weeks is left out of the flight
// seeding so the flights lock in before Round One and don't reshuffle as the
// final payouts get entered.
export const CHAMPIONSHIP_WEEK_IDS = [18, 19, 20];

// Only league members are flighted — substitutes don't play the Championship.
export const FLIGHT_ELIGIBLE_TYPES = ['full-time'];

// A / B / C flights, seeded off the season money list.
export const leagueFlights = [
  { id: 'A', name: 'A Flight', startRank: 1, endRank: 12, description: 'Top 12 money leaders' },
  { id: 'B', name: 'B Flight', startRank: 13, endRank: 28, description: '13th – 28th on the money list' },
  { id: 'C', name: 'C Flight', startRank: 29, endRank: null, description: '29th and back on the money list' }
];

export const getFlightForRank = (rank) =>
  leagueFlights.find(f => rank >= f.startRank && (f.endRank === null || rank <= f.endRank)) || null;

// Season money that counts toward a player's flight seeding.
export const getFlightSeedMoney = (player, championshipWeekIds = CHAMPIONSHIP_WEEK_IDS) => {
  const excluded = new Set(championshipWeekIds.map(String));
  return Object.entries(player.weeklyMoney || {}).reduce((total, [weekId, categories]) => {
    if (excluded.has(String(weekId))) return total;
    return total + Object.values(categories || {}).reduce((sum, amount) => sum + (amount || 0), 0);
  }, 0);
};

// Rank every eligible player on season money and hand each one a flight.
// Ties on money are broken by weeks played; players level on both share a rank,
// so a genuine tie is never split across two flights (which can push a flight
// one or two players past its nominal size — that's intended).
export const calculateFlights = (players, championshipWeekIds = CHAMPIONSHIP_WEEK_IDS) => {
  const ranked = players
    .filter(p => FLIGHT_ELIGIBLE_TYPES.includes(p.type))
    .map(p => ({
      id: p.id,
      name: p.name,
      money: getFlightSeedMoney(p, championshipWeekIds),
      weeksPlayed: p.weeksPlayed || 0
    }))
    .sort((a, b) => b.money - a.money || b.weeksPlayed - a.weeksPlayed || a.name.localeCompare(b.name));

  // Nothing on the money board yet — there's no money list to flight anyone off.
  if (ranked.every(entry => entry.money === 0)) return {};

  const assignments = {};
  const rankCounts = {};
  let tieKey = null;
  let tieRank = 0;

  ranked.forEach((entry, index) => {
    const key = `${entry.money}|${entry.weeksPlayed}`;
    const rank = key === tieKey ? tieRank : index + 1;
    tieKey = key;
    tieRank = rank;
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    assignments[entry.id] = {
      rank,
      flight: getFlightForRank(rank),
      money: entry.money,
      weeksPlayed: entry.weeksPlayed
    };
  });

  Object.values(assignments).forEach(a => { a.tied = rankCounts[a.rank] > 1; });

  return assignments;
};

// ─── League Championship leaderboard ───
// The Championship is decided over the final three weeks, but only the first
// two rounds a player posts count. Those two 9-hole net scores add together
// into one 18-hole net total, and players are ranked inside their own flight.
export const CHAMPIONSHIP_ROUNDS_COUNTED = 2;

// A player's counting rounds — the first two Championship weeks they posted a
// score in, taken in schedule order.
export const getChampionshipRounds = (playerId, playerScores = [], championshipWeekIds = CHAMPIONSHIP_WEEK_IDS) => {
  const weekOrder = new Map(championshipWeekIds.map((weekId, index) => [String(weekId), index]));
  return playerScores
    .filter(s => s.player_id === playerId && weekOrder.has(String(s.week_id)))
    .sort((a, b) => weekOrder.get(String(a.week_id)) - weekOrder.get(String(b.week_id)))
    .slice(0, CHAMPIONSHIP_ROUNDS_COUNTED)
    .map(s => ({
      weekId: s.week_id,
      // Which of the three Championship rounds this was — 1, 2 or 3.
      roundNumber: weekOrder.get(String(s.week_id)) + 1,
      gross: s.gross_score,
      net: s.net_score
    }));
};

// Build the Championship standings: every flighted player grouped into A / B / C
// and ranked on the net total of the counting rounds they have posted so far,
// low to high. The standings are live — a player is ranked from the moment they
// post a round rather than only once both are in. Players further through the
// Championship rank ahead of those with fewer rounds, since a partial total is
// still going to climb. Players yet to post a round sit at the back, unranked.
export const calculateChampionshipStandings = (
  players,
  playerScores = [],
  flightAssignments = {},
  championshipWeekIds = CHAMPIONSHIP_WEEK_IDS
) => leagueFlights.map(flight => {
  const entries = players
    .filter(p => flightAssignments[p.id]?.flight?.id === flight.id)
    .map(p => {
      const rounds = getChampionshipRounds(p.id, playerScores, championshipWeekIds);
      return {
        id: p.id,
        name: p.name,
        seedRank: flightAssignments[p.id].rank,
        rounds,
        roundsPlayed: rounds.length,
        complete: rounds.length === CHAMPIONSHIP_ROUNDS_COUNTED,
        netTotal: rounds.reduce((sum, r) => sum + (r.net || 0), 0),
        grossTotal: rounds.reduce((sum, r) => sum + (r.gross || 0), 0)
      };
    })
    .sort((a, b) => {
      // Rank on what's in the book: more rounds posted comes first, and inside
      // each tier the low net leads.
      if (a.roundsPlayed !== b.roundsPlayed) return b.roundsPlayed - a.roundsPlayed;
      if (a.roundsPlayed === 0) return a.seedRank - b.seedRank || a.name.localeCompare(b.name);
      return a.netTotal - b.netTotal || a.name.localeCompare(b.name);
    });

  // Everyone with a round on the board gets a rank. Only players level on both
  // rounds played and net total share one — there are no hole-by-hole scores
  // stored to run the scorecard playoff on.
  const rankCounts = {};
  let tieKey = null;
  let tieRank = 0;

  entries.forEach((entry, index) => {
    if (entry.roundsPlayed === 0) {
      entry.rank = null;
      entry.tied = false;
      return;
    }
    const key = `${entry.roundsPlayed}|${entry.netTotal}`;
    const rank = key === tieKey ? tieRank : index + 1;
    tieKey = key;
    tieRank = rank;
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    entry.rank = rank;
  });

  entries.forEach(entry => { if (entry.rank) entry.tied = rankCounts[entry.rank] > 1; });

  return { ...flight, players: entries };
});

// Default season buy-in per player
export const DEFAULT_SEASON_BUY_IN = 150;

// Default payout templates
// Each payout's `category` drives its medal/icon and is used as the money-entry
// storage key. When a template lists more than one payout sharing the same
// category (e.g. the Championship pays multiple groups a "1st"), give each of
// those payouts a unique, dash-free `key` so their entries don't collide.
export const defaultPayoutTemplates = [
  {
    id: 'standard',
    name: 'Standard Week',
    payouts: [
      { label: '1st Place', category: '1st', amount: 90 },
      { label: '2nd Place', category: '2nd', amount: 55 },
      { label: '3rd Place', category: '3rd', amount: 35 },
      { label: 'Low Gross', category: 'gross', amount: 50 }
    ],
    sideGameTotal: 30,
    sideGameName: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    isDefault: true
  },
  {
    id: 'stableford',
    name: 'Stableford',
    payouts: [
      { label: '1st Place', category: '1st', amount: 130 },
      { label: '2nd Place', category: '2nd', amount: 70 },
      { label: '3rd Place', category: '3rd', amount: 50 }
    ],
    sideGameTotal: 30,
    sideGameName: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    isDefault: false
  },
  {
    id: 'ryder-cup',
    name: 'Ryder Cup',
    payouts: [
      { label: 'Winning Team Split', category: '1st', amount: 700 }
    ],
    sideGameTotal: 30,
    sideGameName: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    isDefault: false
  },
  {
    id: 'championship',
    name: 'Championship Final',
    payouts: [
      { label: 'Group A 1st', category: '1st', amount: 300, key: 'a1' },
      { label: 'Group A 2nd', category: '2nd', amount: 150, key: 'a2' },
      { label: 'Group B 1st', category: '1st', amount: 120, key: 'b1' },
      { label: 'Group B 2nd', category: '2nd', amount: 60, key: 'b2' },
      { label: 'Group C 1st', category: '1st', amount: 50, key: 'c1' },
      { label: 'Group C 2nd', category: '2nd', amount: 20, key: 'c2' }
    ],
    sideGameTotal: 30,
    sideGameName: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    isDefault: false
  },
  {
    id: 'no-payout',
    name: 'No Payout',
    payouts: [],
    sideGameTotal: 0,
    sideGameName: '',
    sideGameDescription: '',
    isDefault: false
  }
];

// Default template assignments for each week
export const defaultWeekTemplates = {
  1: 'standard', 2: 'standard', 3: 'standard', 4: 'standard',
  5: 'no-payout', 6: 'ryder-cup', 7: 'standard', 8: 'standard',
  9: 'standard', 10: 'standard', 11: 'standard', 12: 'standard',
  13: 'standard', 14: 'standard', 15: 'standard', 16: 'standard',
  17: 'standard', 18: 'no-payout', 19: 'no-payout', 20: 'championship'
};

// Weekly games data with payouts
export const initialWeeklyGames = [
  {
    weekId: 1,
    date: '2026-04-13',
    gameName: '2-Man Scramble',
    gameDescription: 'Teams of 2. Both players hit, pick the best shot, and both play from that spot until the ball is holed. Team handicap is adjusted.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: '2-person'
  },
  {
    weekId: 2,
    date: '2026-04-20',
    gameName: 'Throw Out 3 Worst Holes',
    gameDescription: 'Individual game. After the round, throw out your 3 highest scores.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null,
    manualNetEntry: true
  },
  {
    weekId: 3,
    date: '2026-04-27',
    gameName: 'Shamble',
    gameDescription: 'Everyone tees off, select the best drive, then each plays their own ball from that spot.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: '4-person'
  },
  {
    weekId: 4,
    date: '2026-05-04',
    gameName: 'Low Net Team Tournament',
    gameDescription: 'Teams of 4. For the first 8 holes, count the two lowest net scores. On the last hole, count all four scores.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Team Giant Skins',
    sideGameDescription: '$60 split between Giant Skins winners',
    teamType: '4-person'
  },
  {
    weekId: 5,
    date: '2026-05-11',
    gameName: 'Ryder Cup \u2013 Fourball',
    gameDescription: 'Two-player teams each play their own ball; best score counts per team.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: '2-person'
  },
  {
    weekId: 6,
    date: '2026-05-18',
    gameName: 'Ryder Cup \u2013 Singles',
    gameDescription: 'Head-to-head singles matches; team with most points wins the Ryder Cup.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 7,
    date: '2026-06-01',
    gameName: 'Special Events Night',
    gameDescription: 'There will be a game on every hole. $180 is split among all the winners. If there is no Giant Skin winner or no Greenie with a birdie, that money goes back in the pot.\n\nHole 10 – Longest Putt\nHole 11 – Greenie (must birdie)\nHole 12 – Longest Drive\nHole 13 – Closest in 2\nHole 14 – Greenie (must birdie)\nHole 15 – Closest to the 100 yard marker\nHole 16 – Closest to the pin from the fairway bunker\nHole 17 – Greenie (must birdie)\nHole 18 – Closest to the pin with a 6 iron',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 8,
    date: '2026-06-08',
    gameName: 'Best Ball / Scramble / Worst Ball',
    gameDescription: 'Each tee time will rotate between taking their best individual net score, playing a 4-man scramble, and taking their worst individual net score. The total of the 9 hole scores will be added up.\n\nTie breaker is lowest score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Low Worst Score Total',
    sideGameDescription: '$30 split between team with lowest "worst ball" total',
    teamType: '4-person'
  },
  {
    weekId: 9,
    date: '2026-06-15',
    gameName: 'Low Net / Low Gross',
    gameDescription: 'Individual stroke play using net scores (adjusted for handicap).\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 10,
    date: '2026-06-22',
    gameName: 'Player B Special',
    gameDescription: 'Players receive 2 mulligans to use on any hole for any shot.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies (No Mulligans)',
    sideGameDescription: '$10 per greenie (3 holes = $30 total) - Mulligans cannot be used on greenie holes',
    teamType: null
  },
  {
    weekId: 11,
    date: '2026-06-29',
    gameName: '1-2-3 Best Ball',
    gameDescription: 'Teams of 4. On hole 1 use the best single score, on hole 2 use the best two scores, on hole 3 use the best three scores. Repeat this rotation the whole round.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: '4-person'
  },
  {
    weekId: 12,
    date: '2026-07-06',
    gameName: 'Black, White & Green',
    gameDescription: 'Individual game. Start from the black tees, then white, then green & then repeat.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Lowest Net Score On Green Holes',
    sideGameDescription: '$60 split between players with lowest net scores on the green tee holes',
    teamType: null
  },
  {
    weekId: 13,
    date: '2026-07-13',
    gameName: 'Pick a Player',
    gameDescription: 'Before teeing off, choose another player in the league as your partner. Your score is combined with their score for the team total.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 14,
    date: '2026-07-20',
    gameName: 'Best Ball / Scramble / Worst Ball',
    gameDescription: 'Each tee time will rotate between taking their best individual gross score, playing a 4-man scramble, and taking their worst individual gross score. The total of the 9 hole scores will be added up.',
    sideGame: 'Low Worst Score Total',
    sideGameDescription: '$30 split between team with lowest "worst ball" total',
    teamType: '4-person',
    // Straight-up gross game — no handicap strokes applied. Net equals gross.
    noHandicap: true
  },
  {
    weekId: 15,
    date: '2026-07-27',
    gameName: '3 Club Challenge',
    gameDescription: 'Each player can only bring 3 clubs plus a putter. Scores are kept for low gross and low net.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 16,
    date: '2026-08-03',
    gameName: 'Low Net / Low Gross',
    gameDescription: 'Individual stroke play using net scores (adjusted for handicap).\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 17,
    date: '2026-08-10',
    gameName: 'Two Ball Low Net',
    gameDescription: 'Teams of 4. On each hole, take the two lowest net scores from the group as the team score.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: '4-person',
    // Teams enter their low net team score, so it is already net — no handicap
    // strokes are applied on top of the entered score.
    manualNetEntry: true,
    noHandicap: true
  },
  {
    weekId: 18,
    date: '2026-08-17',
    gameName: 'Championship Round One',
    gameDescription: 'Championship rounds are your best two rounds out of three weeks. You can play two of any of the three weeks, but you must declare before the round starts that the score will count towards the championship.\n\nLow Net Singles Final. A, B and C group champions to be crowned.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 19,
    date: '2026-08-24',
    gameName: 'Championship Round Two',
    gameDescription: 'Championship rounds are your best two rounds out of three weeks. You can play two of any of the three weeks, but you must declare before the round starts that the score will count towards the championship.\n\nLow Net Singles Final. A, B and C group champions to be crowned.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 20,
    date: '2026-08-31',
    gameName: 'Championship Round Three',
    gameDescription: 'Championship rounds are your best two rounds out of three weeks. You can play two of any of the three weeks, but you must declare before the round starts that the score will count towards the championship.\n\nLow Net Singles Final. A, B and C group champions to be crowned.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  }
];
