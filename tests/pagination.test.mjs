import test from 'node:test';
import assert from 'node:assert/strict';
import { readAllRows, LEAGUE_READ_ORDER } from '../src/lib/pagination.js';

function mockClient(records, { cap = Infinity, response } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      const call = { table, order: [] };
      const query = {
        select(columns, options) { call.columns = columns; call.options = options; return query; },
        order(column, options) { call.order.push({ column, options }); return query; },
        async range(from, to) {
          call.from = from; call.to = to; calls.push(call);
          if (response) return response(call, calls.length);
          const sorted = [...records].sort((a, b) => {
            for (const { column } of call.order) {
              if (a[column] === b[column]) continue;
              return a[column] < b[column] ? -1 : 1;
            }
            return 0;
          });
          return { data: sorted.slice(from, Math.min(to + 1, from + cap)), count: sorted.length, error: null };
        },
      };
      return query;
    },
  };
}

test('retrieves every historical score beyond the default 1,000-row cap with stable order', async () => {
  const records = Array.from({ length: 1263 }, (_, index) => ({ id: 1263 - index, player_id: index % 40, gross_score: 40 }));
  const client = mockClient(records);
  const result = await readAllRows(client, 'player_scores');
  assert.equal(result.error, null);
  assert.equal(result.data.length, 1263);
  assert.equal(result.data[0].id, 1);
  assert.equal(result.data.at(-1).id, 1263);
  assert.deepEqual(client.calls.map(call => [call.from, call.to]), [[0, 499], [500, 999], [1000, 1499]]);
  for (const call of client.calls) {
    assert.deepEqual(call.order, [{ column: 'id', options: { ascending: true } }]);
    assert.deepEqual(call.options, { count: 'exact' });
  }
});

test('short server-capped pages are not mistaken for complete history', async () => {
  const client = mockClient(Array.from({ length: 251 }, (_, id) => ({ id })), { cap: 100 });
  const result = await readAllRows(client, 'player_money');
  assert.equal(result.data.length, 251);
  assert.deepEqual(client.calls.map(call => call.from), [0, 100, 200]);
});

test('composite-key attendance pagination is ordered deterministically', async () => {
  const records = [{ week_id: '2', player_id: 2 }, { week_id: '1', player_id: 2 }, { week_id: '1', player_id: 1 }];
  const client = mockClient(records);
  const result = await readAllRows(client, 'league_attendance', { pageSize: 2 });
  assert.deepEqual(result.data, [records[2], records[1], records[0]]);
  assert.deepEqual(client.calls[0].order.map(item => item.column), ['week_id', 'player_id']);
});

test('a failure on a later page returns no partial records or misleading count', async () => {
  const client = mockClient([], { response: (_call, page) => page === 1
    ? { data: [{ id: 1 }, { id: 2 }], count: 3, error: null }
    : { data: null, count: null, error: { code: '42501', message: 'Permission denied' } } });
  const result = await readAllRows(client, 'player_scores', { pageSize: 2 });
  assert.equal(result.data, null);
  assert.equal(result.count, null);
  assert.equal(result.error.code, '42501');
  assert.equal(result.error.sourceTable, 'player_scores');
});

test('empty tables succeed and exact page multiples need no speculative extra request', async () => {
  const empty = mockClient([]);
  assert.deepEqual(await readAllRows(empty, 'league_rounds'), { data: [], count: 0, error: null });
  const exact = mockClient([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  assert.equal((await readAllRows(exact, 'league_ledger_entries', { pageSize: 2 })).data.length, 4);
  assert.equal(exact.calls.length, 2);
});

test('inconsistent counts, repeated records, missing keys and early empty pages fail closed', async () => {
  const first = { data: [{ id: 1 }], count: 2, error: null };
  for (const second of [
    { data: [{ id: 2 }], count: 3, error: null },
    { data: [{ id: 1 }], count: 2, error: null },
    { data: [{}], count: 2, error: null },
    { data: [], count: 2, error: null },
    { data: [{ id: 2 }], count: null, error: null },
  ]) {
    const client = mockClient([], { response: (_call, page) => page === 1 ? first : second });
    const result = await readAllRows(client, 'player_scores', { pageSize: 1 });
    assert.equal(result.data, null);
    assert.equal(result.error.code, 'HISTORY_INCOMPLETE');
  }
});

test('superseded account refresh stops before fetching another page', async () => {
  let current = true;
  const client = mockClient([], { response: () => { current = false; return { data: [{ id: 1 }], count: 2, error: null }; } });
  const result = await readAllRows(client, 'player_scores', { pageSize: 1, isCurrent: () => current });
  assert.equal(result.data, null);
  assert.equal(result.error.code, 'HISTORY_SUPERSEDED');
  assert.equal(client.calls.length, 1);
});

test('every mounted league read has an explicit documented ordering key', () => {
  for (const table of ['league_public_players', 'tee_sheets', 'player_money', 'player_scores', 'weekly_games', 'giant_skins', 'league_rounds', 'league_attendance', 'league_player_preferences', 'league_ledger_entries']) {
    assert.ok(LEAGUE_READ_ORDER[table]?.length);
  }
});
