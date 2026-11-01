// Only application-owned destinations may be followed after authentication.
const DESTINATIONS = new Set(['/', '/profile', '/schedule', '/results', '/money', '/account/password']);
const EMAIL_TYPES = new Set(['email', 'signup', 'magiclink', 'invite', 'recovery']);
const CALLBACK_KEYS = ['code', 'token_hash', 'access_token', 'refresh_token', 'error', 'error_code', 'error_description'];

export function safeAuthDestination(value) {
  return DESTINATIONS.has(value) ? value : '/';
}

export function hasAuthCallbackParameters(search = '', hash = '') {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  return CALLBACK_KEYS.some(key => query.has(key) || fragment.has(key));
}

export function readAuthCallback(href) {
  const url = new URL(href);
  const query = url.searchParams;
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
  const get = key => fragment.get(key) || query.get(key);
  const type = get('type');
  const next = safeAuthDestination(query.get('next'));
  const needsPasswordSetup = type === 'recovery' || type === 'invite' || next === '/account/password';
  return {
    code: query.get('code'), tokenHash: query.get('token_hash'),
    accessToken: fragment.get('access_token'), refreshToken: fragment.get('refresh_token'),
    providerError: get('error_code') || get('error'), type,
    next: needsPasswordSetup ? '/account/password' : next, needsPasswordSetup,
  };
}

export function callbackErrorMessage(error) {
  const code = String(error?.code || error?.message || '').toLowerCase();
  if (/otp_expired|expired|invalid.*token|already.*used/.test(code)) {
    return 'This sign-in link has expired or was already used. Request a new link and open the latest email.';
  }
  if (/flow_state|code_verifier|pkce/.test(code)) {
    return 'This sign-in started in another browser or its session expired. Start again in this browser, or sign in with your password.';
  }
  if (/access_denied|cancel/.test(code)) return 'Sign-in was cancelled. You can try again below.';
  if (/email_not_confirmed|unverified/.test(code)) return 'Verify your email before continuing. Open the latest confirmation email.';
  if (/missing_link/.test(code)) return 'This link does not contain a sign-in confirmation. Request a new link from the sign-in page.';
  if (/not_configured/.test(code)) return 'Sign-in is awaiting league setup. Please contact the commissioner.';
  // Do not echo token-bearing URLs or arbitrary provider descriptions into the UI.
  return 'We could not complete this sign-in. Request a new link or try signing in with Google or your password.';
}

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function checked(result) { if (result.error) throw result.error; return result.data; }

export async function completeAuthCallback(client, href) {
  if (!client) fail('not_configured');
  const input = readAuthCallback(href);
  if (input.providerError) fail(input.providerError);
  let data;
  if (input.code) {
    data = checked(await client.auth.exchangeCodeForSession(input.code));
  } else if (input.tokenHash) {
    if (!EMAIL_TYPES.has(input.type)) fail('invalid_token_type');
    data = checked(await client.auth.verifyOtp({ token_hash: input.tokenHash, type: input.type }));
  } else if (input.accessToken || input.refreshToken) {
    if (!input.accessToken || !input.refreshToken) fail('invalid_token_pair');
    data = checked(await client.auth.setSession({ access_token: input.accessToken, refresh_token: input.refreshToken }));
  } else {
    data = checked(await client.auth.getSession());
    if (!data?.session) fail('missing_link');
  }
  if (!data?.session) fail('missing_link');
  const { user } = checked(await client.auth.getUser());
  // confirmed_at also covers phone verification. Roster ownership is based on
  // verified email, matching the database claim and password-update checks.
  if (!user?.email_confirmed_at) fail('email_not_confirmed');
  return { user, next: input.next, needsPasswordSetup: input.needsPasswordSetup };
}
