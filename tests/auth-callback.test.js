import test from 'node:test';
import assert from 'node:assert/strict';
import { completeAuthCallback, readAuthCallback, safeAuthDestination, hasAuthCallbackParameters, callbackErrorMessage } from '../src/lib/auth-callback.js';

const verified = { id: 'verified-player', email: 'player@example.test', email_confirmed_at: '2026-01-01' };
function fixture({ user = verified, error = null, session = { access_token: 'test' } } = {}) {
  const calls = [];
  const client = { auth: Object.fromEntries(['exchangeCodeForSession', 'verifyOtp', 'setSession', 'getSession', 'getUser'].map(method => [method, async payload => {
    calls.push([method, payload]);
    return method === 'getUser' ? { data: { user }, error: null } : { data: { session }, error };
  }])) };
  return { client, calls };
}

test('auth callback captures both modern and legacy URL credentials without following arbitrary destinations', () => {
  for (const value of ['https://evil.example', '//evil.example', '/admin', '/profile?next=https://evil.example']) assert.equal(safeAuthDestination(value), '/');
  assert.equal(safeAuthDestination('/profile'), '/profile');
  assert.equal(hasAuthCallbackParameters('', '#access_token=test'), true);
  assert.equal(hasAuthCallbackParameters('?code=test', ''), true);
  assert.equal(hasAuthCallbackParameters('?year=2026', ''), false);
  const result = readAuthCallback('https://league.example/my-week?next=%2Faccount%2Fpassword#access_token=a&refresh_token=r&type=magiclink');
  assert.equal(result.needsPasswordSetup, true);
  assert.equal(result.next, '/account/password');
});

test('implicit email/Google session is server verified before reaching the player profile', async () => {
  const { client, calls } = fixture();
  const result = await completeAuthCallback(client, 'https://league.example/auth/callback?next=/profile#access_token=a&refresh_token=r');
  assert.deepEqual(calls, [['setSession', { access_token: 'a', refresh_token: 'r' }], ['getUser', undefined]]);
  assert.equal(result.user.id, verified.id);
  assert.equal(result.next, '/profile');
});

test('PKCE callbacks exchange their code and verify the resulting identity', async () => {
  const { client, calls } = fixture();
  await completeAuthCallback(client, 'https://league.example/auth/callback?code=one-use');
  assert.deepEqual(calls.map(([method]) => method), ['exchangeCodeForSession', 'getUser']);
});

test('custom token-hash email template works without the initiating browser session', async () => {
  const { client, calls } = fixture();
  const result = await completeAuthCallback(client, 'https://league.example/auth/confirm?token_hash=one-use&type=recovery');
  assert.deepEqual(calls[0], ['verifyOtp', { token_hash: 'one-use', type: 'recovery' }]);
  assert.equal(result.needsPasswordSetup, true);
  assert.equal(result.next, '/account/password');
});

test('invalid email action and incomplete token pair are rejected before calling Auth', async () => {
  for (const query of ['?token_hash=x&type=unsupported', '#access_token=a']) {
    const { client, calls } = fixture();
    await assert.rejects(completeAuthCallback(client, `https://league.example/auth/callback${query}`), /invalid_token/);
    assert.equal(calls.length, 0);
  }
});

test('provider errors do not fall back to an existing signed-in session', async () => {
  const { client, calls } = fixture();
  await assert.rejects(completeAuthCallback(client, 'https://league.example/auth/callback#error_code=otp_expired'), /otp_expired/);
  assert.equal(calls.length, 0);
});

test('unverified users cannot complete an authentication callback', async () => {
  const { client } = fixture({ user: { id: 'unverified' } });
  await assert.rejects(completeAuthCallback(client, 'https://league.example/auth/callback?code=c'), /email_not_confirmed/);
});

test('missing sessions and expired links produce actionable, sanitized errors', async () => {
  const { client } = fixture({ session: null });
  await assert.rejects(completeAuthCallback(client, 'https://league.example/auth/callback'), /missing_link/);
  assert.match(callbackErrorMessage({ code: 'otp_expired' }), /Request a new link/);
  assert.match(callbackErrorMessage({ code: 'flow_state_not_found' }), /another browser/);
  assert.match(callbackErrorMessage({ message: 'https://example.test/#access_token=secret' }), /could not complete/);
  assert.doesNotMatch(callbackErrorMessage({ message: 'https://example.test/#access_token=secret' }), /secret/);
});
