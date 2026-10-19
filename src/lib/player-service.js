// Self-service only accepts the current server-authenticated identity. Never accept
// a player ID from a URL or a client selector as proof of ownership.
export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  return email;
}

export function normalizeAttendanceStatus(status) {
  if (!['in', 'out'].includes(status)) throw new Error('Choose playing or unavailable.');
  return status;
}

export function attendanceIsOpen(round, now = new Date()) {
  if (!round || !['draft', 'published'].includes(round.status)) return false;
  const cutoff = new Date(round.attendance_deadline);
  return Number.isFinite(cutoff.getTime()) && now.getTime() < cutoff.getTime();
}

export function indexByWeek(rows = []) {
  return Object.fromEntries(rows.map(row => [String(row.week_id), row]));
}

function requireClient(client) {
  if (!client) throw new Error('Player accounts are not configured yet. Please contact the commissioner.');
  return client;
}

export function readableServiceError(error) {
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code)) {
    return 'Player accounts are awaiting database setup. Please contact the commissioner.';
  }
  return error?.message || 'We could not save that change. Please try again.';
}

function unwrap(result) {
  if (result.error) throw new Error(readableServiceError(result.error));
  return result.data;
}

export const MIN_PASSWORD_LENGTH = 12;

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Choose a password with at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  // Preserve intentional whitespace; never silently change a user's password.
  if (!password.trim()) throw new Error('Choose a password that is not only spaces.');
  return password;
}

export function authCallbackUrl(origin, { passwordSetup = false } = {}) {
  const base = new URL(origin);
  if (!['https:', 'http:'].includes(base.protocol)) throw new Error('Sign-in requires a valid website address.');
  const callback = new URL('/auth/callback', base.origin);
  if (passwordSetup) callback.searchParams.set('next', '/account/password');
  return callback.toString();
}

export async function sendSignInLink(client, email, origin) {
  return unwrap(await requireClient(client).auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true, emailRedirectTo: authCallbackUrl(origin) },
  }));
}

export async function sendPasswordSetupLink(client, email, origin) {
  // An existing roster entry is not necessarily an Auth account yet. Verified
  // first-time setup may create that identity; the database still owns linking.
  return unwrap(await requireClient(client).auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true, emailRedirectTo: authCallbackUrl(origin, { passwordSetup: true }) },
  }));
}

export async function startGoogleSignIn(client, origin) {
  return unwrap(await requireClient(client).auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: authCallbackUrl(origin), queryParams: { prompt: 'select_account' } },
  }));
}

export async function signInWithEmailPassword(client, email, password) {
  if (typeof password !== 'string' || !password.length) throw new Error('Enter your password.');
  return unwrap(await requireClient(client).auth.signInWithPassword({ email: normalizeEmail(email), password }));
}

export async function signUpWithEmailPassword(client, email, password, origin) {
  return unwrap(await requireClient(client).auth.signUp({
    email: normalizeEmail(email), password: validateNewPassword(password),
    options: { emailRedirectTo: authCallbackUrl(origin) },
  }));
}

export async function sendPasswordReset(client, email, origin) {
  return unwrap(await requireClient(client).auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: authCallbackUrl(origin, { passwordSetup: true }),
  }));
}

export async function changeAccountPassword(client, password) {
  const api = requireClient(client);
  const validPassword = validateNewPassword(password);
  const { data, error } = await api.auth.getUser();
  if (error || !data?.user || !data.user.email_confirmed_at) {
    throw new Error('Open your email verification or recovery link before choosing a password.');
  }
  return unwrap(await api.auth.updateUser({ password: validPassword }));
}

export async function loadPlayerAccount(client, { onVerifiedUser } = {}) {
  const api = requireClient(client);
  const { data, error } = await api.auth.getUser();
  if (error?.name === 'AuthSessionMissingError') return null;
  if (error) throw new Error(readableServiceError(error));
  if (!data.user) return null;
  onVerifiedUser?.(data.user);
  const account = { user: data.user, profile: null, profileError: null, rounds: {}, attendance: {}, availability: [] };
  try {
    const profile = unwrap(await api.rpc('claim_league_player'));
    const [roundResult, attendanceResult, preferenceResult] = await Promise.all([
      api.from('league_rounds').select('*'),
      api.from('league_attendance').select('*').eq('user_id', data.user.id),
      api.from('league_player_preferences').select('availability').eq('user_id', data.user.id).maybeSingle(),
    ]);
    return {
      ...account, profile,
      rounds: indexByWeek(unwrap(roundResult) || []),
      attendance: indexByWeek(unwrap(attendanceResult) || []),
      availability: unwrap(preferenceResult)?.availability ?? profile?.availability ?? [],
    };
  } catch (cause) {
    // Authentication succeeded. Missing migrations or roster permission errors
    // must not log the person out or discard a valid recovery session.
    return { ...account, profileError: readableServiceError(cause) };
  }
}

export async function setPlayerAttendance(client, weekId, status) {
  if (!String(weekId ?? '').trim()) throw new Error('Choose a round.');
  return unwrap(await requireClient(client).rpc('set_league_attendance', {
    p_week_id: String(weekId), p_status: normalizeAttendanceStatus(status),
  }));
}

export async function setPlayerAvailability(client, times) {
  if (!Array.isArray(times)) throw new Error('Choose your available tee times.');
  const availability = [...new Set(times)];
  return unwrap(await requireClient(client).rpc('set_league_availability', { p_availability: availability }));
}

export async function submitPlayerScore(client, { weekId, grossScore, birdieHoles = [], eagleHoles = [] }) {
  if (!Number.isInteger(Number(grossScore)) || Number(grossScore) < 9 || Number(grossScore) > 180) {
    throw new Error('Enter a whole-number score between 9 and 180.');
  }
  return unwrap(await requireClient(client).rpc('submit_league_score', {
    p_week_id: String(weekId), p_gross_score: Number(grossScore),
    p_birdie_holes: birdieHoles, p_eagle_holes: eagleHoles,
  }));
}

export async function publishLeagueRound(client, { weekId, teeSheet, participants, ruleSnapshot }) {
  return unwrap(await requireClient(client).rpc('publish_league_round', {
    p_week_id: String(weekId), p_tee_sheet: teeSheet,
    p_participants: participants, p_rule_snapshot: ruleSnapshot,
  }));
}

export async function createLeagueRound(client, { date, attendanceDeadline, ruleSnapshot }) {
  return unwrap(await requireClient(client).rpc('create_league_round', {
    p_date: date, p_attendance_deadline: attendanceDeadline, p_rule_snapshot: ruleSnapshot,
  }));
}

export async function cancelLeagueRound(client, weekId) {
  return unwrap(await requireClient(client).rpc('cancel_league_round', { p_week_id: String(weekId) }));
}
