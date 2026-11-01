// Controlled-response browser regression. No real accounts, emails, approvals,
// payments, or external provider settings are created or changed.
// PLAYWRIGHT_MODULE and CHROMIUM_BIN may point to externally installed tooling.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const origin = 'http://127.0.0.1:5191';
const api = 'https://registration-test.supabase.co';
const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const baseApplication = {
  id: '33333333-3333-4333-8333-333333333333', email: 'new.player@example.test',
  first_name: 'Jordan', last_name: 'Fixture', phone: '+1 (312) 555-0100',
  handicap_id: 'GHIN-12345', handicap_index: 12.4, availability: ['3:30 PM', '4:00 PM'],
  membership_type: 'full_time', status: 'pending', player_id: null,
  fee_cents: 18000, notification_status: 'queued',
};

async function fixture(browser, { admin = false, application = null, linked = null } = {}) {
  const state = { application, linked, posts: [], checkoutRequests: 0, ledgerReads: 0, notifications: {} };
  const user = {
    id: admin ? '22222222-2222-4222-8222-222222222222' : '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated', role: 'authenticated', email: admin ? 'commissioner@example.test' : 'new.player@example.test',
    email_confirmed_at: '2026-01-01T00:00:00Z', confirmed_at: '2026-01-01T00:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'], ...(admin ? { league_role: 'admin' } : {}) }, user_metadata: {},
  };
  const accessToken = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email, exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) })}.test-signature`;
  const session = { access_token: accessToken, refresh_token: 'fixture-refresh-token', token_type: 'bearer', expires_in: 3600, user };
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, timezoneId: 'America/Chicago' });
  const page = await context.newPage();
  const errors = [];
  page.setDefaultTimeout(10000);
  page.on('pageerror', error => errors.push(error.message));
  const registrationState = () => ({ application: admin ? null : state.application, is_admin: admin,
    applications: admin && state.application ? [state.application] : [], player_id: state.linked,
    membership_type: state.application?.membership_type || 'full_time', notifications: state.notifications,
    registration_paid: state.application?.membership_type === 'substitute',
  });
  await page.route(origin + '/api/registrations', async route => {
    const req = route.request();
    assert.match(req.headers().authorization || '', /^Bearer /);
    const reply = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (req.method() === 'GET') return reply(registrationState());
    assert.equal(req.method(), 'POST');
    const body = req.postDataJSON(); state.posts.push(body);
    if (body.action === 'submit') {
      assert.equal(admin, false);
      assert.equal(Object.hasOwn(body, 'email'), false);
      assert.equal(Object.hasOwn(body, 'player_id'), false);
      assert.equal(Object.hasOwn(body, 'fee_cents'), false);
      assert.equal(Object.hasOwn(body, 'user_id'), false);
      state.application = { ...baseApplication, ...body, email: user.email,
        fee_cents: body.membership_type === 'substitute' ? 0 : 18000 };
      delete state.application.action;
      return reply({ application: state.application, notifications: { queued: 1, sent: 0, failed: 0, unknown: 0 } });
    }
    assert.equal(admin, true);
    assert.equal(body.application_id, state.application.id);
    if (body.action === 'decide') {
      assert.ok(['approved', 'rejected'].includes(body.decision));
      state.application = { ...state.application, status: body.decision,
        player_id: body.decision === 'approved' ? 41 : null, notification_status: 'queued' };
      state.notifications = { queued: 1, sent: 0, failed: 0, unknown: 0 };
      return reply({ application: state.application, notifications: state.notifications });
    }
    assert.equal(body.action, 'retry_notifications');
    state.application = { ...state.application, notification_status: 'sent' };
    state.notifications = { sent: 1, queued: 0, failed: 0, unknown: 0 };
    return reply({ application: state.application, notifications: state.notifications });
  });
  await page.route(origin + '/api/payments', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ enabled: false, mode: 'test', orders: [], dues_status: 'unpaid' }) }));
  await page.route(origin + '/api/checkout', route => { state.checkoutRequests++; return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Checkout is disabled in this regression"}' }); });
  await page.route(api + '/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const reply = data => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    if (path === '/auth/v1/user') return reply(user);
    if (path === '/auth/v1/token' || path === '/auth/v1/verify') return reply(session);
    if (path === '/auth/v1/logout') return reply({});
    if (path === '/rest/v1/rpc/claim_league_player') return reply({ player_id: state.linked,
      name: state.linked ? 'Jordan Fixture' : null, email: user.email, is_admin: admin, availability: ['3:30 PM', '4:00 PM'] });
    if (path.startsWith('/rest/v1/')) {
      const table = path.split('/').at(-1);
      if (table === 'league_ledger_entries') state.ledgerReads++;
      const rows = { league_public_players: state.linked ? [{ id: state.linked, name: 'Jordan Fixture', handicap: 12.4, availability: ['3:30 PM', '4:00 PM'], type: state.application?.membership_type === 'substitute' ? 'substitute' : 'full-time' }] : [], league_player_preferences: null };
      const data = Object.hasOwn(rows, table) ? rows[table] : [];
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-expose-headers': 'content-range', 'content-range': Array.isArray(data) ? `0-${Math.max(0, data.length - 1)}/${data.length}` : '*/0' }, body: JSON.stringify(data) });
    }
    throw new Error(`Unexpected fixture request: ${req.method()} ${path}`);
  });
  await page.goto(origin + '/auth/callback#access_token=' + accessToken + '&refresh_token=fixture-refresh-token&type=magiclink');
  await page.waitForURL(url => url.pathname !== '/auth/callback');
  return { page, state, errors, close: async () => { assert.deepEqual(errors, []); assert.equal(state.checkoutRequests, 0); await context.close(); } };
}

async function noOverflow(page, label) {
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label} horizontal overflow at ${width}px`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
}

async function submitApplication(page, membership) {
  await page.waitForURL(origin + '/register');
  const email = page.getByLabel('Verified email', { exact: true });
  await email.waitFor();
  assert.equal(await email.inputValue(), 'new.player@example.test');
  assert.equal(await email.getAttribute('readonly'), '');
  assert.equal(await page.getByLabel('Handicap ID (GHIN or CDGA)', { exact: true }).count(), 1);
  await noOverflow(page, 'new-player registration');
  await page.getByLabel('First name', { exact: true }).fill('Jordan');
  await page.getByLabel('Last name', { exact: true }).fill('Fixture');
  await page.getByLabel('Phone number', { exact: true }).fill('+1 (312) 555-0100');
  await page.getByLabel('Handicap ID (GHIN or CDGA)', { exact: true }).fill('GHIN-12345');
  await page.getByLabel('Handicap index', { exact: true }).fill('12.4');
  await page.getByRole('radio', { name: membership === 'substitute' ? /Substitute/ : /Full-time/ }).check();
  await page.getByRole('checkbox', { name: '3:30 PM', exact: true }).check();
  await page.getByRole('checkbox', { name: '4:00 PM', exact: true }).check();
  await page.getByRole('button', { name: 'Send registration for review', exact: true }).click();
  await page.getByRole('heading', { name: 'Your registration is with the commissioner.', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Send registration for review', exact: true }).count(), 0);
}

(async () => {
  const server = spawn('node', ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5191', '--strictPort'], {
    env: { ...process.env, VITE_DEMO_MODE: 'false', VITE_SUPABASE_URL: api, VITE_SUPABASE_ANON_KEY: 'fixture-public-key', VITE_GOOGLE_AUTH_ENABLED: 'true' }, stdio: 'ignore',
  });
  let browser;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try { await fetch(origin); ready = true; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.equal(ready, true, 'Local test app did not start');
    assert.ok((await (await fetch(origin + '/src/supabaseClient.js')).text()).includes(api), 'Local test app must use the mocked Supabase origin');
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_BIN || undefined, headless: true,
      args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [] });

    const full = await fixture(browser);
    await submitApplication(full.page, 'full_time');
    assert.equal(full.state.application.fee_cents, 18000);
    await full.page.getByRole('button', { name: 'Refresh registration status', exact: true }).click();
    await full.page.getByRole('heading', { name: 'Your registration is with the commissioner.', exact: true }).waitFor();
    assert.equal(full.state.posts.length, 1, 'Status refresh must not submit a duplicate application');
    full.state.application = { ...full.state.application, status: 'approved', player_id: 41, notification_status: 'sent' }; full.state.linked = 41;
    await full.page.getByRole('button', { name: 'Refresh registration status', exact: true }).click();
    await full.page.getByRole('link', { name: 'Continue to payment', exact: true }).click();
    await full.page.waitForURL(origin + '/registration/payment');
    await full.page.getByRole('heading', { name: '2027 Lakes League Dues', exact: true }).waitFor();
    await noOverflow(full.page, 'approved full-time payment step');
    await full.page.goto(origin + '/'); await full.page.waitForURL(origin + '/registration/payment');
    await full.close(); console.log('OK full-time form, pending deduplication, approval refresh and $180 payment gate (mocked services)');

    const substitute = await fixture(browser);
    await submitApplication(substitute.page, 'substitute');
    assert.equal(substitute.state.application.fee_cents, 0);
    substitute.state.application = { ...substitute.state.application, status: 'approved', player_id: 41, notification_status: 'sent' }; substitute.state.linked = 41;
    await substitute.page.getByRole('button', { name: 'Refresh registration status', exact: true }).click();
    await substitute.page.getByRole('link', { name: 'Continue to My Week', exact: true }).click();
    await substitute.page.waitForURL(origin + '/');
    await substitute.page.getByRole('heading', { name: 'Hey, Jordan.', exact: true }).waitFor();
    await substitute.page.goto(origin + '/registration/payment');
    await substitute.page.getByText('Registration fee: $0. No card or Checkout is needed.', { exact: true }).waitFor();
    assert.equal(await substitute.page.getByRole('heading', { name: '2027 Lakes League Dues', exact: true }).count(), 0);
    await substitute.close(); console.log('OK substitute registration and approval stay free with no Checkout (mocked services)');

    const commissioner = await fixture(browser, { admin: true, linked: 22, application: { ...baseApplication, notification_status: 'failed' } });
    await commissioner.page.goto(origin + '/admin');
    const review = commissioner.page.getByRole('region', { name: 'Registration review', exact: true });
    await review.getByRole('heading', { name: 'Jordan Fixture', exact: true }).waitFor();
    await noOverflow(commissioner.page, 'commissioner registration review');
    await review.getByRole('button', { name: 'Approve', exact: true }).click();
    await commissioner.page.getByRole('dialog').getByRole('button', { name: 'Approve registration', exact: true }).click();
    await commissioner.page.getByRole('dialog').waitFor({ state: 'hidden' });
    await review.getByLabel('Show registrations', { exact: true }).selectOption('all');
    await review.getByRole('listitem').getByText('Approved', { exact: true }).waitFor();
    await review.getByRole('button', { name: 'Retry queued or failed emails', exact: true }).click();
    await review.getByText('Sent', { exact: true }).waitFor();
    assert.deepEqual(commissioner.state.posts.map(item => item.action), ['decide', 'retry_notifications']);
    assert.equal(commissioner.state.posts[0].decision, 'approved');
    assert.ok(commissioner.state.ledgerReads >= 1, 'Commissioner approval refreshes league data');
    commissioner.state.application = { ...commissioner.state.application, notification_status: 'unknown' }; commissioner.state.notifications = { unknown: 1 };
    await review.getByRole('button', { name: 'Refresh', exact: true }).click();
    await review.getByText('Delivery is unconfirmed. Check the email provider before resending.', { exact: true }).waitFor();
    assert.equal(await review.getByRole('button', { name: 'Retry queued or failed emails', exact: true }).count(), 0);
    commissioner.state.application = { ...commissioner.state.application, status: 'pending', player_id: null, notification_status: 'queued' };
    await review.getByRole('button', { name: 'Refresh', exact: true }).click();
    await review.getByRole('button', { name: 'Reject', exact: true }).click();
    await commissioner.page.getByRole('dialog').getByRole('button', { name: 'Reject registration', exact: true }).click();
    await commissioner.page.getByRole('dialog').waitFor({ state: 'hidden' });
    await review.getByLabel('Show registrations', { exact: true }).selectOption('all');
    await review.getByRole('listitem').getByText('Not approved', { exact: true }).waitFor();
    assert.equal(commissioner.state.posts.at(-1).decision, 'rejected');
    await commissioner.close(); console.log('OK commissioner approval/rejection, queued-email retry and unknown-delivery restraint (mocked services)');

    console.log('PASS registration browser regression with controlled API responses. No real Supabase, email, Google, or Stripe processing tested.');
  } finally { if (browser) await browser.close(); server.kill(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
