// Team records live inside the existing tee_sheet JSON. Older sheets with only
// { time, players } remain readable; new sheets never infer partners from order.
const idKey = (id) => String(id);
const sameId = (a, b) => idKey(a) === idKey(b);

export const pairingKey = (a, b) => JSON.stringify([idKey(a), idKey(b)].sort());

export function getTeamSize(game) {
  const type = typeof game === 'string' ? game : game?.teamType;
  return type === '2-person' ? 2 : type === '4-person' ? 4 : 1;
}

export function stableTeamId(weekId, memberIds, teamType = '2-person') {
  const members = [...new Set(memberIds.map(idKey))].sort();
  return `week:${encodeURIComponent(weekId)}:${teamType}:${members.map(encodeURIComponent).join('|')}`;
}

export function createTeam({ weekId, memberIds, game, previous = null }) {
  const teamType = (typeof game === 'string' ? game : game?.teamType) || null;
  const ids = [...new Map(memberIds.map(id => [idKey(id), id])).values()];
  return {
    ...previous,
    teamId: previous?.teamId || stableTeamId(weekId, ids, teamType),
    memberIds: ids,
    teamType,
    status: ids.length === getTeamSize(game) ? 'complete' : 'incomplete',
  };
}

export function getTeamsForSlot({ weekId, slot, game }) {
  if (getTeamSize(game) === 1) return [];
  const ids = slot.players || [];
  // An explicit assignment wins over the display order, including when a
  // withdrawal has left one half of a team behind.
  if (Array.isArray(slot.teams)) {
    const claimed = new Set();
    const teams = slot.teams.map(team => {
      const memberIds = (team.memberIds || []).filter(id => {
        if (!ids.some(pid => sameId(pid, id)) || claimed.has(idKey(id))) return false;
        claimed.add(idKey(id));
        return true;
      });
      return createTeam({ weekId, memberIds, game, previous: team });
    }).filter(team => team.memberIds.length);
    // New/unassigned players must not silently become another team's partner.
    for (const id of ids) {
      if (!claimed.has(idKey(id))) teams.push(createTeam({ weekId, memberIds: [id], game }));
    }
    return teams;
  }
  const size = getTeamSize(game);
  const teams = [];
  for (let i = 0; i < ids.length; i += size) {
    teams.push(createTeam({ weekId, memberIds: ids.slice(i, i + size), game }));
  }
  return teams;
}

export function getTeamsForWeek({ weekId, teeSheet = [], game }) {
  return teeSheet.flatMap(slot => getTeamsForSlot({ weekId, slot, game }));
}

export function getPlayerTeam({ playerId, weekId, teeSheet = [], game }) {
  const slot = teeSheet.find(row => (row.players || []).some(id => sameId(id, playerId)));
  const team = slot && getTeamsForSlot({ weekId, slot, game })
    .find(row => row.memberIds.some(id => sameId(id, playerId)));
  if (!team) return { team: null, teammates: [], teamType: null, slot: slot || null, isSolo: true };
  return {
    team,
    teamId: team.teamId,
    teammates: team.memberIds.filter(id => !sameId(id, playerId)),
    teamType: team.teamType,
    slot,
    isSolo: team.memberIds.length === 1,
    isThreesome: team.teamType === '4-person' ? team.memberIds.length === 3 : slot.players.length === 3,
    isIncomplete: team.status === 'incomplete',
  };
}

function possiblePairs(ids) {
  if (ids.length <= 2) return [[ids]];
  if (ids.length === 3) return [
    [[ids[0], ids[1]], [ids[2]]],
    [[ids[0], ids[2]], [ids[1]]],
    [[ids[1], ids[2]], [ids[0]]],
  ];
  return [
    [[ids[0], ids[1]], [ids[2], ids[3]]],
    [[ids[0], ids[2]], [ids[1], ids[3]]],
    [[ids[0], ids[3]], [ids[1], ids[2]]],
  ];
}

export function selectTeamMembers({ memberIds, game, players = [], teammateHistory = {}, balanceTeams = true }) {
  const size = getTeamSize(game);
  if (size === 1 || !memberIds.length) return [];
  if (size === 4) return [[...memberIds]];
  const playerMap = new Map(players.map(player => [idKey(player.id), player]));
  const handicap = (id) => Number(playerMap.get(idKey(id))?.handicap) || 0;
  const cost = (teams) => {
    const repetition = teams.reduce((total, ids) => total + (ids.length === 2
      ? (teammateHistory[pairingKey(...ids)] || 0) : 0), 0);
    const sums = teams.filter(ids => ids.length === 2).map(ids => ids.reduce((total, id) => total + handicap(id), 0));
    const balance = balanceTeams && sums.length === 2 ? Math.abs(sums[0] - sums[1]) : 0;
    return repetition * 100 + balance;
  };
  return possiblePairs(memberIds).sort((a, b) => cost(a) - cost(b))[0];
}

export function attachTeams({ weekId, teeSheet = [], game, players = [], teammateHistory = {}, preserveExisting = true, balanceTeams = true }) {
  return teeSheet.map(slot => {
    const memberGroups = selectTeamMembers({ memberIds: slot.players || [], game, players, teammateHistory, balanceTeams });
    const teams = preserveExisting && Array.isArray(slot.teams)
      ? getTeamsForSlot({ weekId, slot, game })
      : memberGroups.map(memberIds => createTeam({ weekId, memberIds, game }));
    // Keep paired members adjacent for old rendering code, while identities are
    // authoritative for new scoring. Reordering this array later is safe.
    return { ...slot, players: teams.length ? teams.flatMap(team => team.memberIds) : [...(slot.players || [])], teams };
  });
}
