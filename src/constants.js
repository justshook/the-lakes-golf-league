// Admin password
export const ADMIN_PASSWORD = 'golf2026';

// Real player data from CSV - handicap values are 18-hole CDGA handicaps
export const initialPlayers = [
  { id: 1, name: 'Jim Blisk', phone: '708-567-7541', email: 'jimblisk10@gmail.com', handicap: 14, cdgaId: 'N/A', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 2, name: 'Troy Holler', phone: '630-849-8330', email: 'troy.holler@gmail.com', handicap: 29, cdgaId: '11714222', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 3, name: 'Steve Oleary', phone: '847-366-0655', email: 'Oleary.stephen11@gmail.com', handicap: 17, cdgaId: '11867628', availability: ['4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM'], type: 'full-time' },
  { id: 4, name: 'Andrew Binder', phone: '248-250-0571', email: 'Andrewbinder4@gmail.com', handicap: 18, cdgaId: '10908673', availability: ['4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 5, name: 'Jack Linden', phone: '815-494-3032', email: 'jack.linden@me.com', handicap: 17, cdgaId: '10459068', availability: ['4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM'], type: 'full-time' },
  { id: 6, name: 'Giuseppe Infusino', phone: '262-498-1176', email: 'gfinfusino@gmail.com', handicap: 21, cdgaId: '12272554', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 7, name: 'James Dance', phone: '312-513-1292', email: 'jdance90@gmail.com', handicap: 20, cdgaId: 'N/A', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 8, name: 'Rick Vallejo', phone: '847-652-8354', email: 'rickvallejo33@gmail.com', handicap: 41, cdgaId: '12888691', availability: ['4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 9, name: 'Dan Coldagelli', phone: '309-310-4341', email: 'dan@curvgroup.com', handicap: 6, cdgaId: '11714217', availability: ['4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM'], type: 'full-time' },
  { id: 10, name: 'Donald Burger', phone: '847-971-8335', email: 'Plumber408@comcast.net', handicap: 16, cdgaId: '10443993', availability: ['3:30 PM'], type: 'full-time' },
  { id: 11, name: 'Arvin Joshi', phone: '224-279-4472', email: 'arvinj1282@gmail.com', handicap: 23, cdgaId: '11292799', availability: ['4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 12, name: 'Andy DeTolve', phone: '312-671-6228', email: 'andydetolve@gmail.com', handicap: 11, cdgaId: '12696765', availability: ['3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 13, name: 'Steve McDermott', phone: '847-571-1491', email: 'stevemcdermott11@gmail.com', handicap: 14, cdgaId: '10443987', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 14, name: "Tim O'Malley", phone: '847-812-8508', email: 'toma101@comcast.net', handicap: 51, cdgaId: '12737223', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM'], type: 'full-time' },
  { id: 15, name: 'Jim Mueller', phone: '847-715-6953', email: 'Jmueller1020@yahoo.com', handicap: 26, cdgaId: '10443995', availability: ['3:30 PM', '3:40 PM', '3:50 PM'], type: 'full-time' },
  { id: 16, name: 'Brian Lambel', phone: '847-344-8533', email: 'lambelbrian@yahoo.com', handicap: 12, cdgaId: '10444007', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 17, name: 'Peter Bychowski', phone: '847-345-1069', email: 'chowrx@gmail.com', handicap: 28, cdgaId: '12066671', availability: ['4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 18, name: 'David DiVito', phone: '847-641-0604', email: 'David.divito@gmail.com', handicap: 19, cdgaId: '12005644', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 19, name: 'Cliff Kubek', phone: '847-404-7838', email: 'machine211@comcast.net', handicap: 18, cdgaId: '10232667', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 20, name: 'Mark Linton', phone: '630-743-8341', email: 'MarLin1964@comcast.net', handicap: 14, cdgaId: '10031189', availability: ['4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 21, name: 'Jim Fischer', phone: '847-293-8210', email: 'jtile55@aol.com', handicap: 31, cdgaId: '11463364', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM'], type: 'full-time' },
  { id: 22, name: 'Justin Shook', phone: '815-721-2475', email: 'justshook@gmail.com', handicap: 8, cdgaId: '10908682', availability: ['3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM'], type: 'full-time' },
  { id: 23, name: 'Erik Latkow', phone: '847-987-0119', email: 'Elatkow628@gmail.com', handicap: 7, cdgaId: '11811453', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM'], type: 'full-time' },
  { id: 24, name: 'David Roberts', phone: '847-207-5533', email: 'drob160@me.com', handicap: 21, cdgaId: '10502172', availability: ['3:30 PM'], type: 'full-time' },
  { id: 25, name: 'Derek Guyton', phone: '847-989-1065', email: 'derekng@comcast.net', handicap: 25, cdgaId: '10908678', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM'], type: 'full-time' },
  { id: 26, name: 'Rick Blasek', phone: '630-725-8076', email: 'Fwblasek@gmail.com', handicap: 30, cdgaId: '10908674', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM'], type: 'full-time' },
  { id: 27, name: 'Rob Kinney', phone: '847-751-0730', email: 'rfk1129@gmail.com', handicap: 19, cdgaId: '12156183', availability: ['4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 28, name: 'Brendan McDermott', phone: '847-754-0583', email: 'bmcdermott06@gmail.com', handicap: 14, cdgaId: '11811450', availability: ['4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 29, name: 'Gaeton Minella', phone: '847-514-4466', email: 'gaetonminella@sbcglobal.net', handicap: 25, cdgaId: '10443999', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM'], type: 'full-time' },
  { id: 30, name: 'Mike Krause', phone: '847-846-9369', email: 'illinijmk@aol.com', handicap: 15, cdgaId: '10444006', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM'], type: 'full-time' },
  { id: 31, name: 'Kyle Engstrom', phone: '612-816-1851', email: 'kyle.engstrom7@gmail.com', handicap: 16, cdgaId: '12745855', availability: ['3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 32, name: 'Robert Cavanaugh', phone: '847-847-8800', email: 'cavbop@aol.com', handicap: 16, cdgaId: '10908675', availability: ['3:30 PM'], type: 'full-time' },
  { id: 33, name: 'Larry Henderson', phone: '708-205-1621', email: 'larryhenderson13@comcast.net', handicap: 22, cdgaId: '10314399', availability: ['3:30 PM'], type: 'full-time' },
  { id: 34, name: 'Wil Tustin', phone: '901-833-0915', email: 'wiltustin@gmail.com', handicap: 30, cdgaId: '13278827', availability: ['4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM'], type: 'full-time' },
  { id: 35, name: 'Len Laughland', phone: '630-589-4650', email: 'lenlaughland@gmail.com', handicap: 13, cdgaId: '10443998', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM'], type: 'full-time' },
  { id: 36, name: 'Rob Conley', phone: '312-859-3877', email: 'Rob.conley247@gmail.com', handicap: 18, cdgaId: '11259430', availability: ['4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 37, name: 'John DiMasi', phone: '917-783-3065', email: 'john.dimasi@leousa.com', handicap: 15, cdgaId: '10444005', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 38, name: 'Chris Gronow', phone: '815-341-4811', email: 'gronowc@gmail.com', handicap: 8, cdgaId: '10420206', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 39, name: 'Bobby Helms', phone: '847-420-1467', email: 'bobsauto442@gmail.com', handicap: 14, cdgaId: '10314400', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM'], type: 'full-time' },
  { id: 40, name: 'Mike Helms', phone: '708-774-9446', email: 'helms.michael.j@gmail.com', handicap: 8, cdgaId: '10314386', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM'], type: 'full-time' },
  { id: 41, name: 'Phil Porter', phone: '847-361-8935', email: 'prporte23@gmail.com', handicap: 20, cdgaId: 'N/A', availability: ['3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM'], type: 'full-time' },
  { id: 42, name: 'Joe Rohde', phone: '312-560-8148', email: 'joerohde46@gmail.com', handicap: 26, cdgaId: '123456', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM'], type: 'full-time' },
  { id: 43, name: 'Jordan Frey', phone: '312-576-4398', email: 'jordanfreyiu@gmail.com', handicap: 8, cdgaId: '2602249', availability: ['4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 44, name: 'Anthony Catallo', phone: '847-401-2141', email: 'acatallo125@gmail.com', handicap: 18, cdgaId: 'N/A', availability: ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM', '4:50 PM'], type: 'substitute' },
  { id: 45, name: 'Ryan Shaw', phone: '847-868-6088', email: 'ryanshaw608@gmail.com', handicap: 3, cdgaId: '13299631', availability: ['4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' },
  { id: 46, name: 'David Isaac', phone: '847-804-4952', email: 'disaac19@gmail.com', handicap: 18, cdgaId: 'N/A', availability: ['4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'], type: 'full-time' }
].map(p => ({ ...p, weeksPlayed: 0, totalMoney: 0, weeklyMoney: {} }));

// Calculate 9-hole handicap from 18-hole handicap
// Formula: roundup((handicap18/2)*(slope/113)+(courseRating-par))
// Arlington Lakes: Slope=122, Course Rating=66.0, Par=68
// Maximum 9-hole handicap is capped at 13
export const calc9HoleHandicap = (handicap18) => {
  const slope = 122;
  const standardSlope = 113;
  const courseRating = 66.0;
  const par = 68;
  const MAX_HANDICAP = 13;
  return Math.min(Math.ceil((handicap18 / 2) * (slope / standardSlope) + (courseRating - par)), MAX_HANDICAP);
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
    // Skip Memorial Day (May 25, 2026) — no league play
    if (dateStr === '2026-05-25') {
      currentDate.setDate(currentDate.getDate() + 7);
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

// 12 Tee times from 3:30 PM to 5:20 PM in 10-minute intervals
export const teeTimes = [
  '3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM',
  '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'
];

// Arlington Lakes Golf Club - All 18 holes (Black Tees - Par 68, 5252 yards)
export const courseHoles = [
  { number: 1, par: 4, yards: 325 },
  { number: 2, par: 5, yards: 480 },
  { number: 3, par: 3, yards: 140 },
  { number: 4, par: 4, yards: 389 },
  { number: 5, par: 3, yards: 172 },
  { number: 6, par: 4, yards: 393 },
  { number: 7, par: 4, yards: 314 },
  { number: 8, par: 3, yards: 122 },
  { number: 9, par: 4, yards: 320 },
  { number: 10, par: 4, yards: 374 },
  { number: 11, par: 3, yards: 187 },
  { number: 12, par: 4, yards: 371 },
  { number: 13, par: 4, yards: 264 },
  { number: 14, par: 3, yards: 143 },
  { number: 15, par: 4, yards: 270 },
  { number: 16, par: 4, yards: 333 },
  { number: 17, par: 3, yards: 180 },
  { number: 18, par: 5, yards: 475 }
];

// Money categories
export const moneyCategories = [
  { id: '1st', name: '1st Place', icon: '🥇' },
  { id: '2nd', name: '2nd Place', icon: '🥈' },
  { id: '3rd', name: '3rd Place', icon: '🥉' },
  { id: 'gross', name: 'Low Gross', icon: '💪' },
  { id: 'ctp1', name: 'CTP #1', icon: '🎯' },
  { id: 'ctp2', name: 'CTP #2', icon: '🎯' },
  { id: 'ctp3', name: 'CTP #3', icon: '🎯' }
];

// Default season buy-in per player
export const DEFAULT_SEASON_BUY_IN = 150;

// Default payout templates
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
      { label: 'Group A 1st', category: '1st', amount: 300 },
      { label: 'Group A 2nd', category: '2nd', amount: 150 },
      { label: 'Group B 1st', category: '1st', amount: 120 },
      { label: 'Group B 2nd', category: '2nd', amount: 60 },
      { label: 'Group C 1st', category: '1st', amount: 50 },
      { label: 'Group C 2nd', category: '2nd', amount: 20 }
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
  13: 'standard', 14: 'stableford', 15: 'standard', 16: 'standard',
  17: 'standard', 18: 'no-payout', 19: 'championship', 20: 'standard'
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
    gameDescription: 'Each hole has a contest (longest drive, closest to pin, longest putt, etc.). Each contest has a cash prize.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
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
    gameName: 'Stableford Points',
    gameDescription: 'Individual scoring system. Earn points based on net score: Eagle +5, Birdie +3, Par +1, Bogey -1, Double Bogey -2. Goal is to score the most points.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
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
    teamType: '4-person'
  },
  {
    weekId: 18,
    date: '2026-08-17',
    gameName: 'Championship Seeding',
    gameDescription: 'Low Net Singles Tournament. Your net score will determine which group you qualify for in the final.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 19,
    date: '2026-08-24',
    gameName: 'Championship Final',
    gameDescription: 'Low Net Singles Final. A, B and C group champions to be crowned.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: null
  },
  {
    weekId: 20,
    date: '2026-08-31',
    gameName: '2-Man Scramble',
    gameDescription: 'Teams of 2. Both players hit, pick the best shot, and both play from that spot until the ball is holed. Team handicap is adjusted.\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)',
    teamType: '2-person'
  }
];
