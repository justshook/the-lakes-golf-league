import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import registrationHandler from '../api/registrations.js';
import {
  dispatchRegistrationNotifications, handleRegistrationRequest, notificationMessage,
  RegistrationError, registrationFailure, registrationRpc, registrationServices,
} from '../server/registrations.js';

const origin = 'https://www.lakesleague.com';
const applicationId = '11111111-1111-4111-8111-111111111111';
const user = { id: 'verified-user', email: 'player@example.test', email_confirmed_at: '2026-11-01' };
const fields = { first_name: 'Taylor', last_name: 'Test', phone: '+1 312 555 0100', handicap_id: 'GHIN-123', handicap_index: 12.4, availability: ['4:00 PM'], membership_type: 'full_time' };
const application = { id: applicationId, ...fields, status: 'pending', fee_cents: 18000 };
const notification = { id: 'notification-1', lease: 'lease-1', kind: 'application_approved', recipient: user.email, ...fields, fee_cents: 18000 };
const mail = { host: 'smtp.example.test', port: 465, user: 'commissioner@example.test', password: 'fixture-only' };
const request = (body = { action: 'submit', ...fields }, extra = {}) => ({ method: 'POST', headers: { authorization: 'Bearer fixture-token', origin }, body, ...extra });

function fixture({ rpc, identity = user, authError = null, smtp = {} } = {}) {
  const calls = [];
  const services = { origin, mail: smtp, db: {
    auth: { getUser: async token => { assert.equal(token, 'fixture-token'); return { data: { user: identity }, error: authError }; } },
    rpc: async (name, args) => {
      calls.push({ name, args });
      return rpc ? rpc(name, args) : { data: name === 'league_submit_registration' ? { application } : { notifications: { queued: 1 } } };
    },
  } };
  return { services, calls };
}

test('registration endpoint rejects unsupported methods before initializing privileged services', async () => {
  const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; } };
  await registrationHandler({ method: 'DELETE' }, res);
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, 'GET, POST');
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('registration configuration requires canonical HTTPS origin and server credentials', () => {
  const env = { APP_ORIGIN: origin, SUPABASE_URL: 'https://league.example.test', SUPABASE_SERVICE_ROLE_KEY: 'fixture-only' };
  for (const APP_ORIGIN of ['http://league.example.test', `${origin}/`, 'https://user:password@www.lakesleague.com', 'javascript:alert(1)']) {
    assert.throws(() => registrationServices({ ...env, APP_ORIGIN }), RegistrationError);
  }
  assert.throws(() => registrationServices({ ...env, SUPABASE_SERVICE_ROLE_KEY: '' }), RegistrationError);
});

test('registration reads and writes require a server-verified email identity', async () => {
  for (const options of [{ identity: null }, { identity: { ...user, email_confirmed_at: null } }, { authError: { message: 'invalid token' } }]) {
    const { services, calls } = fixture(options);
    await assert.rejects(() => handleRegistrationRequest(request(), services), error => registrationFailure(error).status === 401);
    assert.deepEqual(calls, []);
  }
  const { services, calls } = fixture();
  await assert.rejects(() => handleRegistrationRequest(request(undefined, { headers: {} }), services), error => registrationFailure(error).status === 401);
  assert.deepEqual(calls, []);
  const result = await handleRegistrationRequest(request(undefined, { method: 'GET' }), services);
  assert.deepEqual(result, { notifications: { queued: 1 } });
  assert.deepEqual(calls, [{ name: 'league_registration_state', args: { p_user: user.id } }]);
});

test('registration mutations require exact request origin before any application write', async () => {
  for (const suppliedOrigin of [undefined, 'https://www.lakesleague.com.evil.example', 'https://preview.example.test', `${origin}/`]) {
    const { services, calls } = fixture();
    await assert.rejects(() => handleRegistrationRequest(request(undefined, { headers: { authorization: 'Bearer fixture-token', origin: suppliedOrigin } }), services), error => error instanceof RegistrationError && error.status === 403);
    assert.deepEqual(calls, []);
  }
});

test('submission rejects browser identity, approval, and price overrides without an RPC write', async () => {
  for (const override of ['email', 'user_id', 'player_id', 'fee_cents', 'amount_cents', 'is_admin', 'status', 'decision', 'recipient']) {
    const { services, calls } = fixture();
    await assert.rejects(() => handleRegistrationRequest(request({ action: 'submit', ...fields, [override]: 'forged' }), services), /overrides/);
    assert.deepEqual(calls, []);
  }
  const { services, calls } = fixture();
  const result = await handleRegistrationRequest(request(JSON.stringify({ action: 'submit', ...fields })), services);
  assert.deepEqual(calls[0], { name: 'league_submit_registration', args: { p_user: user.id, p_data: fields } });
  assert.equal(result.application.id, applicationId);
  assert.deepEqual(result.notifications, { queued: 1 });
});

test('malformed, oversized, and unknown registration actions fail without a write', async () => {
  for (const body of ['{', null, [], '"string"', { action: 'submit', first_name: 'x'.repeat(8192) }, { action: 'charge' }]) {
    const { services, calls } = fixture();
    await assert.rejects(() => handleRegistrationRequest(request(body), services), RegistrationError);
    assert.deepEqual(calls, []);
  }
});

test('approval uses the verified actor and a bounded decision; database authority remains required', async () => {
  for (const body of [
    { action: 'decide', application_id: applicationId, decision: 'paid' },
    { action: 'decide', application_id: 'not-a-uuid', decision: 'approved' },
    { action: 'decide', application_id: applicationId, decision: 'approved', user_id: 'admin' },
  ]) {
    const { services, calls } = fixture();
    await assert.rejects(() => handleRegistrationRequest(request(body), services), RegistrationError);
    assert.deepEqual(calls, []);
  }
  const { services, calls } = fixture({ rpc: async () => ({ error: { code: '42501', message: 'private SQL detail' } }) });
  await assert.rejects(() => handleRegistrationRequest(request({ action: 'decide', application_id: applicationId, decision: 'approved' }), services), error => error.status === 403 && !error.message.includes('private'));
  assert.deepEqual(calls[0], { name: 'league_decide_registration', args: { p_user: user.id, p_application: applicationId, p_decision: 'approved' } });
});

test('notification retry requires trusted commissioner state and cannot select another recipient', async () => {
  const { services, calls } = fixture({ rpc: async () => ({ data: { is_admin: false, applications: [] } }) });
  await assert.rejects(() => handleRegistrationRequest(request({ action: 'retry_notifications', application_id: applicationId }), services), error => error.status === 403);
  assert.deepEqual(calls, [{ name: 'league_registration_state', args: { p_user: user.id } }]);
  const forbidden = fixture();
  await assert.rejects(() => handleRegistrationRequest(request({ action: 'retry_notifications', application_id: applicationId, recipient: 'other@example.test' }), forbidden.services), /Invalid application/);
  assert.deepEqual(forbidden.calls, []);
});

test('registration errors expose bounded messages without SQL, SMTP, or token details', async () => {
  for (const code of ['42501', '22023', 'XX000']) {
    await assert.rejects(() => registrationRpc({ rpc: async () => ({ error: { code, message: 'secret SQL and SMTP fixture-token' } }) }, 'fixture', {}), error => {
      const result = registrationFailure(error);
      assert.equal(result.status, ({ '42501': 403, '22023': 409 })[code] || 503);
      assert.doesNotMatch(JSON.stringify(result), /secret|SQL|SMTP|fixture-token/);
      return true;
    });
  }
  assert.deepEqual(registrationFailure(new Error('private SMTP password')), { status: 503, body: { error: 'Registration is temporarily unavailable. Please try again.' } });
});

test('notification headers and approval links are fixed; form content cannot change recipients, sender, or fees', () => {
  const message = notificationMessage({ ...notification, first_name: 'Taylor\r\nBcc: attacker@example.test', fee_cents: 1 }, origin, mail.user);
  assert.deepEqual(message.from, { name: 'Lakes League', address: mail.user });
  assert.equal(message.to, user.email);
  assert.equal(message.subject, 'You’re in — Lakes League application approved');
  assert.equal(message.messageId, '<lakes-registration-notification-1@www.lakesleague.com>');
  assert.equal(message.cc, undefined);
  assert.equal(message.bcc, undefined);
  assert.equal(message.html, undefined);
  assert.equal(message.attachments, undefined);
  assert.equal(message.disableFileAccess, true);
  assert.equal(message.disableUrlAccess, true);
  assert.match(message.text, /\$180 for the 2027 season/);
  assert.match(message.text, /https:\/\/www\.lakesleague\.com\/registration\/payment/);
  assert.match(message.text, /does not itself charge/);
  assert.match(notificationMessage({ ...notification, membership_type: 'substitute' }, origin, mail.user).text, /do not pay a registration fee/);
  const pending = notificationMessage({ ...notification, kind: 'new_application' }, 'https://review.example.test', mail.user);
  assert.equal(pending.subject, '[Preview] New Lakes League application');
  assert.match(pending.text, /https:\/\/review\.example\.test\/admin/);
  assert.match(pending.text, /does not approve membership/);
  assert.throws(() => notificationMessage(notification, 'http://league.example.test', mail.user), RegistrationError);
  assert.throws(() => notificationMessage({ ...notification, kind: 'send_arbitrary' }, origin, mail.user), RegistrationError);
});

test('unconfigured SMTP leaves durable notifications queued instead of claiming delivery', async () => {
  for (const smtp of [{}, { ...mail, port: 25 }, { ...mail, password: '' }]) {
    const { services, calls } = fixture({ smtp });
    await dispatchRegistrationNotifications(services, user, applicationId, () => assert.fail('SMTP must remain unused'));
    assert.deepEqual(calls, []);
  }
});

test('SMTP dispatch uses TLS, fixed credentials and exact delivery lease acknowledgement', async () => {
  const { services, calls } = fixture({ smtp: mail, rpc: async name => ({ data: name === 'league_claim_registration_notifications' ? [notification] : null }) });
  let closed = false;
  await dispatchRegistrationNotifications(services, user, applicationId, options => {
    assert.equal(options.secure, true);
    assert.equal(options.requireTLS, true);
    assert.equal(options.tls.minVersion, 'TLSv1.2');
    assert.deepEqual(options.auth, { user: mail.user, pass: mail.password });
    assert.equal(options.logger, false);
    assert.equal(options.debug, false);
    assert.equal(options.disableFileAccess, true);
    assert.equal(options.disableUrlAccess, true);
    return { sendMail: async message => { assert.equal(message.to, user.email); return { accepted: [user.email] }; }, close() { closed = true; } };
  });
  assert.equal(closed, true);
  assert.deepEqual(calls, [
    { name: 'league_claim_registration_notifications', args: { p_user: user.id, p_application: applicationId } },
    { name: 'league_finish_registration_notification', args: { p_id: notification.id, p_lease: notification.lease, p_status: 'sent' } },
  ]);
});

test('SMTP failures distinguish retryable rejection from uncertain acceptance', async () => {
  for (const [result, expected] of [[{ accepted: [] }, 'failed'], ['AUTH', 'failed'], ['RCPT TO', 'failed'], ['DATA', 'unknown'], [null, 'unknown']]) {
    const { services, calls } = fixture({ smtp: { ...mail, port: 587 }, rpc: async name => ({ data: name === 'league_claim_registration_notifications' ? [notification] : null }) });
    await dispatchRegistrationNotifications(services, user, applicationId, options => {
      assert.equal(options.secure, false);
      assert.equal(options.requireTLS, true);
      return { sendMail: async () => { if (result && typeof result === 'object') return result; const error = new Error('private provider response'); error.command = result; throw error; }, close() {} };
    });
    assert.equal(calls.at(-1).args.p_status, expected);
  }
});

test('SMTP acknowledgement failure never resends in the same dispatch and closes the transport', async () => {
  let sent = 0; let closed = false;
  const { services } = fixture({ smtp: mail, rpc: async name => name === 'league_claim_registration_notifications' ? { data: [notification] } : { error: { code: 'XX000', message: 'private acknowledgement failure' } } });
  await assert.rejects(() => dispatchRegistrationNotifications(services, user, applicationId, () => ({ sendMail: async () => { sent += 1; return { accepted: [user.email] }; }, close() { closed = true; } })), RegistrationError);
  assert.equal(sent, 1);
  assert.equal(closed, true);
});

test('outbox claim failure does not undo a saved application or decision', async () => {
  for (const action of ['submit', 'decide']) {
    let saved = false;
    const { services, calls } = fixture({ smtp: mail, rpc: async name => {
      if (['league_submit_registration', 'league_decide_registration'].includes(name)) { saved = true; return { data: { application: { ...application, status: action === 'decide' ? 'approved' : 'pending' } } }; }
      if (name === 'league_claim_registration_notifications') { assert.equal(saved, true); throw new Error('private outbox failure'); }
      return { data: { notifications: { queued: 1 } } };
    } });
    const body = action === 'submit' ? { action, ...fields } : { action, application_id: applicationId, decision: 'approved' };
    const result = await handleRegistrationRequest(request(body), services);
    assert.equal(saved, true);
    assert.equal(result.application.id, applicationId);
    assert.equal(result.application.status, action === 'decide' ? 'approved' : 'pending');
    assert.deepEqual(result.notifications, { queued: 1 });
    assert.equal(calls.at(-1).name, 'league_registration_state');
  }
});

test('mocked SMTP transport failure retains the committed application and decision', async t => {
  let failure = 'create'; let closed = 0;
  t.mock.method(nodemailer, 'createTransport', () => {
    if (failure === 'create') throw new Error('private SMTP setup failure');
    return { sendMail: async () => { const error = new Error('private SMTP uncertain delivery'); error.command = 'DATA'; throw error; }, close() { closed += 1; } };
  });
  for (const action of ['submit', 'decide']) {
    const { services, calls } = fixture({ smtp: mail, rpc: async name => {
      if (['league_submit_registration', 'league_decide_registration'].includes(name)) return { data: { application: { ...application, status: action === 'decide' ? 'approved' : 'pending' } } };
      if (name === 'league_claim_registration_notifications') return { data: [notification] };
      return { data: name === 'league_registration_state' ? { notifications: failure === 'create' ? { queued: 1 } : { unknown: 1 } } : null };
    } });
    const body = action === 'submit' ? { action, ...fields } : { action, application_id: applicationId, decision: 'approved' };
    const result = await handleRegistrationRequest(request(body), services);
    assert.equal(result.application.id, applicationId);
    assert.equal(result.application.status, action === 'decide' ? 'approved' : 'pending');
    if (failure === 'create') {
      assert.deepEqual(result.notifications, { queued: 1 });
      assert.equal(calls.some(call => call.name === 'league_finish_registration_notification'), false);
    } else {
      assert.deepEqual(result.notifications, { unknown: 1 });
      assert.equal(calls.find(call => call.name === 'league_finish_registration_notification').args.p_status, 'unknown');
    }
    assert.equal(calls.at(-1).name, 'league_registration_state');
    failure = 'send';
  }
  assert.equal(closed, 1);
});
