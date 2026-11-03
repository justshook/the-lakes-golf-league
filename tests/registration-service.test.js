import test from 'node:test';
import assert from 'node:assert/strict';
import { decideRegistration, loadRegistration, registrationNotificationSummary, retryRegistrationNotifications, submitRegistration, validateRegistration } from '../src/services/registration-service.js';

const fields = { first_name: ' New ', last_name: ' Player ', phone: '+1 (312) 555-0100', handicap_id: ' GHIN-12345 ', handicap_index: '12.4', availability: ['4:10 PM', '3:30 PM', '4:10 PM'], membership_type: 'full_time' };
const client = { auth: { getSession: async () => ({ data: { session: { access_token: 'fixture-token' } }, error: null }) } };
const response = result => ({ ok: true, status: 200, json: async () => result });

test('registration form requires a single handicap ID, bounded index, phone, and recognized tee times', () => {
  const result = validateRegistration(fields);
  assert.equal(result.handicap_id, 'GHIN-12345');
  assert.equal(result.handicap_index, 12.4);
  assert.deepEqual(result.availability, ['3:30 PM', '4:10 PM']);
  for (const change of [{ handicap_id: '' }, { handicap_index: ' ' }, { handicap_index: [] }, { handicap_index: -10.1 }, { handicap_index: 54.1 }, { phone: '1234' }, { availability: [] }, { availability: ['Midnight'] }, { membership_type: 'admin' }]) assert.throws(() => validateRegistration({ ...fields, ...change }));
  assert.equal(validateRegistration({ ...fields, handicap_index: -10 }).handicap_index, -10);
  assert.equal(validateRegistration({ ...fields, handicap_index: 54 }).handicap_index, 54);
});

test('submission allows only playing details, leaving email identity, player ownership and price to server', async () => {
  for (const membership_type of ['full_time', 'substitute']) {
    await submitRegistration(client, { ...fields, membership_type, email: 'another@example.test', player_id: 22, fee_cents: 1, is_admin: true }, { fetchImpl: async (url, options) => {
      assert.equal(url, '/api/registrations');
      assert.equal(options.method, 'POST');
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.headers.Authorization, 'Bearer fixture-token');
      assert.deepEqual(JSON.parse(options.body), { action: 'submit', ...validateRegistration({ ...fields, membership_type }) });
      return response({ application: { id: 'fixture', status: 'pending' } });
    } });
  }
});

test('registration requests require a session and never expose provider error details', async () => {
  let fetched = false;
  await assert.rejects(() => loadRegistration({ auth: { getSession: async () => ({ data: { session: null } }) } }, { fetchImpl: async () => { fetched = true; } }), /Sign in again/);
  assert.equal(fetched, false);
  await assert.rejects(() => loadRegistration(client, { fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({ error: 'secret provider detail', token: 'private' }) }) }), error => !error.message.includes('secret') && !error.message.includes('private') && /temporarily unavailable/.test(error.message));
  await assert.rejects(() => loadRegistration(client, { fetchImpl: async () => { throw new Error('private network detail'); } }), /temporarily unavailable/);
});

test('approval and email retry have separate bounded actions without payment or identity claims', async () => {
  const bodies = [];
  const options = { fetchImpl: async (url, request) => { bodies.push(JSON.parse(request.body)); return response({ application: { id: 'application-1', status: 'approved' } }); } };
  await decideRegistration(client, 'application-1', 'approved', options);
  await retryRegistrationNotifications(client, 'application-1', options);
  assert.deepEqual(bodies, [{ action: 'decide', application_id: 'application-1', decision: 'approved' }, { action: 'retry_notifications', application_id: 'application-1' }]);
  assert.throws(() => decideRegistration(client, 'application-1', 'pay'));
});

test('email updates distinguish queued, sent, failed and unconfirmed delivery', () => {
  assert.equal(registrationNotificationSummary({}), '');
  assert.equal(registrationNotificationSummary({ sent: 1, queued: 2 }), 'Email updates: 1 sent · 2 queued.');
  const result = registrationNotificationSummary({ failed: 1, unknown: 1 });
  assert.match(result, /1 failed/);
  assert.match(result, /1 delivery unconfirmed/);
  assert.match(result, /Review unconfirmed delivery before resending/);
  assert.doesNotMatch(result, /sent\./);
});
