import React, { useState, useEffect } from 'react';

// Real player data from CSV - handicap values are 18-hole CDGA handicaps
const initialPlayers = [
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
const calc9HoleHandicap = (handicap18) => {
  const slope = 122;
  const standardSlope = 113;
  const courseRating = 66.0;
  const par = 68;
  return Math.ceil((handicap18 / 2) * (slope / standardSlope) + (courseRating - par));
};

// Generate season weeks (2nd week of April through last week of August 2026)
const generateSeasonWeeks = () => {
  const weeks = [];
  const startDate = new Date('2026-04-13');
  let currentDate = new Date(startDate);
  let weekNum = 1;
  let isFrontNine = true;

  while (currentDate <= new Date('2026-08-31')) {
    weeks.push({
      id: weekNum,
      date: currentDate.toISOString().split('T')[0],
      nineHoles: isFrontNine ? 'front' : 'back',
      teeSheet: [],
      scoresEntered: false,
      moneyEntered: false
    });
    currentDate.setDate(currentDate.getDate() + 7);
    isFrontNine = !isFrontNine;
    weekNum++;
  }
  return weeks;
};

// 12 Tee times from 3:30 PM to 5:20 PM in 10-minute intervals
const teeTimes = [
  '3:30 PM', '3:40 PM', '3:50 PM', '4:00 PM', '4:10 PM', '4:20 PM',
  '4:30 PM', '4:40 PM', '4:50 PM', '5:00 PM', '5:10 PM', '5:20 PM'
];

// Arlington Lakes Golf Club - All 18 holes (Black Tees - Par 68, 5252 yards)
const courseHoles = [
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
const moneyCategories = [
  { id: '1st', name: '1st Place', icon: '🥇' },
  { id: '2nd', name: '2nd Place', icon: '🥈' },
  { id: '3rd', name: '3rd Place', icon: '🥉' },
  { id: 'ctp1', name: 'CTP #1', icon: '🎯' },
  { id: 'ctp2', name: 'CTP #2', icon: '🎯' },
  { id: 'ctp3', name: 'CTP #3', icon: '🎯' }
];

// Weekly games data with payouts
const initialWeeklyGames = [
  {
    weekId: 1,
    date: '2026-04-13',
    gameName: '2-Man Scramble',
    gameDescription: 'Teams of 2. Both players hit, pick the best shot, and both play from that spot until the ball is holed. Team handicap is adjusted.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 2,
    date: '2026-04-20',
    gameName: 'Throw Out 3 Worst Holes',
    gameDescription: 'Individual game. After the round, throw out your 3 highest scores.\n\nPayouts ($230 total):\n• Low Net 1st: $90\n• Low Net 2nd: $55\n• Low Net 3rd: $35\n• Low Gross 1st: $50\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 3,
    date: '2026-04-27',
    gameName: 'Shamble',
    gameDescription: 'Everyone tees off, select the best drive, then each plays their own ball from that spot.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 4,
    date: '2026-05-04',
    gameName: 'Low Net Team Tournament',
    gameDescription: 'Teams of 4. For the first 8 holes, count the two lowest net scores. On the last hole, count all four scores.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Team Giant Skins',
    sideGameDescription: '$60 split between Giant Skins winners'
  },
  {
    weekId: 5,
    date: '2026-05-11',
    gameName: 'Ryder Cup – Fourball',
    gameDescription: 'Two-player teams each play their own ball; best score counts per team.\n\nNo main game payout this week - points accumulate for Ryder Cup finale next week.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 6,
    date: '2026-05-18',
    gameName: 'Ryder Cup – Singles',
    gameDescription: 'Head-to-head singles matches; team with most points wins the Ryder Cup.\n\nPayout ($700 total):\n• Winning team splits entire pot (~$29 per player on 24-person team)',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 7,
    date: '2026-06-01',
    gameName: 'Special Events Night',
    gameDescription: 'Each hole has a contest (longest drive, closest to pin, longest putt, etc.). Each contest has a cash prize.\n\nPayouts ($230 total):\n• Low Net 1st: $90\n• Low Net 2nd: $55\n• Low Net 3rd: $35\n• Low Gross 1st: $50\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 8,
    date: '2026-06-08',
    gameName: 'Best Ball / Scramble / Worst Ball',
    gameDescription: 'Each tee time will rotate between taking their best individual net score, playing a 4-man scramble, and taking their worst individual net score. The total of the 9 hole scores will be added up.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team\n\nTie breaker is lowest score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Low Worst Score Total',
    sideGameDescription: '$30 split between team with lowest "worst ball" total'
  },
  {
    weekId: 9,
    date: '2026-06-15',
    gameName: 'Low Gross/Net Skins',
    gameDescription: 'Skins game scored in both gross and net divisions. Players can only win in one division.\n\nPayouts ($230 total):\n• Low Net 1st: $90\n• Low Net 2nd: $55\n• Low Net 3rd: $35\n• Low Gross 1st: $50\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 10,
    date: '2026-06-22',
    gameName: 'Player B Special',
    gameDescription: 'Players receive 2 mulligans to use on any hole for any shot.\n\nPayouts ($230 total):\n• Low Net 1st: $90\n• Low Net 2nd: $55\n• Low Net 3rd: $35\n• Low Gross 1st: $50\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies (No Mulligans)',
    sideGameDescription: '$10 per greenie (3 holes = $30 total) - Mulligans cannot be used on greenie holes'
  },
  {
    weekId: 11,
    date: '2026-06-29',
    gameName: '1-2-3 Best Ball',
    gameDescription: 'Teams of 4. On hole 1 use the best single score, on hole 2 use the best two scores, on hole 3 use the best three scores. Repeat this rotation the whole round.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 12,
    date: '2026-07-06',
    gameName: 'Black, White & Green',
    gameDescription: 'Individual game. Start from the black tees, then white, then green & then repeat.\n\nPayouts ($230 total):\n• Low Net 1st: $90\n• Low Net 2nd: $55\n• Low Net 3rd: $35\n• Low Gross 1st: $50\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Lowest Net Score On Green Holes',
    sideGameDescription: '$60 split between players with lowest net scores on the green tee holes'
  },
  {
    weekId: 13,
    date: '2026-07-13',
    gameName: 'Pick a Player',
    gameDescription: 'Before teeing off, choose another player in the league as your partner. Your score is combined with their score for the team total.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 14,
    date: '2026-07-20',
    gameName: 'Stableford Points',
    gameDescription: 'Individual scoring system. Earn points based on net score: Eagle +5, Birdie +3, Par +1, Bogey -1, Double Bogey -2. Goal is to score the most points.\n\nPayouts ($250 total):\n• Most Points 1st: $130\n• Most Points 2nd: $70\n• Most Points 3rd: $50',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 15,
    date: '2026-07-27',
    gameName: '3 Club Challenge',
    gameDescription: 'Each player can only bring 3 clubs plus a putter. Scores are kept for low gross and low net.\n\nPayouts ($230 total):\n• Low Net 1st: $90\n• Low Net 2nd: $55\n• Low Net 3rd: $35\n• Low Gross 1st: $50\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 16,
    date: '2026-08-03',
    gameName: 'Low Net / Low Gross',
    gameDescription: 'Individual stroke play using net scores (adjusted for handicap).\n\nPayouts ($230 total):\n• Low Net 1st: $90\n• Low Net 2nd: $55\n• Low Net 3rd: $35\n• Low Gross 1st: $50\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 17,
    date: '2026-08-10',
    gameName: 'Two Ball Low Net',
    gameDescription: 'Teams of 4. On each hole, take the two lowest net scores from the group as the team score.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 18,
    date: '2026-08-17',
    gameName: 'Championship Seeding',
    gameDescription: 'Low Net Singles Tournament. Your net score will determine which group you qualify for in the final.\n\nNo main game payout this week - seeding only for Championship Final.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 19,
    date: '2026-08-24',
    gameName: 'Championship Final',
    gameDescription: 'Low Net Singles Final. A, B and C group champions to be crowned.\n\nPayouts ($700 total):\n• Group A: 1st $300, 2nd $150\n• Group B: 1st $120, 2nd $60\n• Group C: 1st $50, 2nd $20',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  },
  {
    weekId: 20,
    date: '2026-08-31',
    gameName: '2-Man Scramble',
    gameDescription: 'Teams of 2. Both players hit, pick the best shot, and both play from that spot until the ball is holed. Team handicap is adjusted.\n\nPayouts ($230 total):\n• Team Low Net 1st: $90 per team\n• Team Low Net 2nd: $55 per team\n• Team Low Net 3rd: $35 per team\n• Team Low Gross 1st: $50 per team\n\nTie breaker is lowest net score starting on hole 1, then 2, 3, etc.',
    sideGame: 'Greenies',
    sideGameDescription: '$10 per greenie (3 holes = $30 total)'
  }
];

export default function ArlingtonLakesGolfLeague() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [players, setPlayers] = useState(initialPlayers);
  const [weeks, setWeeks] = useState(generateSeasonWeeks());
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [giantSkins, setGiantSkins] = useState(
    courseHoles.map(hole => ({ ...hole, lowScore: null, playerId: null, weekId: null }))
  );

  // Pairing history - tracks how many times each pair has played together
  const [pairingHistory, setPairingHistory] = useState({});

  // Admin state
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [showScoreEntry, setShowScoreEntry] = useState(false);
  const [showMoneyEntry, setShowMoneyEntry] = useState(false);
  const [showGiantSkinsEntry, setShowGiantSkinsEntry] = useState(false);
  const [scheduleSelections, setScheduleSelections] = useState({});
  const [scoreEntries, setScoreEntries] = useState({});
  const [moneyEntries, setMoneyEntries] = useState({});
  const [giantSkinsEntry, setGiantSkinsEntry] = useState({ hole: 1, score: '', playerId: '' });

  // Weekly games state
  const [weeklyGames, setWeeklyGames] = useState(initialWeeklyGames);
  const [showWeeklyGameEditor, setShowWeeklyGameEditor] = useState(false);
  const [weeklyGameEdit, setWeeklyGameEdit] = useState({
    gameName: '',
    gameDescription: '',
    sideGame: '',
    sideGameDescription: ''
  });

  // Player management state
  const [showPlayerEditor, setShowPlayerEditor] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerEdit, setPlayerEdit] = useState({
    name: '',
    phone: '',
    email: '',
    handicap: 0,
    cdgaId: '',
    availability: [],
    type: 'full-time'
  });
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');

  // Admin authentication
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const ADMIN_PASSWORD = 'golf2026';

  const [playerFilter, setPlayerFilter] = useState('all');
  const [leaderboardView, setLeaderboardView] = useState('season');

  const currentWeek = weeks.find(w => w.id === selectedWeek);
  const currentGame = weeklyGames.find(g => g.weekId === selectedWeek);

  // Get game for a specific week
  const getGameForWeek = (weekId) => weeklyGames.find(g => g.weekId === weekId);

  // Handle weekly game edit
  const loadWeeklyGameForEdit = () => {
    const game = getGameForWeek(selectedWeek);
    if (game) {
      setWeeklyGameEdit({
        gameName: game.gameName,
        gameDescription: game.gameDescription,
        sideGame: game.sideGame,
        sideGameDescription: game.sideGameDescription
      });
    } else {
      setWeeklyGameEdit({
        gameName: '',
        gameDescription: '',
        sideGame: '',
        sideGameDescription: ''
      });
    }
    setShowWeeklyGameEditor(true);
  };

  const handleSaveWeeklyGame = () => {
    setWeeklyGames(weeklyGames.map(g =>
      g.weekId === selectedWeek
        ? { ...g, ...weeklyGameEdit }
        : g
    ));
    setShowWeeklyGameEditor(false);
  };

  // Handle player editing
  const loadPlayerForEdit = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setPlayerEdit({
        name: player.name,
        phone: player.phone,
        email: player.email,
        handicap: player.handicap,
        cdgaId: player.cdgaId,
        availability: [...player.availability],
        type: player.type
      });
      setEditingPlayerId(playerId);
      setShowPlayerEditor(true);
    }
  };

  const handleSavePlayer = () => {
    setPlayers(players.map(p =>
      p.id === editingPlayerId
        ? { ...p, ...playerEdit }
        : p
    ));
    setShowPlayerEditor(false);
    setEditingPlayerId(null);
  };

  const toggleAvailability = (time) => {
    if (playerEdit.availability.includes(time)) {
      setPlayerEdit({
        ...playerEdit,
        availability: playerEdit.availability.filter(t => t !== time)
      });
    } else {
      setPlayerEdit({
        ...playerEdit,
        availability: [...playerEdit.availability, time].sort((a, b) => {
          return teeTimes.indexOf(a) - teeTimes.indexOf(b);
        })
      });
    }
  };

  // Filter players for admin search
  const filteredPlayersForAdmin = players.filter(p =>
    p.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Handle admin login
  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setPasswordError(false);
      setAdminPassword('');
    } else {
      setPasswordError(true);
    }
  };

  // Get pairing key for two players (order-independent)
  const getPairingKey = (id1, id2) => {
    return [id1, id2].sort((a, b) => a - b).join('-');
  };

  // Get pairing count for two players
  const getPairingCount = (id1, id2) => {
    return pairingHistory[getPairingKey(id1, id2)] || 0;
  };

  // Calculate total pairing score for a group (lower is better - means less repeat pairings)
  const getGroupPairingScore = (playerIds) => {
    let score = 0;
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        score += getPairingCount(playerIds[i], playerIds[j]);
      }
    }
    return score;
  };

  // Auto-schedule algorithm
  const autoScheduleWeek = () => {
    // Get full-time players only (exclude substitutes)
    const eligiblePlayers = players.filter(p => p.type === 'full-time');

    // Sort players by availability count (most constrained first)
    const sortedByConstraint = [...eligiblePlayers].sort(
      (a, b) => a.availability.length - b.availability.length
    );

    // Track assigned players and build tee sheet
    const assigned = new Set();
    const newTeeSheet = teeTimes.map(time => ({ time, players: [] }));

    // First pass: assign most constrained players (1-2 available times)
    sortedByConstraint
      .filter(p => p.availability.length <= 2)
      .forEach(player => {
        const availableTimes = player.availability;
        for (const time of availableTimes) {
          const slotIndex = teeTimes.indexOf(time);
          if (slotIndex !== -1 && newTeeSheet[slotIndex].players.length < 4) {
            newTeeSheet[slotIndex].players.push(player.id);
            assigned.add(player.id);
            break;
          }
        }
      });

    // Second pass: fill remaining slots with handicap balancing and rotation
    teeTimes.forEach((time, slotIndex) => {
      const slot = newTeeSheet[slotIndex];

      // Get available players for this time who aren't assigned yet
      let available = eligiblePlayers.filter(
        p => !assigned.has(p.id) && p.availability.includes(time)
      );

      while (slot.players.length < 4 && available.length > 0) {
        // Sort available players by handicap
        available.sort((a, b) => a.handicap - b.handicap);

        // Determine which handicap tier to pick from based on current group composition
        const currentGroup = slot.players.map(id => players.find(p => p.id === id));
        const currentHandicaps = currentGroup.map(p => p?.handicap || 0);
        const avgHandicap = currentHandicaps.length > 0
          ? currentHandicaps.reduce((a, b) => a + b, 0) / currentHandicaps.length
          : 10;

        // Split into quartiles
        const q1 = Math.floor(available.length * 0.25);
        const q2 = Math.floor(available.length * 0.5);
        const q3 = Math.floor(available.length * 0.75);

        let targetTier;
        if (slot.players.length === 0) {
          targetTier = available.slice(0, Math.max(1, q1)); // Low handicap
        } else if (slot.players.length === 1) {
          targetTier = available.slice(q3); // High handicap
        } else if (slot.players.length === 2) {
          targetTier = avgHandicap < 10
            ? available.slice(q2, q3) // Mid-high
            : available.slice(q1, q2); // Mid-low
        } else {
          // Last player - balance the group
          targetTier = avgHandicap < 10
            ? available.slice(q2) // Higher half
            : available.slice(0, q2); // Lower half
        }

        if (targetTier.length === 0) targetTier = available;

        // From target tier, pick player with lowest pairing score (most diversity)
        let bestPlayer = targetTier[0];
        let bestScore = Infinity;

        targetTier.forEach(candidate => {
          const score = slot.players.reduce(
            (sum, existingId) => sum + getPairingCount(candidate.id, existingId),
            0
          );
          if (score < bestScore) {
            bestScore = score;
            bestPlayer = candidate;
          }
        });

        slot.players.push(bestPlayer.id);
        assigned.add(bestPlayer.id);
        available = available.filter(p => p.id !== bestPlayer.id);
      }
    });

    // Update pairing history
    const newPairingHistory = { ...pairingHistory };
    newTeeSheet.forEach(slot => {
      for (let i = 0; i < slot.players.length; i++) {
        for (let j = i + 1; j < slot.players.length; j++) {
          const key = getPairingKey(slot.players[i], slot.players[j]);
          newPairingHistory[key] = (newPairingHistory[key] || 0) + 1;
        }
      }
    });
    setPairingHistory(newPairingHistory);

    // Update weeks played count
    const playingIds = newTeeSheet.flatMap(s => s.players);
    setPlayers(players.map(p =>
      playingIds.includes(p.id)
        ? { ...p, weeksPlayed: p.weeksPlayed + 1 }
        : p
    ));

    // Save the schedule
    setWeeks(weeks.map(w =>
      w.id === selectedWeek ? { ...w, teeSheet: newTeeSheet } : w
    ));
  };

  // Load existing schedule for editing
  const loadExistingSchedule = () => {
    if (currentWeek && currentWeek.teeSheet.length > 0) {
      const existingSelections = {};
      currentWeek.teeSheet.forEach((slot, timeIdx) => {
        slot.players.forEach((playerId, slotIdx) => {
          existingSelections[`${timeIdx}-${slotIdx}`] = String(playerId);
        });
      });
      setScheduleSelections(existingSelections);
    } else {
      setScheduleSelections({});
    }
    setShowScheduleBuilder(true);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Build weekly schedule (manual)
  const handleBuildSchedule = () => {
    const teeSheet = teeTimes.map((time, idx) => ({
      time,
      players: [
        scheduleSelections[`${idx}-0`] || null,
        scheduleSelections[`${idx}-1`] || null,
        scheduleSelections[`${idx}-2`] || null,
        scheduleSelections[`${idx}-3`] || null
      ].filter(Boolean).map(id => parseInt(id))
    }));

    const newPlayerIds = teeSheet.flatMap(t => t.players);
    const existingPlayerIds = currentWeek?.teeSheet.flatMap(t => t.players) || [];

    const addedPlayers = newPlayerIds.filter(id => !existingPlayerIds.includes(id));
    const removedPlayers = existingPlayerIds.filter(id => !newPlayerIds.includes(id));

    // Update pairing history for new schedule
    const newPairingHistory = { ...pairingHistory };

    // Remove old pairings if editing
    if (existingPlayerIds.length > 0) {
      currentWeek.teeSheet.forEach(slot => {
        for (let i = 0; i < slot.players.length; i++) {
          for (let j = i + 1; j < slot.players.length; j++) {
            const key = getPairingKey(slot.players[i], slot.players[j]);
            newPairingHistory[key] = Math.max(0, (newPairingHistory[key] || 0) - 1);
          }
        }
      });
    }

    // Add new pairings
    teeSheet.forEach(slot => {
      for (let i = 0; i < slot.players.length; i++) {
        for (let j = i + 1; j < slot.players.length; j++) {
          const key = getPairingKey(slot.players[i], slot.players[j]);
          newPairingHistory[key] = (newPairingHistory[key] || 0) + 1;
        }
      }
    });
    setPairingHistory(newPairingHistory);

    setWeeks(weeks.map(w =>
      w.id === selectedWeek ? { ...w, teeSheet } : w
    ));

    setPlayers(players.map(p => {
      if (addedPlayers.includes(p.id)) {
        return { ...p, weeksPlayed: p.weeksPlayed + 1 };
      }
      if (removedPlayers.includes(p.id)) {
        return { ...p, weeksPlayed: Math.max(0, p.weeksPlayed - 1) };
      }
      return p;
    }));

    setShowScheduleBuilder(false);
    setScheduleSelections({});
  };

  // Enter scores
  const handleEnterScores = () => {
    setWeeks(weeks.map(w =>
      w.id === selectedWeek ? { ...w, scoresEntered: true } : w
    ));
    setShowScoreEntry(false);
    setScoreEntries({});
  };

  // Enter money
  const handleEnterMoney = () => {
    const updatedPlayers = [...players];

    Object.entries(moneyEntries).forEach(([key, amount]) => {
      const [playerId, category] = key.split('-');
      const playerIdx = updatedPlayers.findIndex(p => p.id === parseInt(playerId));
      if (playerIdx !== -1 && amount) {
        const amountNum = parseFloat(amount);
        updatedPlayers[playerIdx].totalMoney += amountNum;
        if (!updatedPlayers[playerIdx].weeklyMoney[selectedWeek]) {
          updatedPlayers[playerIdx].weeklyMoney[selectedWeek] = {};
        }
        updatedPlayers[playerIdx].weeklyMoney[selectedWeek][category] = amountNum;
      }
    });

    setPlayers(updatedPlayers);
    setWeeks(weeks.map(w =>
      w.id === selectedWeek ? { ...w, moneyEntered: true } : w
    ));
    setShowMoneyEntry(false);
    setMoneyEntries({});
  };

  // Update giant skins
  const handleUpdateGiantSkin = () => {
    const { hole, score, playerId } = giantSkinsEntry;
    if (!hole || !score || !playerId) return;

    const scoreNum = parseInt(score);
    const holeIdx = parseInt(hole) - 1;
    const currentLow = giantSkins[holeIdx].lowScore;

    if (currentLow === null || scoreNum < currentLow) {
      setGiantSkins(giantSkins.map((h, idx) =>
        idx === holeIdx
          ? { ...h, lowScore: scoreNum, playerId: parseInt(playerId), weekId: selectedWeek }
          : h
      ));
    }

    setGiantSkinsEntry({ hole: 1, score: '', playerId: '' });
    setShowGiantSkinsEntry(false);
  };

  const getPlayerById = (id) => players.find(p => p.id === id);

  const getPlayersForWeek = (weekId) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week || !week.teeSheet.length) return [];
    return week.teeSheet.flatMap(t => t.players);
  };

  const getWeeklyMoneyTotal = (weekId) => {
    return players.reduce((sum, p) => {
      const weekMoney = p.weeklyMoney[weekId];
      if (!weekMoney) return sum;
      return sum + Object.values(weekMoney).reduce((a, b) => a + b, 0);
    }, 0);
  };

  const sortedByMoney = [...players].sort((a, b) => b.totalMoney - a.totalMoney);

  const filteredPlayers = players.filter(p => {
    if (playerFilter === 'all') return true;
    return p.type === playerFilter;
  });

  const assignedPlayerIds = Object.values(scheduleSelections).filter(Boolean).map(id => parseInt(id));

  // Get available players for a specific tee time
  const getAvailablePlayersForTime = (time) => {
    return players.filter(p =>
      p.availability.includes(time) &&
      (p.type === 'full-time' || !assignedPlayerIds.includes(p.id))
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <header className="bg-green-950 border-b-4 border-yellow-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-xl sm:text-3xl">⛳</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-serif font-bold text-white tracking-wide">Arlington Lakes Golf League</h1>
                <p className="text-green-300 text-xs sm:text-sm">2026 Season • April - August</p>
              </div>
            </div>
            <div className="text-left sm:text-right text-green-200 text-xs sm:text-sm pl-13 sm:pl-0">
              <div>{players.filter(p => p.type === 'full-time').length} Members • {players.filter(p => p.type === 'substitute').length} Subs • {weeks.length} Weeks</div>
              <div className="text-yellow-500 font-medium">Every Monday • 9 Holes</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-green-950/80 border-b border-green-700">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide">
            {[
              { id: 'schedule', label: 'Schedule', shortLabel: 'Sched', icon: '📅' },
              { id: 'leaderboard', label: 'Leaderboard', shortLabel: 'Money', icon: '💰' },
              { id: 'players', label: 'Players', shortLabel: 'Players', icon: '👥' },
              { id: 'giantskins', label: 'Giant Skins', shortLabel: 'Skins', icon: '🏆' },
              { id: 'admin', label: 'Admin', shortLabel: 'Admin', icon: '⚙️' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedPlayer(null); }}
                className={`px-2 sm:px-5 py-2.5 sm:py-3 font-medium transition-all whitespace-nowrap text-xs sm:text-base flex-shrink-0 flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 ${
                  activeTab === tab.id
                    ? 'bg-green-700 text-white border-b-2 border-yellow-500'
                    : 'text-green-300 hover:bg-green-800 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-serif text-white">Weekly Schedule</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                  disabled={selectedWeek === 1}
                  className="px-2 sm:px-3 py-2 bg-green-800 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm sm:text-base"
                >
                  ←
                </button>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                  className="px-2 sm:px-4 py-2 rounded-lg bg-white border-0 font-medium text-sm sm:text-base flex-1 min-w-0"
                >
                  {weeks.map(w => (
                    <option key={w.id} value={w.id}>Week {w.id} - {formatShortDate(w.date)}</option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedWeek(Math.min(weeks.length, selectedWeek + 1))}
                  disabled={selectedWeek === weeks.length}
                  className="px-2 sm:px-3 py-2 bg-green-800 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm sm:text-base"
                >
                  →
                </button>
              </div>
            </div>

            {currentWeek && (
              <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-green-800 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h3 className="text-lg sm:text-xl font-serif text-white">Week {currentWeek.id}</h3>
                      <p className="text-green-200 text-sm">{formatDate(currentWeek.date)}</p>
                    </div>
                    <div className="sm:text-right">
                      <div className={`inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-full font-bold text-sm sm:text-base ${
                        currentWeek.nineHoles === 'front'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {currentWeek.nineHoles === 'front' ? 'Front 9 (Holes 1-9)' : 'Back 9 (Holes 10-18)'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Info Section */}
                {currentGame && (
                  <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-yellow-50 p-4 sm:p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl sm:text-2xl">🎯</span>
                          <h4 className="font-bold text-base sm:text-lg text-green-800">{currentGame.gameName}</h4>
                        </div>
                        <p className="text-gray-700 text-xs sm:text-sm whitespace-pre-line">{currentGame.gameDescription}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl sm:text-2xl">⭐</span>
                          <h4 className="font-bold text-base sm:text-lg text-yellow-700">Side Game: {currentGame.sideGame}</h4>
                        </div>
                        <p className="text-gray-700 text-xs sm:text-sm">{currentGame.sideGameDescription}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 sm:p-6">
                  {currentWeek.teeSheet.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-gray-500">
                      <div className="text-3xl sm:text-4xl mb-4">📋</div>
                      <p className="text-base sm:text-lg">No tee sheet created yet</p>
                      <p className="text-xs sm:text-sm mt-2">Go to Admin to build or auto-generate the schedule for this week</p>
                    </div>
                  ) : (
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm text-gray-500 mb-4 gap-2">
                        <span>{currentWeek.teeSheet.reduce((sum, t) => sum + t.players.length, 0)} players scheduled</span>
                        <div className="flex gap-2 flex-wrap">
                          {currentWeek.scoresEntered && (
                            <span className="bg-green-100 text-green-700 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">✓ Scores</span>
                          )}
                          {currentWeek.moneyEntered && (
                            <span className="bg-yellow-100 text-yellow-700 px-2 sm:px-3 py-1 rounded-full text-xs font-medium">✓ Money</span>
                          )}
                        </div>
                      </div>

                      {currentWeek.teeSheet.map((slot, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                          <div className="w-full sm:w-20 font-bold text-green-800 text-base sm:text-lg">{slot.time}</div>
                          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                            {slot.players.map((playerId, pIdx) => {
                              const player = getPlayerById(playerId);
                              return (
                                <div
                                  key={pIdx}
                                  className="bg-white px-2 sm:px-3 py-2 rounded border border-gray-200 cursor-pointer hover:border-green-500 transition-colors"
                                  onClick={() => { setSelectedPlayer(player); setActiveTab('players'); }}
                                >
                                  <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">{player?.name}</div>
                                  <div className="text-xs text-gray-500">HCP {calc9HoleHandicap(player?.handicap)}</div>
                                </div>
                              );
                            })}
                            {[...Array(4 - slot.players.length)].map((_, i) => (
                              <div key={`empty-${i}`} className="bg-gray-100 px-2 sm:px-3 py-2 rounded border border-dashed border-gray-300 text-gray-400 text-xs sm:text-sm text-center">
                                Open
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-serif text-white">Money Leaderboard</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setLeaderboardView('season')}
                  className={`px-3 sm:px-4 py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
                    leaderboardView === 'season'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-green-800 text-green-200 hover:bg-green-700'
                  }`}
                >
                  Season Total
                </button>
                <button
                  onClick={() => setLeaderboardView('weekly')}
                  className={`px-3 sm:px-4 py-2 rounded-full font-medium transition-all text-sm sm:text-base ${
                    leaderboardView === 'weekly'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-green-800 text-green-200 hover:bg-green-700'
                  }`}
                >
                  By Week
                </button>
              </div>
            </div>

            {leaderboardView === 'season' ? (
              <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-green-800 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <h3 className="text-base sm:text-lg font-medium text-white">Season Money Leaders</h3>
                    <div className="text-yellow-300 font-bold text-sm sm:text-base">
                      Total Pot: ${sortedByMoney.reduce((sum, p) => sum + p.totalMoney, 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-600 text-xs sm:text-sm">#</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-left font-medium text-gray-600 text-xs sm:text-sm">Player</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-center font-medium text-gray-600 text-xs sm:text-sm hidden sm:table-cell">Weeks</th>
                        <th className="px-2 sm:px-4 py-2 sm:py-3 text-right font-medium text-gray-600 text-xs sm:text-sm">Won</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedByMoney.filter(p => p.totalMoney > 0).map((player, index) => (
                        <tr
                          key={player.id}
                          className={`border-b border-gray-100 hover:bg-green-50 transition-colors ${
                            index === 0 ? 'bg-yellow-50' : ''
                          }`}
                        >
                          <td className="px-2 sm:px-4 py-3 sm:py-4">
                            <div className="flex items-center gap-1">
                              {index === 0 && <span>🥇</span>}
                              {index === 1 && <span>🥈</span>}
                              {index === 2 && <span>🥉</span>}
                              {index > 2 && <span className="font-bold text-gray-600 text-sm">{index + 1}</span>}
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 font-semibold text-gray-800 text-sm">{player.name}</td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-center text-gray-600 text-sm hidden sm:table-cell">{player.weeksPlayed}</td>
                          <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
                            <span className="bg-green-100 text-green-800 px-2 sm:px-4 py-1 rounded-full font-bold text-xs sm:text-sm">
                              ${player.totalMoney.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {sortedByMoney.filter(p => p.totalMoney > 0).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 sm:py-12 text-center text-gray-500 text-sm">
                            No money entered yet. Use Admin to enter weekly winnings.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="px-3 sm:px-4 py-2 rounded-lg bg-white font-medium text-sm sm:text-base"
                  >
                    {weeks.map(w => (
                      <option key={w.id} value={w.id}>Week {w.id} - {formatShortDate(w.date)}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-green-800 px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <h3 className="text-base sm:text-lg font-medium text-white">Week {selectedWeek} Winnings</h3>
                      <div className="text-yellow-300 font-bold text-sm sm:text-base">
                        Week Total: ${getWeeklyMoneyTotal(selectedWeek).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    {getWeeklyMoneyTotal(selectedWeek) === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No money entered for this week yet
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3 text-base sm:text-lg">Main Game</h4>
                          <div className="space-y-2">
                            {['1st', '2nd', '3rd'].map(place => {
                              const cat = moneyCategories.find(c => c.id === place);
                              const winner = players.find(p => p.weeklyMoney[selectedWeek]?.[place]);
                              if (!winner) return null;
                              return (
                                <div key={place} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg sm:text-xl">{cat.icon}</span>
                                    <span className="font-medium text-sm sm:text-base">{winner.name}</span>
                                  </div>
                                  <span className="font-bold text-green-700 text-sm sm:text-base">${winner.weeklyMoney[selectedWeek][place]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-700 mb-3 text-lg">🎯 Closest to Pin</h4>
                          <div className="space-y-2">
                            {['ctp1', 'ctp2', 'ctp3'].map((ctp, idx) => {
                              const winner = players.find(p => p.weeklyMoney[selectedWeek]?.[ctp]);
                              if (!winner) return null;
                              return (
                                <div key={ctp} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">CTP #{idx + 1}</span>
                                    <span className="font-medium">{winner.name}</span>
                                  </div>
                                  <span className="font-bold text-green-700">${winner.weeklyMoney[selectedWeek][ctp]}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            {selectedPlayer ? (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className="text-green-300 hover:text-white transition-colors flex items-center gap-2 text-sm"
                >
                  ← Back to All Players
                </button>

                <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-green-800 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-14 h-14 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center text-2xl sm:text-4xl shadow-md flex-shrink-0">
                          👤
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">{selectedPlayer.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-green-200 text-sm">
                            <span>9-Hole HCP: {calc9HoleHandicap(selectedPlayer.handicap)}</span>
                            <span className="text-green-300 text-xs">(18-hole: {selectedPlayer.handicap})</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              selectedPlayer.type === 'full-time' ? 'bg-green-600' : 'bg-yellow-600'
                            }`}>
                              {selectedPlayer.type === 'full-time' ? 'Member' : 'Substitute'}
                            </span>
                          </div>
                        </div>
                      </div>
                      {selectedPlayer.cdgaId && selectedPlayer.cdgaId !== 'N/A' && (
                        <div className="sm:text-right pl-17 sm:pl-0">
                          <div className="text-green-300 text-xs sm:text-sm">CDGA ID</div>
                          <div className="text-white font-mono text-sm">{selectedPlayer.cdgaId}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <div className="bg-green-50 rounded-lg p-3 sm:p-4 text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-green-700">{selectedPlayer.weeksPlayed}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Weeks Played</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-yellow-700">${selectedPlayer.totalMoney}</div>
                        <div className="text-xs sm:text-sm text-gray-600">Total Won</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Contact Information</h4>
                        <div className="text-gray-600 space-y-1 text-sm">
                          <div className="break-all">📧 {selectedPlayer.email}</div>
                          <div>📱 {selectedPlayer.phone}</div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Available Tee Times</h4>
                        <div className="flex flex-wrap gap-1">
                          {selectedPlayer.availability.map(time => (
                            <span key={time} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {Object.keys(selectedPlayer.weeklyMoney).length > 0 && (
                      <div className="border-t pt-4 mt-4">
                        <h4 className="font-semibold text-gray-700 mb-3 text-sm sm:text-base">Weekly Winnings</h4>
                        <div className="space-y-2">
                          {Object.entries(selectedPlayer.weeklyMoney).map(([weekId, categories]) => (
                            <div key={weekId} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-gray-50 rounded-lg gap-2">
                              <span className="text-gray-600 text-sm">Week {weekId}</span>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                {Object.entries(categories).map(([cat, amount]) => (
                                  <span key={cat} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                    {moneyCategories.find(c => c.id === cat)?.name}: ${amount}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-lg sm:text-xl font-serif text-white">League Players ({filteredPlayers.length})</h2>
                  <div className="flex gap-2">
                    {['all', 'full-time', 'substitute'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setPlayerFilter(filter)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          playerFilter === filter
                            ? 'bg-yellow-600 text-white'
                            : 'bg-green-800 text-green-200 hover:bg-green-700'
                        }`}
                      >
                        {filter === 'all' ? 'All' : filter === 'full-time' ? `Members (${players.filter(p => p.type === 'full-time').length})` : `Subs (${players.filter(p => p.type === 'substitute').length})`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                  {filteredPlayers.sort((a, b) => a.name.localeCompare(b.name)).map(player => (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="bg-white/95 rounded-lg shadow p-2 sm:p-3 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base flex-shrink-0 ${
                          player.type === 'substitute' ? 'bg-yellow-100' : 'bg-green-100'
                        }`}>
                          👤
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 text-xs sm:text-sm truncate">{player.name}</div>
                          <div className="text-xs text-gray-500">HCP {calc9HoleHandicap(player.handicap)} • {player.availability.length} times</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-green-600 font-bold text-xs sm:text-sm">${player.totalMoney}</div>
                          <div className="text-xs text-gray-500">{player.weeksPlayed}w</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Giant Skins Tab */}
        {activeTab === 'giantskins' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg sm:text-xl font-serif text-white">Giant Skins</h2>
              <p className="text-green-300 text-xs sm:text-sm">Lowest score on each hole for the entire season wins</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-blue-700 px-3 sm:px-4 py-2 sm:py-3">
                  <h3 className="text-white font-medium text-sm sm:text-base">Front 9 (Holes 1-9)</h3>
                </div>
                <div className="divide-y">
                  {giantSkins.slice(0, 9).map(hole => {
                    const holder = hole.playerId ? getPlayerById(hole.playerId) : null;
                    return (
                      <div key={hole.number} className="flex items-center justify-between p-2 sm:p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-800 text-sm sm:text-base flex-shrink-0">
                            {hole.number}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">Hole {hole.number}</div>
                            <div className="text-xs text-gray-500">Par {hole.par} • {hole.yards} yds</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {holder ? (
                            <>
                              <div className="text-xl sm:text-2xl font-bold text-green-700">{hole.lowScore}</div>
                              <div className="text-xs sm:text-sm text-gray-600 truncate max-w-24">{holder.name}</div>
                            </>
                          ) : (
                            <div className="text-gray-400 text-xs sm:text-sm">No score</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-purple-700 px-3 sm:px-4 py-2 sm:py-3">
                  <h3 className="text-white font-medium text-sm sm:text-base">Back 9 (Holes 10-18)</h3>
                </div>
                <div className="divide-y">
                  {giantSkins.slice(9, 18).map(hole => {
                    const holder = hole.playerId ? getPlayerById(hole.playerId) : null;
                    return (
                      <div key={hole.number} className="flex items-center justify-between p-2 sm:p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-2 sm:gap-4">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-800 text-sm sm:text-base flex-shrink-0">
                            {hole.number}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800 text-sm">Hole {hole.number}</div>
                            <div className="text-xs text-gray-500">Par {hole.par} • {hole.yards} yds</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {holder ? (
                            <>
                              <div className="text-xl sm:text-2xl font-bold text-purple-700">{hole.lowScore}</div>
                              <div className="text-xs sm:text-sm text-gray-600 truncate max-w-24">{holder.name}</div>
                            </>
                          ) : (
                            <div className="text-gray-400 text-xs sm:text-sm">No score</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-green-800/50 rounded-lg p-3 sm:p-4 text-green-100 text-xs sm:text-sm">
              <strong>How it works:</strong> The player with the lowest score on each hole across the entire season wins that hole's pot.
              Ties at season end split the money.
            </div>
          </div>
        )}

        {/* Admin Tab */}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto mt-12">
                <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-green-800 px-6 py-4 text-center">
                    <div className="text-3xl mb-2">🔐</div>
                    <h3 className="text-xl font-serif text-white">Admin Access</h3>
                    <p className="text-green-200 text-sm">Enter password to access league administration</p>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                          type="password"
                          value={adminPassword}
                          onChange={(e) => { setAdminPassword(e.target.value); setPasswordError(false); }}
                          onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                          placeholder="Enter admin password"
                          className={`w-full border rounded-lg px-4 py-3 text-center text-lg ${
                            passwordError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                        />
                        {passwordError && (
                          <p className="text-red-500 text-sm mt-2 text-center">Incorrect password. Try again.</p>
                        )}
                      </div>
                      <button
                        onClick={handleAdminLogin}
                        className="w-full bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 font-medium text-lg"
                      >
                        Enter Admin
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif text-white">League Administration</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-green-300">Week:</span>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
                    className="px-4 py-2 rounded-lg bg-white font-medium"
                  >
                    {weeks.map(w => (
                      <option key={w.id} value={w.id}>Week {w.id} - {formatShortDate(w.date)}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="text-green-300 hover:text-white text-sm flex items-center gap-1"
                >
                  🔓 Logout
                </button>
              </div>
            </div>

            {currentWeek && (
              <div className="bg-white/95 rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800">{formatDate(currentWeek.date)}</div>
                    <div className={`text-sm ${currentWeek.nineHoles === 'front' ? 'text-blue-600' : 'text-purple-600'}`}>
                      {currentWeek.nineHoles === 'front' ? 'Front 9 (Holes 1-9)' : 'Back 9 (Holes 10-18)'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {currentWeek.teeSheet.length > 0 && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">✓ Scheduled</span>}
                    {currentWeek.scoresEntered && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs">✓ Scores</span>}
                    {currentWeek.moneyEntered && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs">✓ Money</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Build Schedule */}
            <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
                <h3 className="text-white font-medium">📅 Build Weekly Schedule</h3>
                <div className="flex gap-2">
                  {!showScheduleBuilder && (
                    <>
                      <button
                        onClick={autoScheduleWeek}
                        className="bg-blue-500 text-white px-4 py-1 rounded-lg hover:bg-blue-600 text-sm font-medium"
                      >
                        ✨ Auto-Generate
                      </button>
                      <button
                        onClick={loadExistingSchedule}
                        className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
                      >
                        {currentWeek?.teeSheet.length ? 'Edit Schedule' : 'Manual Build'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {showScheduleBuilder && (
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Assign players to tee times. Players shown are those available for each time slot.
                    <span className="font-medium"> {48 - assignedPlayerIds.length} spots remaining.</span>
                  </p>

                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {teeTimes.map((time, timeIdx) => {
                      const availableForTime = getAvailablePlayersForTime(time);
                      return (
                        <div key={timeIdx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="w-20">
                            <div className="font-bold text-green-800">{time}</div>
                            <div className="text-xs text-gray-500">{availableForTime.length} avail</div>
                          </div>
                          <div className="flex-1 grid grid-cols-4 gap-2">
                            {[0, 1, 2, 3].map(slot => (
                              <select
                                key={slot}
                                value={scheduleSelections[`${timeIdx}-${slot}`] || ''}
                                onChange={(e) => setScheduleSelections({
                                  ...scheduleSelections,
                                  [`${timeIdx}-${slot}`]: e.target.value
                                })}
                                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                              >
                                <option value="">Select...</option>
                                {players
                                  .filter(p =>
                                    p.availability.includes(time) &&
                                    (!assignedPlayerIds.includes(p.id) || scheduleSelections[`${timeIdx}-${slot}`] == p.id)
                                  )
                                  .sort((a, b) => a.handicap - b.handicap)
                                  .map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} ({p.handicap}) {p.type === 'substitute' ? '(Sub)' : ''}
                                    </option>
                                  ))}
                              </select>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleBuildSchedule}
                      className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
                    >
                      Save Schedule
                    </button>
                    <button
                      onClick={() => { setShowScheduleBuilder(false); setScheduleSelections({}); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showScheduleBuilder && (
                <div className="p-4 text-sm text-gray-600">
                  <p><strong>Auto-Generate:</strong> Creates optimal schedule based on availability, handicap mixing, and rotation diversity.</p>
                  <p><strong>Manual Build:</strong> Pick players yourself for each tee time (only shows available players).</p>
                </div>
              )}
            </div>

            {/* Enter Scores */}
            <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
                <h3 className="text-white font-medium">📝 Enter Scores</h3>
                {!showScoreEntry && currentWeek?.teeSheet.length > 0 && (
                  <button
                    onClick={() => setShowScoreEntry(true)}
                    className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
                  >
                    Enter Scores
                  </button>
                )}
              </div>

              {showScoreEntry && currentWeek && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 max-h-80 overflow-y-auto">
                    {getPlayersForWeek(selectedWeek).map(playerId => {
                      const player = getPlayerById(playerId);
                      return (
                        <div key={playerId} className="flex items-center gap-3 p-2 border-b">
                          <div className="flex-1">
                            <span className="font-medium text-sm">{player.name}</span>
                            <span className="text-xs text-gray-500 ml-2">HCP {calc9HoleHandicap(player.handicap)}</span>
                          </div>
                          <input
                            type="number"
                            placeholder="Score"
                            value={scoreEntries[playerId] || ''}
                            onChange={(e) => setScoreEntries({ ...scoreEntries, [playerId]: e.target.value })}
                            className="w-20 border rounded px-2 py-1 text-center"
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleEnterScores}
                      className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
                    >
                      Save Scores
                    </button>
                    <button
                      onClick={() => { setShowScoreEntry(false); setScoreEntries({}); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {!showScoreEntry && !currentWeek?.teeSheet.length && (
                <div className="p-4 text-gray-500 text-center">Create a schedule first</div>
              )}
            </div>

            {/* Enter Money */}
            <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
                <h3 className="text-white font-medium">💰 Enter Weekly Money</h3>
                {!showMoneyEntry && currentWeek?.teeSheet.length > 0 && (
                  <button
                    onClick={() => setShowMoneyEntry(true)}
                    className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
                  >
                    Enter Money
                  </button>
                )}
              </div>

              {showMoneyEntry && currentWeek && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-700">🏆 Main Game</h4>
                      {['1st', '2nd', '3rd'].map(place => {
                        const cat = moneyCategories.find(c => c.id === place);
                        return (
                          <div key={place} className="flex items-center gap-3">
                            <span className="text-xl w-8">{cat.icon}</span>
                            <select
                              value={Object.keys(moneyEntries).find(k => k.endsWith(`-${place}`))?.split('-')[0] || ''}
                              onChange={(e) => {
                                const newEntries = { ...moneyEntries };
                                Object.keys(newEntries).forEach(k => {
                                  if (k.endsWith(`-${place}`)) delete newEntries[k];
                                });
                                if (e.target.value) {
                                  newEntries[`${e.target.value}-${place}`] = moneyEntries[`${e.target.value}-${place}`] || '';
                                }
                                setMoneyEntries(newEntries);
                              }}
                              className="flex-1 border rounded px-2 py-1"
                            >
                              <option value="">Select player...</option>
                              {getPlayersForWeek(selectedWeek).map(id => {
                                const p = getPlayerById(id);
                                return <option key={id} value={id}>{p.name}</option>;
                              })}
                            </select>
                            <div className="flex items-center">
                              <span className="text-gray-500">$</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={Object.entries(moneyEntries).find(([k]) => k.endsWith(`-${place}`))?.[1] || ''}
                                onChange={(e) => {
                                  const key = Object.keys(moneyEntries).find(k => k.endsWith(`-${place}`));
                                  if (key) {
                                    setMoneyEntries({ ...moneyEntries, [key]: e.target.value });
                                  }
                                }}
                                className="w-20 border rounded px-2 py-1"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-700">🎯 Closest to Pin</h4>
                      {['ctp1', 'ctp2', 'ctp3'].map((ctp, idx) => (
                        <div key={ctp} className="flex items-center gap-3">
                          <span className="text-sm text-gray-500 w-8">#{idx + 1}</span>
                          <select
                            value={Object.keys(moneyEntries).find(k => k.endsWith(`-${ctp}`))?.split('-')[0] || ''}
                            onChange={(e) => {
                              const newEntries = { ...moneyEntries };
                              Object.keys(newEntries).forEach(k => {
                                if (k.endsWith(`-${ctp}`)) delete newEntries[k];
                              });
                              if (e.target.value) {
                                newEntries[`${e.target.value}-${ctp}`] = moneyEntries[`${e.target.value}-${ctp}`] || '';
                              }
                              setMoneyEntries(newEntries);
                            }}
                            className="flex-1 border rounded px-2 py-1"
                          >
                            <option value="">Select player...</option>
                            {getPlayersForWeek(selectedWeek).map(id => {
                              const p = getPlayerById(id);
                              return <option key={id} value={id}>{p.name}</option>;
                            })}
                          </select>
                          <div className="flex items-center">
                            <span className="text-gray-500">$</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={Object.entries(moneyEntries).find(([k]) => k.endsWith(`-${ctp}`))?.[1] || ''}
                              onChange={(e) => {
                                const key = Object.keys(moneyEntries).find(k => k.endsWith(`-${ctp}`));
                                if (key) {
                                  setMoneyEntries({ ...moneyEntries, [key]: e.target.value });
                                }
                              }}
                              className="w-20 border rounded px-2 py-1"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleEnterMoney}
                      className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
                    >
                      Save Money
                    </button>
                    <button
                      onClick={() => { setShowMoneyEntry(false); setMoneyEntries({}); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Update Giant Skins */}
            <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
                <h3 className="text-white font-medium">🏆 Update Giant Skins</h3>
                {!showGiantSkinsEntry && (
                  <button
                    onClick={() => setShowGiantSkinsEntry(true)}
                    className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
                  >
                    Record Low Score
                  </button>
                )}
              </div>

              {showGiantSkinsEntry && (
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Record a new low score for a hole. Only updates if it beats the current low.
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hole</label>
                      <select
                        value={giantSkinsEntry.hole}
                        onChange={(e) => setGiantSkinsEntry({ ...giantSkinsEntry, hole: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        {courseHoles.map(h => (
                          <option key={h.number} value={h.number}>
                            Hole {h.number} (Par {h.par}, {h.yards} yds)
                            {giantSkins[h.number - 1].lowScore ? ` [Current: ${giantSkins[h.number - 1].lowScore}]` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
                      <select
                        value={giantSkinsEntry.playerId}
                        onChange={(e) => setGiantSkinsEntry({ ...giantSkinsEntry, playerId: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">Select player...</option>
                        {players.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Score</label>
                      <input
                        type="number"
                        placeholder="Score"
                        value={giantSkinsEntry.score}
                        onChange={(e) => setGiantSkinsEntry({ ...giantSkinsEntry, score: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleUpdateGiantSkin}
                      className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setShowGiantSkinsEntry(false); setGiantSkinsEntry({ hole: 1, score: '', playerId: '' }); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Weekly Games Editor */}
            <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-800 px-4 py-3 flex items-center justify-between">
                <h3 className="text-white font-medium">🎮 Weekly Games</h3>
                {!showWeeklyGameEditor && (
                  <button
                    onClick={loadWeeklyGameForEdit}
                    className="bg-yellow-500 text-white px-4 py-1 rounded-lg hover:bg-yellow-600 text-sm font-medium"
                  >
                    Edit Game Info
                  </button>
                )}
              </div>

              {!showWeeklyGameEditor && currentGame && (
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-500 mb-1">This Week's Game</div>
                      <div className="font-bold text-green-800">{currentGame.gameName}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm text-gray-500 mb-1">Side Game</div>
                      <div className="font-bold text-yellow-700">{currentGame.sideGame}</div>
                    </div>
                  </div>
                </div>
              )}

              {showWeeklyGameEditor && (
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Edit the game name, description, and side game for Week {selectedWeek}.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Game Name</label>
                      <input
                        type="text"
                        value={weeklyGameEdit.gameName}
                        onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, gameName: e.target.value })}
                        placeholder="e.g., 2-Man Scramble"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Game Description (include payouts)</label>
                      <textarea
                        value={weeklyGameEdit.gameDescription}
                        onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, gameDescription: e.target.value })}
                        placeholder="Describe the game format and include payout structure..."
                        rows={6}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Side Game Name</label>
                        <input
                          type="text"
                          value={weeklyGameEdit.sideGame}
                          onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, sideGame: e.target.value })}
                          placeholder="e.g., Greenies"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Side Game Description</label>
                        <input
                          type="text"
                          value={weeklyGameEdit.sideGameDescription}
                          onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, sideGameDescription: e.target.value })}
                          placeholder="e.g., $10 per greenie"
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleSaveWeeklyGame}
                      className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
                    >
                      Save Game Info
                    </button>
                    <button
                      onClick={() => setShowWeeklyGameEditor(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Player Management */}
            <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
              <div className="bg-green-800 px-4 py-3">
                <h3 className="text-white font-medium">👤 Player Management</h3>
              </div>

              <div className="p-4">
                {!showPlayerEditor ? (
                  <>
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search players by name..."
                        value={playerSearchTerm}
                        onChange={(e) => setPlayerSearchTerm(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredPlayersForAdmin.map(player => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                              player.type === 'substitute' ? 'bg-yellow-100' : 'bg-green-100'
                            }`}>
                              👤
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{player.name}</div>
                              <div className="text-xs text-gray-500">
                                9-HCP: {calc9HoleHandicap(player.handicap)} (18: {player.handicap}) • {player.availability.length} tee times • {player.type}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => loadPlayerForEdit(player.id)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            Edit
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-sm text-gray-500 text-center">
                      {filteredPlayersForAdmin.length} player{filteredPlayersForAdmin.length !== 1 ? 's' : ''} found
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-800">
                        Editing: {players.find(p => p.id === editingPlayerId)?.name}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        playerEdit.type === 'full-time' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {playerEdit.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input
                          type="text"
                          value={playerEdit.name}
                          onChange={(e) => setPlayerEdit({ ...playerEdit, name: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">18-Hole Handicap</label>
                        <input
                          type="number"
                          value={playerEdit.handicap}
                          onChange={(e) => setPlayerEdit({ ...playerEdit, handicap: parseInt(e.target.value) || 0 })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">9-Hole Handicap</label>
                        <div className="w-full border rounded-lg px-3 py-2 bg-gray-100 text-gray-700 font-bold">
                          {calc9HoleHandicap(playerEdit.handicap)}
                          <span className="text-xs font-normal text-gray-500 ml-2">(auto-calculated)</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="text"
                          value={playerEdit.phone}
                          onChange={(e) => setPlayerEdit({ ...playerEdit, phone: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={playerEdit.email}
                          onChange={(e) => setPlayerEdit({ ...playerEdit, email: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">CDGA ID</label>
                        <input
                          type="text"
                          value={playerEdit.cdgaId}
                          onChange={(e) => setPlayerEdit({ ...playerEdit, cdgaId: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Player Type</label>
                        <select
                          value={playerEdit.type}
                          onChange={(e) => setPlayerEdit({ ...playerEdit, type: e.target.value })}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          <option value="full-time">Full-Time Member</option>
                          <option value="substitute">Substitute</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Available Tee Times</label>
                      <div className="flex flex-wrap gap-2">
                        {teeTimes.map(time => (
                          <button
                            key={time}
                            onClick={() => toggleAvailability(time)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                              playerEdit.availability.includes(time)
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {playerEdit.availability.length} tee time{playerEdit.availability.length !== 1 ? 's' : ''} selected
                      </p>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleSavePlayer}
                        className="flex-1 bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 font-medium"
                      >
                        Save Player
                      </button>
                      <button
                        onClick={() => { setShowPlayerEditor(false); setEditingPlayerId(null); }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-green-950 border-t border-green-800 mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-green-400 text-sm">
          Arlington Lakes Golf League • 2026 Season • Prototype Demo
        </div>
      </footer>
    </div>
  );
}
