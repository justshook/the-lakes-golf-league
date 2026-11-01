// These keys come from the legacy ID/upsert paths and the new migrations. A
// deterministic unique order is essential: range() alone does not guarantee it.
export const LEAGUE_READ_ORDER = Object.freeze({
  league_public_players: ['id'],
  tee_sheets: ['week_id'],
  player_money: ['id'],
  player_scores: ['id'],
  weekly_games: ['week_id'],
  giant_skins: ['hole_number'],
  league_rounds: ['week_id'],
  league_attendance: ['week_id', 'player_id'],
  league_player_preferences: ['player_id'],
  league_ledger_entries: ['id'],
});

function historyError(table, detail, code = 'HISTORY_INCOMPLETE') {
  const error = new Error('The complete league history could not be loaded. Please reload before reviewing totals or making changes.');
  error.code = code;
  error.sourceTable = table;
  error.detail = detail;
  return error;
}

/**
 * A Supabase-shaped result containing either a complete ordered table or no
 * data. Exact counts make a short server-capped page distinguishable from the
 * last page. No first-page data is returned after a later failure.
 */
export async function readAllRows(client, table, {
  order = LEAGUE_READ_ORDER[table], pageSize = 500, isCurrent = () => true,
} = {}) {
  if (!Array.isArray(order) || order.length === 0 || order.some(key => typeof key !== 'string' || !key)) {
    throw new TypeError('Paginated reads require an explicit stable unique order.');
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new TypeError('Page size must be between 1 and 1000.');
  const rows = [];
  const seen = new Set();
  let expectedCount;
  try {
    while (true) {
      if (!isCurrent()) throw historyError(table, 'Refresh superseded', 'HISTORY_SUPERSEDED');
      let query = client.from(table).select('*', { count: 'exact' });
      for (const key of order) query = query.order(key, { ascending: true });
      const result = await query.range(rows.length, rows.length + pageSize - 1);
      if (!isCurrent()) throw historyError(table, 'Refresh superseded', 'HISTORY_SUPERSEDED');
      if (result.error) {
        const error = new Error(result.error.message || 'League data could not load.');
        Object.assign(error, result.error, { sourceTable: table });
        throw error;
      }
      if (!Array.isArray(result.data) || !Number.isSafeInteger(result.count) || result.count < 0) {
        throw historyError(table, 'Missing exact count or invalid page data');
      }
      if (expectedCount === undefined) expectedCount = result.count;
      if (result.count !== expectedCount) throw historyError(table, 'Table changed during pagination');
      if (result.data.length > pageSize || rows.length + result.data.length > expectedCount) {
        throw historyError(table, 'Page exceeds its declared range or count');
      }
      if (result.data.length === 0 && rows.length < expectedCount) throw historyError(table, 'History ended before its declared count');
      for (const row of result.data) {
        if (!row || order.some(key => row[key] == null || !['string', 'number'].includes(typeof row[key]))) {
          throw historyError(table, 'Stable row key is missing');
        }
        const key = JSON.stringify(order.map(column => row[column]));
        if (seen.has(key)) throw historyError(table, 'Repeated row across pages');
        seen.add(key);
        rows.push(row);
      }
      if (rows.length === expectedCount) return { data: rows, error: null, count: expectedCount };
      // Advance by actual returned rows, not requested size: a project can use
      // a stricter server row cap than our 500-row request.
    }
  } catch (cause) {
    const error = cause instanceof Error ? cause : historyError(table, String(cause));
    error.sourceTable ??= table;
    return { data: null, error, count: null };
  }
}
