import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWeekSchedule, validateTeeSheet, repairWeekSchedule, buildPairingHistory } from '../src/lib/scheduler.js';
import { attachTeams, getPlayerTeam, getTeamsForWeek, pairingKey, stableTeamId } from '../src/lib/teams.js';
import { demoPlayers, demoWeeks, demoGames } from '../src/demo/league.js';
import { teeTimes as courseTimes } from '../src/constants.js';

const times = ['3:30 PM', '3:40 PM', '3:50 PM'];
const game = { teamType: '2-person', handicapFormat: 'scramble' };
const roster = (count, availability = times) => Array.from({ length: count }, (_, index) => ({
  id: index + 1, name: `Player ${index + 1}`, handicap: index * 3, availability: [...availability], type: 'full-time',
}));
const scheduledIds = (result) => result.teeSheet.flatMap(slot => slot.players);

test('generation is deterministic, never duplicates players, and retains hard availability', () => {
  const players = roster(12);
  players[0].availability = [times[2]];
  players[1].availability = [times[2]];
  players[2].availability = [times[0]];
  const input = { weekId: 4, players, teeTimes: times, game, seed: 'rehearsal' };
  const result = generateWeekSchedule(input);
  assert.deepEqual(result, generateWeekSchedule(input));
  assert.equal(new Set(scheduledIds(result)).size, 12);
  assert.equal(result.unscheduled.length, 0);
  assert.ok(validateTeeSheet({ ...input, teeSheet: result.teeSheet }).valid);
  assert.ok(result.teeSheet.every(slot => slot.players.length <= 4));
});

test('impossible availability is reported instead of overflowing to another tee time', () => {
  const players = roster(5, [times[0]]);
  players.push({ ...roster(1)[0], id: 6, name: 'Outside block', availability: ['6:00 PM'] });
  const result = generateWeekSchedule({ weekId: 1, players, teeTimes: times, game });
  assert.equal(result.teeSheet[0].players.length, 4);
  assert.equal(result.teeSheet[1].players.length, 0);
  assert.equal(result.unscheduled.length, 2);
  assert.equal(result.unscheduled.find(row => row.playerId === 6).reason, 'no_available_tee_time');
});

test('augmenting assignment places all players when different constrained windows compete', () => {
  const players = roster(12);
  players.slice(0, 4).forEach(player => { player.availability = [times[0], times[1]]; });
  players.slice(4, 8).forEach(player => { player.availability = [times[1], times[2]]; });
  players.slice(8).forEach(player => { player.availability = [times[0]]; });
  for (let seed = 0; seed < 20; seed += 1) {
    const result = generateWeekSchedule({ weekId: 1, players, teeTimes: times, seed, attempts: 1 });
    assert.equal(result.unscheduled.length, 0);
    assert.equal(scheduledIds(result).length, 12);
  }
});

test('attendance excludes absences and only includes a substitute after explicit confirmation', () => {
  const players = roster(6);
  players[4].type = 'substitute';
  players[5].type = 'substitute';
  const attendance = [
    { player_id: 1, week_id: 2, status: 'out' },
    { player_id: 2, week_id: 1, status: 'out' },
    { player_id: 5, week_id: 2, status: 'playing' },
  ];
  const result = generateWeekSchedule({ weekId: 2, players, teeTimes: times, attendance });
  assert.deepEqual(scheduledIds(result).sort(), [2, 3, 4, 5]);
  assert.equal(result.unscheduled.length, 0);
});

test('fixed partner restriction remains configurable and respects both players availability', () => {
  const players = roster(8);
  players[0].availability = [times[1]];
  players[1].availability = [times[1]];
  const fixedPartnerRule = { anchorName: 'Player 1', allowedPartnerNames: ['Player 2'] };
  const result = generateWeekSchedule({ weekId: 2, players, teeTimes: times, game, fixedPartnerRule });
  const anchorSlot = result.teeSheet.find(slot => slot.players.includes(1));
  assert.equal(anchorSlot.time, times[1]);
  assert.deepEqual(anchorSlot.players.sort(), [1, 2]);
  assert.ok(validateTeeSheet({ weekId: 2, players, teeTimes: times, game, fixedPartnerRule, teeSheet: result.teeSheet }).valid);
  players[1].availability = [times[2]];
  const conflict = generateWeekSchedule({ weekId: 2, players, teeTimes: times, game, fixedPartnerRule });
  assert.equal(conflict.unscheduled.find(row => row.playerId === 1).reason, 'fixed_partner_conflict');
  assert.ok(!scheduledIds(conflict).includes(1));
});

test('a missing allowed partner does not silently erase the fixed-partner rule', () => {
  const players = roster(4);
  const result = generateWeekSchedule({ weekId: 1, players, teeTimes: times, attendance: { 2: 'absent' }, fixedPartnerRule: { anchorId: 1, allowedPartnerIds: [2] } });
  assert.ok(!scheduledIds(result).includes(1));
  assert.equal(result.unscheduled.find(row => row.playerId === 1).reason, 'fixed_partner_conflict');
});

test('partner history is separate from foursome history and prevents immediate partner repeats', () => {
  const players = roster(4, [times[0]]);
  const first = generateWeekSchedule({ weekId: 1, players, teeTimes: [times[0]], game, seed: 2 });
  const weeks = [{ id: 1, teeSheet: first.teeSheet }];
  const history = buildPairingHistory(weeks, [{ ...game, weekId: 1 }]);
  assert.equal(Object.keys(history.foursomes).length, 6);
  assert.equal(Object.keys(history.teammates).length, 2);
  const second = generateWeekSchedule({ weekId: 2, players, weeks, weeklyGames: [{ ...game, weekId: 1 }], teeTimes: [times[0]], game });
  for (const team of second.teams) assert.equal(history.teammates[pairingKey(...team.memberIds)] || 0, 0);
});

test('balancing favors low/high pairs in a four-player scramble without pairing history', () => {
  const players = roster(4, [times[0]]);
  players.forEach((player, i) => { player.handicap = [0, 10, 20, 30][i]; });
  const result = generateWeekSchedule({ weekId: 1, players, teeTimes: [times[0]], game });
  assert.deepEqual(result.teams.map(team => team.memberIds.reduce((sum, id) => sum + players[id - 1].handicap, 0)), [30, 30]);
});

test('flexible twelve-player demo makes complete teams despite repeated historical foursomes', () => {
  const weekId = demoWeeks[2].id;
  for (const teamType of ['2-person', '4-person']) {
    const roundGame = { ...demoGames.find(row => row.weekId === weekId), teamType };
    for (const seed of [weekId, 'browser-preview', 19]) {
      const result = generateWeekSchedule({ weekId, players: demoPlayers, weeks: demoWeeks, weeklyGames: demoGames,
        teeTimes: courseTimes, game: roundGame, attendance: [], fixedPartnerRule: null, seed });
      assert.equal(scheduledIds(result).length, 12);
      assert.equal(result.unscheduled.length, 0);
      assert.ok(result.teams.every(team => team.status === 'complete'), `${teamType}: ${result.teeSheet.map(slot => slot.players.length)}`);
      assert.equal(result.diagnostics.incompleteTeams, 0);
      assert.ok(validateTeeSheet({ weekId, players: demoPlayers, teeSheet: result.teeSheet, teeTimes: courseTimes, game: roundGame }).valid);
    }
  }
});

test('complete-team preference never overrides an unavailable time to combine constrained threesomes', () => {
  const players = roster(6);
  players.slice(0, 3).forEach(player => { player.availability = [times[0]]; });
  players.slice(3).forEach(player => { player.availability = [times[1]]; });
  const result = generateWeekSchedule({ weekId: 1, players, teeTimes: times, game });
  assert.equal(result.unscheduled.length, 0);
  assert.equal(result.teams.filter(team => team.status === 'incomplete').length, 2);
  assert.deepEqual(result.teeSheet.map(slot => slot.players.length), [3, 3, 0]);
  assert.ok(validateTeeSheet({ weekId: 1, players, teeSheet: result.teeSheet, teeTimes: times, game }).valid);
});

test('odd fields retain times and flag an incomplete team instead of inventing a scoring rule', () => {
  const players = roster(7);
  players.slice(0, 3).forEach(player => { player.availability = [times[0]]; });
  players.slice(3).forEach(player => { player.availability = [times[1]]; });
  const result = generateWeekSchedule({ weekId: 1, players, teeTimes: times, game });
  assert.equal(result.teeSheet[0].players.length, 3);
  assert.equal(result.teeSheet[1].players.length, 4);
  assert.equal(result.teams.filter(team => team.status === 'incomplete').length, 1);
  assert.ok(result.warnings.some(warning => warning.includes('incomplete')));
});

test('explicit identities survive display reordering and moving an entire foursome', () => {
  const players = roster(4);
  const result = generateWeekSchedule({ weekId: 9, players, teeTimes: [times[0]], game });
  const before = getPlayerTeam({ playerId: 1, weekId: 9, teeSheet: result.teeSheet, game });
  const reordered = [{ ...result.teeSheet[0], time: times[2], players: [...result.teeSheet[0].players].reverse() }];
  const after = getPlayerTeam({ playerId: 1, weekId: 9, teeSheet: reordered, game });
  assert.equal(after.teamId, before.teamId);
  assert.deepEqual(after.teammates, before.teammates);
  assert.equal(stableTeamId(9, [2, 1]), stableTeamId(9, [1, 2]));
  assert.notEqual(stableTeamId(8, [1, 2]), stableTeamId(9, [1, 2]));
});

test('late withdrawal keeps unaffected groups byte-equivalent and preserves surviving team identity', () => {
  const players = roster(8);
  const original = generateWeekSchedule({ weekId: 1, players, teeTimes: times, game }).teeSheet;
  const affected = original.find(slot => slot.players.includes(1));
  const partner = getPlayerTeam({ playerId: 1, weekId: 1, teeSheet: original, game });
  const repaired = repairWeekSchedule({ weekId: 1, teeSheet: original, players, game, absentPlayerIds: [1] });
  assert.equal(repaired.diagnostics.movedPlayers, 0);
  assert.deepEqual(repaired.diagnostics.affectedTimes, [affected.time]);
  original.forEach((slot, index) => {
    if (slot.time !== affected.time) assert.deepEqual(repaired.teeSheet[index], slot);
  });
  const remaining = getPlayerTeam({ playerId: partner.teammates[0], weekId: 1, teeSheet: repaired.teeSheet, game });
  assert.equal(remaining.teamId, partner.teamId);
  assert.equal(remaining.isIncomplete, true);
  assert.equal(remaining.teammates.length, 0);
  assert.ok(original.find(slot => slot.time === affected.time).players.includes(1), 'repair must not mutate its input');
});

test('legacy pair/four-person lookups still work, including an exactly two-player tee time', () => {
  const teeSheet = [{ time: times[0], players: [1, 2] }, { time: times[1], players: [3, 4, 5, 6] }];
  assert.deepEqual(getPlayerTeam({ playerId: 1, weekId: 1, teeSheet, game }).teammates, [2]);
  assert.deepEqual(getPlayerTeam({ playerId: 5, weekId: 1, teeSheet, game }).teammates, [6]);
  assert.deepEqual(getPlayerTeam({ playerId: 5, weekId: 1, teeSheet, game: { teamType: '4-person' } }).teammates, [3, 4, 6]);
});

test('locked groups retain membership and identities while the rest is generated', () => {
  const players = roster(8);
  const lockedSlots = attachTeams({ weekId: 1, teeSheet: [{ time: times[1], players: [2, 4, 6, 8] }], game, players });
  const result = generateWeekSchedule({ weekId: 1, players, teeTimes: times, game, lockedSlots });
  assert.deepEqual(result.teeSheet.find(slot => slot.time === times[1]), lockedSlots[0]);
  assert.equal(scheduledIds(result).length, 8);
});

test('manual validator catches duplicates, overcapacity, unavailable and absent players', () => {
  const players = roster(5, [times[0]]);
  const result = validateTeeSheet({ weekId: 1, players, teeTimes: times, attendance: { 2: false }, teeSheet: [
    { time: times[0], players: [1, 2, 3, 4, 5] },
    { time: times[1], players: [1] },
  ] });
  assert.equal(result.valid, false);
  const codes = result.errors.map(error => error.code);
  for (const code of ['CAPACITY', 'AVAILABILITY', 'DUPLICATE_PLAYER', 'ABSENT_PLAYER']) assert.ok(codes.includes(code));
});

test('cancelled weeks do not create rotation history and explicit team history survives template edits', () => {
  const sheet = attachTeams({ weekId: 1, teeSheet: [{ time: times[0], players: [1, 2, 3, 4] }], game });
  const history = buildPairingHistory([{ id: 1, teeSheet: sheet }, { id: 2, teeSheet: sheet, weatherCancelled: true }], [{ weekId: 1, teamType: null }]);
  assert.equal(history.foursomes[pairingKey(1, 2)], 1);
  assert.equal(Object.keys(history.teammates).length, 2);
  assert.equal(getTeamsForWeek({ weekId: 1, teeSheet: sheet, game }).length, 2);
});
