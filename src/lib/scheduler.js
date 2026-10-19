import { attachTeams, createTeam, getTeamsForSlot, getTeamsForWeek, getTeamSize, pairingKey } from './teams.js';

const key = (id) => String(id);
const sameId = (a, b) => key(a) === key(b);
const absentStatuses = new Set(['absent', 'out', 'unavailable', 'not_playing', 'declined']);
const presentStatuses = new Set(['present', 'in', 'available', 'playing', 'confirmed']);

export function seededRandom(seed = 1) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6D2B79F5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function attendanceValue(attendance, playerId, weekId) {
  const raw = Array.isArray(attendance)
    ? attendance.find(row => sameId(row.playerId ?? row.player_id, playerId)
      && (row.weekId == null && row.week_id == null || sameId(row.weekId ?? row.week_id, weekId)))
    : attendance?.[playerId];
  return raw && typeof raw === 'object' ? raw.status ?? raw.attending : raw;
}

export function isPlayerAbsent(attendance, playerId, weekId) {
  const value = attendanceValue(attendance, playerId, weekId);
  return value === false || absentStatuses.has(value);
}

function isEligible(player, attendance, weekId) {
  if (isPlayerAbsent(attendance, player.id, weekId)) return false;
  const value = attendanceValue(attendance, player.id, weekId);
  return player.type == null || player.type === 'full-time' || value === true || presentStatuses.has(value);
}

function fixedRuleForPlayers(rule, players) {
  if (!rule || rule.enabled === false) return null;
  const anchor = players.find(player => rule.anchorId != null
    ? sameId(player.id, rule.anchorId) : player.name === rule.anchorName);
  if (!anchor) return null;
  const allowed = new Set(players.filter(player => (rule.allowedPartnerIds || []).some(id => sameId(id, player.id))
    || (rule.allowedPartnerNames || []).includes(player.name)).map(player => key(player.id)));
  allowed.delete(key(anchor.id));
  return { anchor, allowed };
}

export function buildPairingHistory(weeks = [], weeklyGames = [], excludeWeekIds = new Set()) {
  const excluded = new Set([...excludeWeekIds].map(key));
  const history = { foursomes: {}, teammates: {}, times: {} };
  for (const week of weeks) {
    if (excluded.has(key(week.id)) || week.weatherCancelled || week.weather_cancelled) continue;
    const game = weeklyGames.find(row => sameId(row.weekId ?? row.week_id, week.id)) || week.game || {};
    for (const slot of week.teeSheet || []) {
      const ids = [...new Set(slot.players || [])];
      for (let i = 0; i < ids.length; i += 1) {
        const id = ids[i];
        history.times[id] ||= {};
        history.times[id][slot.time] = (history.times[id][slot.time] || 0) + 1;
        for (let j = i + 1; j < ids.length; j += 1) {
          const pair = pairingKey(id, ids[j]);
          history.foursomes[pair] = (history.foursomes[pair] || 0) + 1;
        }
      }
      // Saved explicit team types remain authoritative if the week's format was
      // subsequently edited. Legacy records use the matching week's template.
      const teamGame = slot.teams?.[0]?.teamType ? { teamType: slot.teams[0].teamType } : game;
      for (const team of getTeamsForSlot({ weekId: week.id, slot, game: teamGame })) {
        for (let i = 0; i < team.memberIds.length; i += 1) {
          for (let j = i + 1; j < team.memberIds.length; j += 1) {
            const pair = pairingKey(team.memberIds[i], team.memberIds[j]);
            history.teammates[pair] = (history.teammates[pair] || 0) + 1;
          }
        }
      }
    }
  }
  return history;
}

export function validateTeeSheet({ teeSheet = [], players = [], teeTimes, attendance = {}, weekId, fixedPartnerRule = null, game = {} }) {
  const errors = [];
  const warnings = [];
  const playerMap = new Map(players.map(player => [key(player.id), player]));
  const seenPlayers = new Set();
  const seenTimes = new Set();
  const seenTeams = new Set();
  const rule = fixedRuleForPlayers(fixedPartnerRule, players);
  const issue = (code, message, extra = {}) => errors.push({ code, message, ...extra });
  for (const slot of teeSheet) {
    const ids = slot.players || [];
    if (seenTimes.has(slot.time)) issue('DUPLICATE_TIME', `Tee time ${slot.time} appears more than once.`, { time: slot.time });
    seenTimes.add(slot.time);
    if (teeTimes && !teeTimes.includes(slot.time)) issue('UNKNOWN_TIME', `Tee time ${slot.time} is outside the course block.`, { time: slot.time });
    if (ids.length > 4) issue('CAPACITY', `${slot.time} has more than four players.`, { time: slot.time });
    for (const id of ids) {
      const player = playerMap.get(key(id));
      if (!player) issue('UNKNOWN_PLAYER', `Player ${id} is not on the roster.`, { playerId: id, time: slot.time });
      else if (!(player.availability || []).includes(slot.time)) issue('AVAILABILITY', `${player.name} is unavailable at ${slot.time}.`, { playerId: id, time: slot.time });
      if (seenPlayers.has(key(id))) issue('DUPLICATE_PLAYER', `${player?.name || id} is scheduled more than once.`, { playerId: id });
      seenPlayers.add(key(id));
      if (isPlayerAbsent(attendance, id, weekId)) issue('ABSENT_PLAYER', `${player?.name || id} is marked absent.`, { playerId: id, time: slot.time });
    }
    if (rule && ids.some(id => sameId(id, rule.anchor.id))) {
      const others = ids.filter(id => !sameId(id, rule.anchor.id));
      if (!others.length || others.some(id => !rule.allowed.has(key(id)))) {
        issue('FIXED_PARTNER', `${rule.anchor.name}'s group must include an allowed partner and no players outside that list.`, { playerId: rule.anchor.id, time: slot.time });
      }
    }
    const teamPlayers = new Set();
    for (const team of slot.teams || []) {
      if (!team.teamId) issue('TEAM_ID', `A team at ${slot.time} is missing its identity.`, { time: slot.time });
      if (seenTeams.has(team.teamId)) issue('TEAM_SPLIT', 'A team is assigned to more than one tee time.', { teamId: team.teamId });
      seenTeams.add(team.teamId);
      for (const id of team.memberIds || []) {
        if (!ids.some(pid => sameId(pid, id))) issue('TEAM_MEMBERSHIP', `Team member ${id} is not in this tee time.`, { playerId: id, teamId: team.teamId });
        if (teamPlayers.has(key(id))) issue('DUPLICATE_TEAM_MEMBER', `Player ${id} is assigned to two teams.`, { playerId: id });
        teamPlayers.add(key(id));
      }
      if ((team.memberIds || []).length > getTeamSize(game)) issue('TEAM_CAPACITY', 'A team exceeds the size for this game.', { teamId: team.teamId });
    }
    if (getTeamSize(game) > 1) {
      const incomplete = getTeamsForSlot({ weekId, slot, game }).filter(team => team.status === 'incomplete');
      if (incomplete.length) warnings.push(`${slot.time}: ${incomplete.length} incomplete team${incomplete.length === 1 ? '' : 's'} need a commissioner decision before scoring.`);
    }
  }
  return { valid: errors.length === 0, errors, warnings };
}

function combinations(items, count) {
  if (!count) return [[]];
  return items.flatMap((item, i) => combinations(items.slice(i + 1), count - 1).map(rest => [item, ...rest]));
}

function scheduleCost(teeSheet, history, game) {
  let cost = 0;
  for (const slot of teeSheet) {
    const ids = slot.players;
    if (ids.length) cost += 3;
    if (ids.length === 1) cost += 60;
    if (getTeamSize(game) === 2 && ids.length % 2) cost += 90;
    if (getTeamSize(game) === 4 && ids.length && ids.length < 4) cost += (4 - ids.length) * 30;
    for (let i = 0; i < ids.length; i += 1) {
      cost += (history.times[ids[i]]?.[slot.time] || 0) * 6;
      for (let j = i + 1; j < ids.length; j += 1) cost += (history.foursomes[pairingKey(ids[i], ids[j])] || 0) * 30;
    }
    for (const team of slot.teams || []) {
      for (let i = 0; i < team.memberIds.length; i += 1) {
        for (let j = i + 1; j < team.memberIds.length; j += 1) cost += (history.teammates[pairingKey(team.memberIds[i], team.memberIds[j])] || 0) * 100;
      }
    }
  }
  return cost;
}

function teamCompletion(teeSheet, game) {
  const size = getTeamSize(game);
  return teeSheet.reduce((result, slot) => {
    const remainder = slot.players.length % size;
    return { incompletePlayers: result.incompletePlayers + remainder, incompleteTeams: result.incompleteTeams + (remainder ? 1 : 0) };
  }, { incompletePlayers: 0, incompleteTeams: 0 });
}

// Move a vacancy backwards through available players. Intermediate groups keep
// their original size; only the requested source/target counts change. This can
// fix odd groups even when no source player is directly available at the target.
function transferPlayers(sheet, source, target, count, playerMap, reserved) {
  const candidate = sheet.map(slot => ({ ...slot, players: [...slot.players] }));
  for (let move = 0; move < count; move += 1) {
    const queue = [{ index: target, path: [] }];
    const visited = new Set([target]);
    let transfers = null;
    for (let cursor = 0; cursor < queue.length && !transfers; cursor += 1) {
      const { index, path } = queue[cursor];
      for (let from = 0; from < candidate.length && !transfers; from += 1) {
        if (visited.has(from) || reserved.has(candidate[from].time)) continue;
        const playerId = candidate[from].players.find(id => (playerMap.get(key(id))?.availability || []).includes(candidate[index].time));
        if (playerId == null) continue;
        const next = [...path, { playerId, from, to: index }];
        if (from === source) transfers = next;
        else {
          visited.add(from);
          queue.push({ index: from, path: next });
        }
      }
    }
    if (!transfers) return null;
    for (const { playerId, from, to } of transfers) {
      candidate[from].players = candidate[from].players.filter(id => !sameId(id, playerId));
      candidate[to].players.push(playerId);
    }
  }
  return candidate;
}

// Complete teams take precedence over social mixing. Matching players one at a
// time can otherwise leave several threesomes even with a fully flexible field.
// Repair only an unpublished candidate, never a saved or locked assignment.
function completeTeamGroups({ teeSheet, players, reserved, game }) {
  const size = getTeamSize(game);
  if (size === 1) return teeSheet;
  const playerMap = new Map(players.map(player => [key(player.id), player]));
  let sheet = teeSheet;
  for (let round = 0; round < players.length; round += 1) {
    const current = teamCompletion(sheet, game);
    const total = sheet.reduce((sum, slot) => sum + slot.players.length, 0);
    if (current.incompletePlayers === total % size && current.incompleteTeams <= 1) break;
    const options = [];
    for (let source = 0; source < sheet.length; source += 1) {
      if (reserved.has(sheet[source].time) || !sheet[source].players.length) continue;
      for (let target = 0; target < sheet.length; target += 1) {
        if (source === target || reserved.has(sheet[target].time)) continue;
        const from = sheet[source].players.length;
        const to = sheet[target].players.length;
        for (let count = 1; count <= Math.min(from, 4 - to); count += 1) {
          const playerDelta = (from - count) % size + (to + count) % size - from % size - to % size;
          const teamDelta = Number((from - count) % size > 0) + Number((to + count) % size > 0) - Number(from % size > 0) - Number(to % size > 0);
          if (playerDelta < 0 || playerDelta === 0 && teamDelta < 0) options.push({ source, target, count, playerDelta, teamDelta });
        }
      }
    }
    options.sort((a, b) => a.playerDelta - b.playerDelta || a.teamDelta - b.teamDelta || a.count - b.count);
    let repaired = null;
    for (const option of options) {
      repaired = transferPlayers(sheet, option.source, option.target, option.count, playerMap, reserved);
      if (repaired) break;
    }
    if (!repaired) break;
    sheet = repaired;
  }
  return sheet;
}

// Capacity-constrained bipartite matching. Augmenting paths can move flexible
// players to make room for restricted ones; they never create an unavailable
// assignment. Reserved groups are completely fixed during this generation.
function matchPlayers({ players, teeTimes, reserved, history, random, game }) {
  const sheet = teeTimes.map(time => ({ time, players: [...(reserved.get(time)?.players || [])] }));
  const reservedIds = new Set([...reserved.values()].flatMap(slot => slot.players).map(key));
  const playerMap = new Map(players.map(player => [key(player.id), player]));
  const available = (player) => teeTimes.filter(time => (player.availability || []).includes(time) && !reserved.has(time));
  const tieBreaks = new Map(players.map(player => [key(player.id), random()]));
  const ordered = players.filter(player => !reservedIds.has(key(player.id)))
    .sort((a, b) => available(a).length - available(b).length || tieBreaks.get(key(a.id)) - tieBreaks.get(key(b.id)));
  function place(player, seenSlots) {
    const candidates = sheet.map((slot, index) => ({ slot, index, tie: random() }))
      .filter(({ slot, index }) => !seenSlots.has(index) && !reserved.has(slot.time) && (player.availability || []).includes(slot.time))
      .map(candidate => ({ ...candidate, cost: candidate.slot.players.reduce((sum, id) => sum + (history.foursomes[pairingKey(id, player.id)] || 0) * 30, 0)
        + (history.times[player.id]?.[candidate.slot.time] || 0) * 6
        - candidate.slot.players.length * (getTeamSize(game) > 1 ? 12 : 4) }))
      .sort((a, b) => a.cost - b.cost || a.tie - b.tie);
    for (const { slot, index } of candidates) {
      if (seenSlots.has(index)) continue;
      seenSlots.add(index);
      if (slot.players.length < 4) {
        slot.players.push(player.id);
        return true;
      }
      for (let i = 0; i < slot.players.length; i += 1) {
        const previousId = slot.players[i];
        const previous = playerMap.get(key(previousId));
        if (previous && place(previous, seenSlots)) {
          slot.players[i] = player.id;
          return true;
        }
      }
    }
    return false;
  }
  for (const player of ordered) place(player, new Set());
  return sheet.map(slot => reserved.has(slot.time) ? { ...reserved.get(slot.time), players: [...slot.players] } : slot);
}

/** Pure generation. Attendance is a playerId -> status map or week attendance rows. */
export function generateWeekSchedule({ weekId, players = [], weeks = [], weeklyGames = [], teeTimes = [], game = {}, attendance = {}, fixedPartnerRule = null, seed = weekId, lockedSlots = [], attempts = 16 }) {
  const random = seededRandom(seed);
  const times = [...new Set(teeTimes)];
  const uniquePlayers = [...new Map(players.map(player => [key(player.id), player])).values()];
  const eligible = uniquePlayers.filter(player => isEligible(player, attendance, weekId));
  const rule = fixedRuleForPlayers(fixedPartnerRule, eligible);
  const history = buildPairingHistory(weeks, weeklyGames, new Set([weekId]));
  const warnings = [];
  if (uniquePlayers.length !== players.length) warnings.push('Duplicate roster IDs were ignored.');
  const lockedCheck = validateTeeSheet({ teeSheet: lockedSlots, players: eligible, teeTimes: times, attendance, weekId, fixedPartnerRule, game });
  if (!lockedCheck.valid) throw new Error(`Locked groups are invalid: ${lockedCheck.errors.map(error => error.message).join(' ')}`);
  const baseReserved = new Map(lockedSlots.map(slot => [slot.time, { ...slot, players: [...slot.players] }]));
  const lockedIds = new Set(lockedSlots.flatMap(slot => slot.players).map(key));
  const candidates = [];
  const anchorLocked = rule && lockedIds.has(key(rule.anchor.id));
  if (rule && !anchorLocked) {
    for (const time of times) {
      if (baseReserved.has(time) || !(rule.anchor.availability || []).includes(time)) continue;
      const pool = eligible.filter(player => rule.allowed.has(key(player.id)) && !lockedIds.has(key(player.id)) && (player.availability || []).includes(time));
      for (let count = 1; count <= Math.min(3, pool.length); count += 1) {
        for (const partners of combinations(pool, count)) {
          const reserved = new Map(baseReserved);
          reserved.set(time, { time, players: [rule.anchor.id, ...partners.map(player => player.id)] });
          candidates.push(reserved);
        }
      }
    }
  } else {
    for (let i = 0; i < Math.max(1, attempts); i += 1) candidates.push(baseReserved);
  }
  const cannotPlaceAnchor = rule && !anchorLocked && candidates.length === 0;
  if (cannotPlaceAnchor) {
    warnings.push(`${rule.anchor.name} has no available tee time with an allowed partner. The fixed-partner rule was preserved.`);
    candidates.push(baseReserved);
  }
  const matchingPlayers = cannotPlaceAnchor ? eligible.filter(player => !sameId(player.id, rule.anchor.id)) : eligible;
  let best = null;
  for (const reserved of candidates) {
    const matched = matchPlayers({ players: matchingPlayers, teeTimes: times, reserved, history, random, game });
    const completed = completeTeamGroups({ teeSheet: matched, players, reserved, game });
    const sheet = attachTeams({ weekId, teeSheet: completed, game, players, teammateHistory: history.teammates });
    const count = sheet.reduce((sum, slot) => sum + slot.players.length, 0);
    const completion = teamCompletion(sheet, game);
    const cost = scheduleCost(sheet, history, game);
    if (!best || count > best.count || count === best.count && (
      completion.incompletePlayers < best.incompletePlayers
      || completion.incompletePlayers === best.incompletePlayers && (
        completion.incompleteTeams < best.incompleteTeams
        || completion.incompleteTeams === best.incompleteTeams && cost < best.cost
      )
    )) best = { teeSheet: sheet, count, cost, ...completion };
  }
  const teeSheet = best?.teeSheet || times.map(time => ({ time, players: [], teams: [] }));
  const assigned = new Set(teeSheet.flatMap(slot => slot.players).map(key));
  const unscheduled = eligible.filter(player => !assigned.has(key(player.id))).map(player => ({
    playerId: player.id,
    name: player.name,
    reason: cannotPlaceAnchor && sameId(player.id, rule.anchor.id) ? 'fixed_partner_conflict'
      : !(player.availability || []).some(time => times.includes(time)) ? 'no_available_tee_time' : 'capacity_or_group_constraint',
  }));
  if (unscheduled.length) warnings.push(`${unscheduled.length} player${unscheduled.length === 1 ? ' could' : 's could'} not be scheduled within availability and group rules.`);
  const validation = validateTeeSheet({ teeSheet, players, teeTimes: times, attendance, weekId, fixedPartnerRule, game });
  if (!validation.valid) throw new Error(`Schedule validation failed: ${validation.errors.map(error => error.message).join(' ')}`);
  return {
    teeSheet,
    teams: getTeamsForWeek({ weekId, teeSheet, game }),
    unscheduled,
    warnings: [...warnings, ...validation.warnings],
    diagnostics: { eligibleCount: eligible.length, scheduledCount: assigned.size, capacity: times.length * 4, candidatesEvaluated: candidates.length, incompleteTeams: best?.incompleteTeams || 0, cost: best?.cost || 0, seed },
  };
}

/** Late withdrawal: change only affected groups, never shuffle published times. */
export function repairWeekSchedule({ weekId, teeSheet = [], players = [], game = {}, absentPlayerIds = [], attendance = {}, fixedPartnerRule = null }) {
  const absent = new Set(absentPlayerIds.map(key));
  for (const player of players) if (isPlayerAbsent(attendance, player.id, weekId)) absent.add(key(player.id));
  const affectedTimes = [];
  const repaired = teeSheet.map(slot => {
    const remaining = (slot.players || []).filter(id => !absent.has(key(id)));
    if (remaining.length === (slot.players || []).length) return { ...slot, players: [...remaining], ...(slot.teams ? { teams: slot.teams.map(team => ({ ...team, memberIds: [...team.memberIds] })) } : {}) };
    affectedTimes.push(slot.time);
    const teams = getTeamsForSlot({ weekId, slot, game }).map(team => createTeam({
      weekId, game, previous: team, memberIds: team.memberIds.filter(id => !absent.has(key(id))),
    })).filter(team => team.memberIds.length);
    return { ...slot, players: remaining, teams };
  });
  const validation = validateTeeSheet({ teeSheet: repaired, players, attendance, weekId, fixedPartnerRule, game });
  return {
    teeSheet: repaired,
    teams: getTeamsForWeek({ weekId, teeSheet: repaired, game }),
    unscheduled: [],
    warnings: [...validation.warnings, ...validation.errors.map(error => error.message)],
    diagnostics: { affectedTimes, movedPlayers: 0, requiresReview: validation.warnings.length > 0 || !validation.valid },
  };
}
