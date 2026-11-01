import { courseHoles } from '../constants.js';

export const chicagoToday = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const entryKey = participant => participant.team_id ? `team:${participant.team_id}` : `player:${participant.player_id}`;
export const formatToPar = value => value == null ? '—' : value === 0 ? 'E' : value > 0 ? `+${value}` : String(value);

// Monday–Sunday is the league week. Outside the season, show the next
// published round, or the most recent recorded week when there isn't one.
export function currentResultsWeek(weeks, today = chicagoToday()) {
  const date = new Date(`${today}T12:00:00Z`);
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
  const start = monday.toISOString().slice(0, 10), end = sunday.toISOString().slice(0, 10);
  const eligible = weeks.filter(w => !w.weatherCancelled && ['published', 'finalized'].includes(w.status)).sort((a, b) => a.date.localeCompare(b.date));
  return eligible.find(w => w.date >= start && w.date <= end) || eligible.find(w => w.date > today) || eligible.at(-1) || null;
}

// Use the frozen playing handicap directly, including team and plus handicaps.
export function allocateStrokes(handicap, holes) {
  if (!Number.isInteger(handicap) || !holes.length) throw new Error('A frozen playing handicap and course are required.');
  const direction = handicap < 0 ? -1 : 1;
  const order = holes.map((hole, i) => ({ i, index: hole.handicapIndex })).sort((a, b) => direction * (a.index - b.index));
  const ranks = new Map(order.map((hole, i) => [hole.i, i]));
  return holes.map((_, i) => direction * (Math.floor(Math.abs(handicap) / holes.length) + (ranks.get(i) < Math.abs(handicap) % holes.length ? 1 : 0)) || 0);
}

export function summarizeCard(card) {
  const strokes = allocateStrokes(Number(card.handicap_used), card.holes);
  let gross = 0, net = 0, par = 0, thru = 0;
  card.holes.forEach((hole, i) => {
    const value = card.gross_scores[i];
    if (value == null) return;
    gross += value; net += value - strokes[i]; par += hole.par; thru++;
  });
  return { gross: thru ? gross : null, net: thru ? net : null, toPar: thru ? net - par : null, thru, strokes, complete: thru === card.holes.length };
}

export function weeklyLeaderboard({ week, players, participants = [], cards = [], scores = [] }) {
  if (!week) return [];
  const sameWeek = row => String(row.week_id) === String(week.id);
  const official = scores.filter(sameWeek), frozen = participants.filter(sameWeek), live = cards.filter(sameWeek);
  const ids = new Set([...frozen.map(p => String(p.player_id)), ...official.map(s => String(s.player_id)), ...live.flatMap(c => c.member_ids.map(String))]);
  const rows = [...ids].map(id => {
    const player = players.find(p => String(p.id) === id);
    const score = official.find(s => String(s.player_id) === id);
    const card = live.find(c => c.member_ids.some(member => String(member) === id));
    const participant = frozen.find(p => String(p.player_id) === id);
    const totalPar = courseHoles.slice(week.nineHoles === 'back' ? 9 : 0, week.nineHoles === 'back' ? 18 : 9).reduce((sum, h) => sum + h.par, 0);
    const summary = card ? summarizeCard(card) : {};
    return { playerId: id, name: player?.name || 'League player', card, team: Boolean(participant?.team_id || score?.is_team_score || card?.team_id),
      gross: score?.gross_score ?? summary.gross ?? null, net: score?.net_score ?? summary.net ?? null,
      toPar: score?.net_score != null ? score.net_score - totalPar : summary.toPar ?? null,
      thru: score ? 9 : summary.thru || 0,
      status: score || card?.submitted_at ? 'Submitted' : summary.complete ? 'Awaiting submission' : card ? 'In progress' : 'Not started' };
  }).sort((a, b) => (a.toPar ?? Infinity) - (b.toPar ?? Infinity) || b.thru - a.thru || a.name.localeCompare(b.name));
  let lastScore, rank;
  return rows.map((row, i) => {
    if (row.toPar == null) return { ...row, rank: '—' };
    if (row.toPar !== lastScore) rank = i + 1;
    lastScore = row.toPar;
    return { ...row, rank: rows.filter(other => other.toPar === row.toPar).length > 1 ? `T${rank}` : String(rank) };
  });
}
