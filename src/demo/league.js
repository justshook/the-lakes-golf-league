// Entirely fictional fixtures. No real player contacts or live financial data.
const names = ['Alex Morgan', 'Sam Rivera', 'Jordan Lee', 'Casey Brooks', 'Taylor Reed', 'Jamie Park', 'Drew Ellis', 'Morgan Blake', 'Avery Lane', 'Riley Chen', 'Cameron Wells', 'Quinn Hayes'];
const available = ['4:00 PM', '4:10 PM', '4:20 PM', '4:30 PM', '4:40 PM'];
export const demoPlayers = names.map((name, i) => ({ id: 9001 + i, name, handicap: 8 + i * 2, availability: available, type: 'full-time', weeksPlayed: 2, totalMoney: i === 0 ? 85 : i === 1 ? 60 : 0, weeklyMoney: i === 0 ? { '20990101': { '1st': 50 }, '20990108': { skins: 35 } } : {} }));
const nextMonday = new Date(); nextMonday.setUTCHours(12, 0, 0, 0); nextMonday.setUTCDate(nextMonday.getUTCDate() + ((8 - nextMonday.getUTCDay()) % 7 || 7));
const dateAt = offset => { const date = new Date(nextMonday); date.setUTCDate(date.getUTCDate() + offset * 7); return date.toISOString().slice(0, 10); };
const sheet = weekId => [0, 1, 2].map((group) => ({ time: available[group], players: demoPlayers.slice(group * 4, group * 4 + 4).map(p => p.id), teams: [0, 1].map(pair => ({ teamId: `demo-${weekId}-${group}-${pair}`, teamType: '2-person', status: 'complete', memberIds: demoPlayers.slice(group * 4 + pair * 2, group * 4 + pair * 2 + 2).map(p => p.id) })) }));
export const demoWeeks = [-3, -2, 0, 1, 2].map((offset, index) => ({ id: String(20990101 + index * 7), label: `Week ${index + 1}`, date: dateAt(offset), nineHoles: 'front', status: offset < 0 ? 'finalized' : offset === 0 ? 'published' : 'draft', teeSheet: offset <= 0 ? sheet(20990101 + index * 7) : [], attendanceDeadline: `${dateAt(offset)}T12:00:00-05:00`, scoresEntered: offset < 0, moneyEntered: offset < 0, scoreSubmissionEnabled: true, weatherCancelled: false, legacy: false, isScoringSupported: true }));
export const demoGames = demoWeeks.map(week => ({ weekId: week.id, gameName: 'Two-person scramble', gameDescription: 'Play the best shot together. One gross score for your team.', teamType: '2-person', handicapFormat: 'scramble', scoringMode: 'scramble', nineHoles: 'front', sideGame: 'Closest to the pin', sideGameDescription: 'Hole 8', showTeamHandicap: true }));
export const demoScores = demoWeeks.slice(0, 2).flatMap((week, i) => demoPlayers.slice(0, 8).map((player, j) => ({ id: `demo-score-${i}-${j}`, player_id: player.id, week_id: week.id, gross_score: 38 + i + Math.floor(j / 2), net_score: 34 + i + Math.floor(j / 2), handicap_used: 4, is_team_score: true, birdie_holes: [], eagle_holes: [] })));
export const demoLedger = [
  { id: 'demo-fee', type: 'charge', amountCents: 15000, description: 'Season dues' },
  { id: 'demo-payment', type: 'payment', amountCents: 15000, description: 'Season dues paid', reference: 'DEMO-PAYMENT-001' },
  { id: 'demo-award-1', type: 'award', amountCents: 5000, description: 'Week 1 · First place' },
  { id: 'demo-award-2', type: 'award', amountCents: 3500, description: 'Week 2 · Skins' },
  { id: 'demo-payout', type: 'payout', amountCents: 5000, description: 'Week 1 winnings paid', reference: 'DEMO-PAYOUT-001' },
].map((entry, i) => ({ ...entry, playerId: 9001, currency: 'USD', status: 'posted', idempotencyKey: entry.id, occurredAt: `${dateAt(-1)}T${String(10 + i).padStart(2, '0')}:00:00Z` }));
