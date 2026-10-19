import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceIsOpen, normalizeAttendanceStatus, normalizeEmail, setPlayerAttendance, sendSignInLink, submitPlayerScore } from '../src/lib/player-service.js';

test('attendance requires configured server round, supported state, and strict deadline', () => {
  const now = new Date('2027-05-02T17:00:00Z');
  const round = { status: 'published', attendance_deadline: '2027-05-02T17:00:01Z' };
  assert.equal(attendanceIsOpen(round, now), true);
  assert.equal(attendanceIsOpen({ ...round, attendance_deadline: now.toISOString() }, now), false);
  assert.equal(attendanceIsOpen({ ...round, status: 'finalized' }, now), false);
  assert.equal(attendanceIsOpen({ ...round, attendance_deadline: null }, now), false);
  assert.equal(attendanceIsOpen(undefined, now), false);
});

test('email input is normalized and invalid input rejected before auth', () => {
  assert.equal(normalizeEmail(' Player@Example.com '), 'player@example.com');
  assert.throws(() => normalizeEmail('not-an-email'));
  assert.throws(() => normalizeAttendanceStatus('maybe'));
});

test('attendance RPC never accepts client user/player IDs or a client deadline', async () => {
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'set_league_attendance');
    assert.deepEqual(args, { p_week_id: '20270503', p_status: 'out' });
    return { data: { status: 'out' }, error: null };
  } };
  assert.deepEqual(await setPlayerAttendance(client, 20270503, 'out'), { status: 'out' });
  await assert.rejects(() => setPlayerAttendance(null, 1, 'in'), /not configured/);
});

test('score RPC excludes claimed identity, net score, and handicap', async () => {
  const client = { rpc: async (name, args) => {
    assert.equal(name, 'submit_league_score');
    assert.deepEqual(args, { p_week_id: '1', p_gross_score: 39, p_birdie_holes: [], p_eagle_holes: [] });
    return { data: [], error: null };
  } };
  await submitPlayerScore(client, { weekId: 1, grossScore: 39, playerId: 999, handicap: 40 });
  await assert.rejects(() => submitPlayerScore(client, { weekId: 1, grossScore: 38.5 }));
});

test('sign in uses configured origin and lets database verify roster membership', async () => {
  const client = { auth: { signInWithOtp: async args => {
    assert.deepEqual(args, { email: 'player@example.com', options: { shouldCreateUser: true, emailRedirectTo: 'https://league.example/my-week' } });
    return { data: {}, error: null };
  } } };
  await sendSignInLink(client, 'Player@Example.com', 'https://league.example');
});
