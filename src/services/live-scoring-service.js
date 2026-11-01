import { readAllRows } from '../lib/pagination.js';

export async function loadLiveWeek(client, weekId) {
  const tables = ['league_scorecards', 'league_round_participants', 'player_scores'];
  const results = await Promise.all(tables.map(table => readAllRows(client, table, { filters: { week_id: String(weekId) } })));
  const failure = results.find(result => result.error);
  if (failure) throw new Error(failure.error.message || 'Live scores could not load.');
  return { cards: results[0].data, participants: results[1].data, scores: results[2].data };
}

export async function changeScorecard(client, { weekId, action, hole = null, gross = null, revision = null }) {
  const { data, error } = await client.rpc('manage_league_scorecard', { p_week_id: String(weekId), p_action: action, p_hole: hole, p_gross: gross, p_revision: revision });
  if (error) throw new Error(error.message || 'Your score was not saved. Please retry.');
  return data;
}
