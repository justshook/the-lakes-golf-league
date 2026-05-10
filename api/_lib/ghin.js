// UNOFFICIAL — wraps the public GHIN handicap-lookup endpoints that power the
// widget on ghin.com/login. No official API key is required, but auth flow and
// response shapes can change without notice — keep this isolated.

const GHIN_LOGIN_URL  = 'https://api.ghin.com/api/v1/golfer_login.json';
const GHIN_SEARCH_URL = 'https://api.ghin.com/api/v1/golfers.json';

// Public widget credentials baked into the ghin.com lookup page JS.
// These authenticate as the anonymous "public lookup" user, the same identity
// used when you search a GHIN# at ghin.com without logging in.
const PUBLIC_USER  = process.env.GHIN_PUBLIC_USER  || 'publicuser@ghin.com';
const PUBLIC_PASS  = process.env.GHIN_PUBLIC_PASS  || 'public';
const PUBLIC_TOKEN = process.env.GHIN_PUBLIC_TOKEN || 'ghincom';

export async function loginGhin() {
  const res = await fetch(GHIN_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: { email_or_ghin: PUBLIC_USER, password: PUBLIC_PASS, remember_me: false },
      token: PUBLIC_TOKEN,
      source: 'GHINcom'
    })
  });
  if (!res.ok) {
    throw new Error(`GHIN login failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  const token = body?.golfer_user?.golfer_user_token || body?.token;
  if (!token) throw new Error('GHIN login response missing token');
  return token;
}

export async function fetchHandicap(token, ghinId) {
  const url = `${GHIN_SEARCH_URL}?per_page=1&page=1&golfer_id=${encodeURIComponent(ghinId)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`GHIN search failed: ${res.status} ${res.statusText}`);
  }
  const body = await res.json();
  const golfer = body?.golfers?.[0];
  if (!golfer) throw new Error('GHIN returned no golfer for that ID');

  const raw = golfer.handicap_index;
  if (raw == null || raw === 'NH' || raw === 'WD') {
    throw new Error(`GHIN handicap unavailable (${raw ?? 'null'})`);
  }
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed)) throw new Error(`GHIN handicap not numeric: ${raw}`);
  return parsed;
}
