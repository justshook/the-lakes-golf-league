const sameId = (a, b) => a != null && b != null && String(a) === String(b);

export function roundLabel(weekId, week) {
  if (week?.label) return week.label;
  if (/^\d{8}$/.test(String(weekId)) && week?.date) {
    const date = new Date(`${week.date}T12:00:00`);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return `Week ${weekId}`;
}

function numeric(value) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function historyPeriod(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'undated';
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? 'undated' : date.slice(0, 4);
}

export function normalizeHistoryPeriod(value) {
  return value === 'undated' || /^\d{4}$/.test(value ?? '') ? value : 'all';
}

export function historyPeriods(records = []) {
  const periods = new Set(records.map(record => historyPeriod(record.date)));
  return [...periods].filter(period => period !== 'undated').sort((a, b) => b.localeCompare(a))
    .concat(periods.has('undated') ? ['undated'] : []);
}

export function matchesHistoryPeriod(date, period = 'all') {
  return period === 'all' || historyPeriod(date) === period;
}

/** Score snapshots are displayed as recorded, never recalculated using today's handicap. */
export function summarizePlayerResults({ playerId, scores = [], weeks = [], games = [], period = 'all' }) {
  if (playerId == null) return { rounds: [], roundCount: 0, individualCount: 0, teamCount: 0, averageGross: null, averageNet: null, bestGross: null };
  const rounds = scores.filter(score => sameId(score.player_id, playerId)).map(score => {
    const week = weeks.find(item => sameId(item.id, score.week_id));
    const game = games.find(item => sameId(item.weekId ?? item.week_id, score.week_id));
    // Older rows can omit is_team_score. Team-format weeks are excluded from
    // individual averages even when that legacy flag is missing or inconsistent.
    const teamType = game?.teamType ?? game?.team_type;
    const isTeam = score.is_team_score === true || score.is_team_score === 'true' || Boolean(teamType);
    return {
      id: score.id ?? `${score.player_id}:${score.week_id}`,
      weekId: score.week_id, date: week?.date ?? null,
      label: roundLabel(score.week_id, week), dateBasedId: /^\d{8}$/.test(String(score.week_id)),
      nineHoles: week?.nineHoles ?? null,
      gameName: game?.gameName ?? game?.game_name ?? (isTeam ? 'Team round' : 'Individual round'),
      isTeam, gross: numeric(score.gross_score), net: numeric(score.net_score),
      handicapUsed: numeric(score.handicap_used),
    };
  }).filter(round => matchesHistoryPeriod(round.date, period))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || Number(b.weekId) - Number(a.weekId));
  const individual = rounds.filter(round => !round.isTeam);
  const gross = individual.map(round => round.gross).filter(value => value != null);
  const net = individual.map(round => round.net).filter(value => value != null);
  const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  return {
    rounds, roundCount: rounds.length, individualCount: individual.length,
    teamCount: rounds.length - individual.length,
    averageGross: average(gross), averageNet: average(net),
    bestGross: gross.length ? Math.min(...gross) : null,
  };
}

/** Legacy player_money rows are awards only, never evidence of a cash payout. */
export function summarizePlayerAwards(player, weeks = [], getLabel = (_week, category) => category, { period = 'all' } = {}) {
  const awards = [];
  let invalidCount = 0;
  for (const [weekId, categories] of Object.entries(player?.weeklyMoney ?? {})) {
    const week = weeks.find(week => sameId(week.id, weekId));
    if (!matchesHistoryPeriod(week?.date, period)) continue;
    if (!categories || typeof categories !== 'object' || Array.isArray(categories)) { invalidCount++; continue; }
    for (const [category, rawAmount] of Object.entries(categories)) {
      const amount = numeric(rawAmount);
      const cents = amount == null ? null : Math.round(amount * 100);
      if (amount == null || amount < 0 || !Number.isSafeInteger(cents) || Math.abs(amount * 100 - cents) > 0.000001) { invalidCount++; continue; }
      if (cents === 0) continue;
      awards.push({
        id: `${player.id}:${weekId}:${category}`, weekId,
        date: week?.date ?? null, roundLabel: roundLabel(weekId, week), dateBasedId: /^\d{8}$/.test(String(weekId)),
        category, label: getLabel(Number(weekId), category), amountCents: cents,
      });
    }
  }
  awards.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || Number(b.weekId) - Number(a.weekId));
  const total = awards.reduce((sum, award) => sum + award.amountCents, 0);
  const overflow = !Number.isSafeInteger(total);
  return { awards, totalCents: overflow ? null : total, invalidCount: invalidCount + Number(overflow) };
}

export function formatRoundDate(date) {
  if (!date) return null;
  const value = new Date(`${date}T12:00:00`);
  return Number.isNaN(value.getTime()) ? null : value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
