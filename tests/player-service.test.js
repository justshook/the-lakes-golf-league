import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceIsOpen, normalizeAttendanceStatus, normalizeEmail, setPlayerAttendance, sendSignInLink, submitPlayerScore, loadPlayerAccount, startGoogleSignIn, signInWithEmailPassword, signUpWithEmailPassword, sendPasswordSetupLink, sendPasswordReset, changeAccountPassword, authCallbackUrl, validateNewPassword, MIN_PASSWORD_LENGTH } from '../src/lib/player-service.js';

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
    assert.deepEqual(args, { email: 'player@example.com', options: { shouldCreateUser: true, emailRedirectTo: 'https://league.example/auth/callback' } });
    return { data: {}, error: null };
  } } };
  await sendSignInLink(client, 'Player@Example.com', 'https://league.example');
});

test('auth callbacks always use the dedicated route and only the fixed password destination', () => {
  assert.equal(authCallbackUrl('https://league.example/ignored?token=secret'), 'https://league.example/auth/callback');
  const reset = new URL(authCallbackUrl('https://league.example', { passwordSetup: true }));
  assert.equal(reset.pathname, '/auth/callback');
  assert.equal(reset.searchParams.get('next'), '/account/password');
  assert.throws(() => authCallbackUrl('javascript:alert(1)'));
});

test('Google login delegates to Supabase OAuth without requesting unrelated permissions', async () => {
  const api = { auth: { signInWithOAuth: async options => {
    assert.deepEqual(options, { provider: 'google', options: { redirectTo: 'https://league.example/auth/callback', queryParams: { prompt: 'select_account' } } });
    return { data: { provider: 'google', url: 'https://accounts.google.com/example' }, error: null };
  } } };
  assert.equal((await startGoogleSignIn(api, 'https://league.example')).provider, 'google');
});

test('new passwords reject a phone suffix and preserve intentional whitespace', () => {
  assert.equal(MIN_PASSWORD_LENGTH, 12);
  assert.throws(() => validateNewPassword('1234'), /at least 12/);
  assert.throws(() => validateNewPassword(' '.repeat(12)), /only spaces/);
  assert.equal(validateNewPassword('  a long passphrase  '), '  a long passphrase  ');
});

test('password login does not silently alter passwords or derive them from roster contacts', async () => {
  const password = '  existing password  ';
  const api = { auth: { signInWithPassword: async args => {
    assert.deepEqual(args, { email: 'person@example.test', password });
    return { data: { user: { id: 'verified-user' }, session: {} }, error: null };
  } } };
  await signInWithEmailPassword(api, ' Person@Example.test ', password);
  await assert.rejects(() => signInWithEmailPassword(api, 'person@example.test', ''), /Enter your password/);
});

test('unconfirmed signup returns provider session state without pretending it is signed in', async () => {
  const api = { auth: { signUp: async args => {
    assert.deepEqual(args, { email: 'person@example.test', password: 'strong passphrase', options: { emailRedirectTo: 'https://league.example/auth/callback' } });
    return { data: { user: { id: 'unconfirmed' }, session: null }, error: null };
  } } };
  assert.equal((await signUpWithEmailPassword(api, 'Person@example.test', 'strong passphrase', 'https://league.example')).session, null);
  await assert.rejects(() => signUpWithEmailPassword(api, 'person@example.test', '1234', 'https://league.example'));
});

test('first-time password setup can create an Auth identity after email verification', async () => {
  const api = { auth: { signInWithOtp: async args => {
    assert.equal(args.email, 'person@example.test');
    assert.equal(args.options.shouldCreateUser, true);
    const target = new URL(args.options.emailRedirectTo);
    assert.equal(target.pathname, '/auth/callback');
    assert.equal(target.searchParams.get('next'), '/account/password');
    return { data: { user: null, session: null }, error: null };
  } } };
  assert.equal((await sendPasswordSetupLink(api, 'person@example.test', 'https://league.example')).session, null);
});

test('reset links use the password destination without revealing whether an email exists', async () => {
  const api = { auth: { resetPasswordForEmail: async (email, options) => {
    assert.equal(email, 'person@example.test');
    assert.equal(new URL(options.redirectTo).searchParams.get('next'), '/account/password');
    return { data: {}, error: null };
  } } };
  assert.deepEqual(await sendPasswordReset(api, 'person@example.test', 'https://league.example'), {});
});

test('password update verifies the current identity and never mutates authorization metadata', async () => {
  const api = { auth: {
    getUser: async () => ({ data: { user: { id: 'verified', email_confirmed_at: '2026-01-01' } }, error: null }),
    updateUser: async args => {
      assert.deepEqual(args, { password: 'strong passphrase' });
      return { data: { user: { id: 'verified' } }, error: null };
    },
  } };
  assert.equal((await changeAccountPassword(api, 'strong passphrase')).user.id, 'verified');
  api.auth.getUser = async () => ({ data: { user: { id: 'unconfirmed', email_confirmed_at: null } }, error: null });
  await assert.rejects(() => changeAccountPassword(api, 'strong passphrase'), /verification or recovery/);
});

const verifiedUser = { id: 'verified-user', email: 'player@example.test', email_confirmed_at: '2026-01-01' };
const verifiedAuth = { getUser: async () => ({ data: { user: verifiedUser }, error: null }) };
function queryResult(data, error = null) {
  return { select() { return this; }, eq() { return this; }, maybeSingle() { return this; }, then(resolve) { return Promise.resolve({ data, error }).then(resolve); } };
}

test('missing roster migration retains authenticated user and exposes a retryable profile error', async () => {
  let identityWasVerified = false;
  const api = { auth: verifiedAuth, rpc: async () => {
    assert.equal(identityWasVerified, true);
    return { data: null, error: { code: 'PGRST202', message: 'RPC not found' } };
  } };
  const account = await loadPlayerAccount(api, { onVerifiedUser: user => { assert.equal(user.id, 'verified-user'); identityWasVerified = true; } });
  assert.equal(account.user, verifiedUser);
  assert.equal(account.profile, null);
  assert.match(account.profileError, /awaiting database setup/);
  assert.deepEqual(account.attendance, {});
});

test('profile reads failing after authentication do not masquerade as failed login', async () => {
  const api = { auth: verifiedAuth, rpc: async () => ({ data: { player_id: 11 }, error: null }), from: () => queryResult(null, { code: '42501', message: 'No permission for league data' }) };
  const account = await loadPlayerAccount(api);
  assert.equal(account.user.id, 'verified-user');
  assert.equal(account.profile, null);
  assert.match(account.profileError, /No permission/);
});

test('linked player ID stays the existing roster ID so history is preserved', async () => {
  const profile = { player_id: 11, name: 'Existing player', availability: ['4:00 PM'], is_admin: false };
  const api = { auth: verifiedAuth, rpc: async name => { assert.equal(name, 'claim_league_player'); return { data: profile, error: null }; }, from: table => {
    if (table === 'league_rounds') return queryResult([{ week_id: '20270503', status: 'published' }]);
    if (table === 'league_attendance') return queryResult([{ week_id: '20270503', player_id: 11, status: 'in' }]);
    return queryResult({ availability: ['4:10 PM'] });
  } };
  const account = await loadPlayerAccount(api);
  assert.equal(account.profile.player_id, 11);
  assert.equal(account.profileError, null);
  assert.equal(account.attendance['20270503'].player_id, 11);
  assert.deepEqual(account.availability, ['4:10 PM']);
});

test('a missing or invalid Auth session never retains an identity or claims a player', async () => {
  assert.equal(await loadPlayerAccount({ auth: { getUser: async () => ({ data: {}, error: { name: 'AuthSessionMissingError' } }) } }), null);
  await assert.rejects(() => loadPlayerAccount({ auth: { getUser: async () => ({ data: {}, error: { message: 'Invalid token' } }) } }), /Invalid token/);
});
