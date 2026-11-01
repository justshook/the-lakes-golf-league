import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigured, isDemoMode } from '../supabaseClient';
import { demoPlayers, demoWeeks } from '../demo/league';
import {
  attendanceIsOpen, loadPlayerAccount, readableServiceError, sendSignInLink,
  setPlayerAttendance, setPlayerAvailability, sendPasswordSetupLink, startGoogleSignIn,
  signInWithEmailPassword, signUpWithEmailPassword, sendPasswordReset,
  changeAccountPassword, validateNewPassword,
} from '../lib/player-service';

const PlayerSessionContext = createContext(null);
const emptyAccount = { user: null, profile: null, profileError: null, rounds: {}, attendance: {}, availability: [] };
const pendingPasswordKey = 'lakes:auth:pending-password-user';

function readPendingPasswordUser() {
  try {
    const value = window.sessionStorage.getItem(pendingPasswordKey);
    return typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null;
  } catch { return null; }
}

function persistPendingPasswordUser(userId) {
  try {
    if (userId) window.sessionStorage.setItem(pendingPasswordKey, userId);
    else window.sessionStorage.removeItem(pendingPasswordKey);
  } catch {
    // Private-mode/storage restrictions must not break login or password setup.
    // In-memory state still keeps the current page in the setup flow.
  }
}

function demoAccount() {
  const player = demoPlayers.find(p => String(p.id) === '9001');
  return {
    user: { id: 'demo-player-9001', email: 'alex@example.test', email_confirmed_at: '2026-01-01T00:00:00Z' },
    profile: { ...player, player_id: 9001, is_admin: true },
    profileError: null,
    rounds: Object.fromEntries(demoWeeks.map(week => [String(week.id), {
      week_id: String(week.id), date: week.date,
      attendance_deadline: week.attendanceDeadline || week.attendance_deadline || `${week.date}T12:00:00-05:00`,
      status: week.status || 'published',
    }])),
    attendance: {}, availability: player?.availability || [],
  };
}

export function PlayerSessionProvider({ children }) {
  const [account, setAccount] = useState(() => isDemoMode ? demoAccount() : emptyAccount);
  const [loading, setLoading] = useState(!isDemoMode && supabaseConfigured);
  const [authLoading, setAuthLoading] = useState(!isDemoMode && supabaseConfigured);
  const [error, setError] = useState(null);
  // This is a nonsecret navigation reminder, not an authorization claim. It is
  // honored only after getUser verifies the same identity on this page load.
  const [passwordRecoveryUserId, setPasswordRecoveryUserId] = useState(readPendingPasswordUser);
  const pendingPasswordUser = useRef(passwordRecoveryUserId);
  const generation = useRef(0);
  const googleEnabled = isDemoMode || import.meta.env.VITE_GOOGLE_AUTH_ENABLED === 'true';

  const setPendingPasswordUser = useCallback(userId => {
    pendingPasswordUser.current = userId;
    setPasswordRecoveryUserId(userId);
    persistPendingPasswordUser(userId);
  }, []);
  const beginPasswordRecovery = useCallback(userId => {
    if (typeof userId !== 'string' || !userId || userId.length > 200) {
      throw new Error('Verify your account before starting password setup.');
    }
    setPendingPasswordUser(userId);
  }, [setPendingPasswordUser]);
  const completePasswordRecovery = useCallback(() => setPendingPasswordUser(null), [setPendingPasswordUser]);

  const refreshProfile = useCallback(async () => {
    if (isDemoMode || !supabase) return;
    const request = ++generation.current;
    setLoading(true);
    setAuthLoading(true);
    setError(null);
    try {
      const next = await loadPlayerAccount(supabase, { onVerifiedUser: user => {
        if (request === generation.current) {
          // A different signed-in person must never inherit another player's
          // unfinished setup requirement from this browser tab.
          if (pendingPasswordUser.current && pendingPasswordUser.current !== user.id) {
            completePasswordRecovery();
          }
          setAccount({ ...emptyAccount, user });
          setAuthLoading(false);
        }
      } });
      if (request === generation.current) setAccount(next || emptyAccount);
      return next;
    } catch (cause) {
      if (request === generation.current) {
        // Auth verification itself failed. Roster failures instead return a
        // signed-in account with profileError from loadPlayerAccount above.
        setAccount(emptyAccount);
        setError(readableServiceError(cause));
      }
    } finally {
      if (request === generation.current) { setLoading(false); setAuthLoading(false); }
    }
  }, [completePasswordRecovery]);

  useEffect(() => {
    if (isDemoMode || !supabase) return;
    let timer;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        generation.current += 1;
        setAccount(emptyAccount);
        setLoading(false);
        setAuthLoading(false);
        // INITIAL_SESSION may be empty while a callback establishes a session.
        // Only an actual sign-out discards a persisted setup reminder here.
        if (event === 'SIGNED_OUT') completePasswordRecovery();
        return;
      }
      if (event === 'PASSWORD_RECOVERY' && session.user?.id) beginPasswordRecovery(session.user.id);
      // Auth callbacks must return before calling other Supabase auth operations.
      clearTimeout(timer);
      timer = setTimeout(refreshProfile, 0);
    });
    refreshProfile();
    return () => { clearTimeout(timer); generation.current += 1; subscription.unsubscribe(); };
  }, [refreshProfile, beginPasswordRecovery, completePasswordRecovery]);

  const signIn = async email => {
    setError(null);
    if (isDemoMode) { setAccount(demoAccount()); return; }
    await sendSignInLink(supabase, email, window.location.origin);
  };

  const signInWithGoogle = async () => {
    setError(null);
    if (isDemoMode) { const next = demoAccount(); setAccount(next); return { user: next.user, session: { user: next.user } }; }
    if (!googleEnabled) throw new Error('Google sign-in is being set up. Use your email to sign in.');
    return startGoogleSignIn(supabase, window.location.origin);
  };

  const signInWithPassword = async (email, password) => {
    setError(null);
    if (isDemoMode) { const next = demoAccount(); setAccount(next); return { user: next.user, session: { user: next.user } }; }
    const result = await signInWithEmailPassword(supabase, email, password);
    if (result?.session) await refreshProfile();
    return result;
  };

  const signUpWithPassword = async (email, password) => {
    setError(null);
    validateNewPassword(password);
    if (isDemoMode) { const next = demoAccount(); setAccount(next); return { user: next.user, session: { user: next.user } }; }
    const result = await signUpWithEmailPassword(supabase, email, password, window.location.origin);
    // An unconfirmed signup's returned user is not an authenticated account.
    if (result?.session) await refreshProfile();
    return result;
  };

  const requestPasswordReset = async email => {
    setError(null);
    if (isDemoMode) return { demo: true };
    return sendPasswordReset(supabase, email, window.location.origin);
  };

  const requestPasswordSetup = async email => {
    setError(null);
    if (isDemoMode) return { demo: true };
    return sendPasswordSetupLink(supabase, email, window.location.origin);
  };

  const updatePassword = async password => {
    validateNewPassword(password);
    if (!account.user) throw new Error('Open your email verification or recovery link before choosing a password.');
    const result = isDemoMode ? { user: account.user, demo: true } : await changeAccountPassword(supabase, password);
    completePasswordRecovery();
    if (!isDemoMode) await refreshProfile();
    return result;
  };

  const signOut = async () => {
    if (!isDemoMode && supabase) {
      const result = await supabase.auth.signOut();
      if (result.error) throw new Error(readableServiceError(result.error));
    }
    generation.current += 1;
    setAccount(emptyAccount);
    setError(null);
    completePasswordRecovery();
  };

  const updateAttendance = async (weekId, status) => {
    if (!account.user || !account.profile?.player_id) throw new Error('Sign in with your league email first.');
    let saved;
    if (isDemoMode) {
      if (!['in', 'out'].includes(status)) throw new Error('Choose playing or unavailable.');
      if (!attendanceIsOpen(account.rounds[String(weekId)])) throw new Error('Attendance is locked. Contact the commissioner.');
      saved = { week_id: String(weekId), player_id: 9001, user_id: account.user.id, status, updated_at: new Date().toISOString() };
    } else saved = await setPlayerAttendance(supabase, weekId, status);
    setAccount(current => current.user?.id === account.user.id
      ? { ...current, attendance: { ...current.attendance, [String(weekId)]: saved } } : current);
    return saved;
  };

  const saveAvailability = async times => {
    if (!account.user || !account.profile?.player_id) throw new Error('Sign in with your league email first.');
    const saved = isDemoMode ? [...new Set(times)] : await setPlayerAvailability(supabase, times);
    setAccount(current => current.user?.id === account.user.id ? { ...current, availability: saved } : current);
    return saved;
  };

  const updateDemoRound = round => {
    if (!isDemoMode) throw new Error('Demo changes are unavailable on the live league.');
    const id = String(round.week_id ?? round.id);
    setAccount(current => ({ ...current, rounds: {
      ...current.rounds, [id]: { ...current.rounds[id], ...round,
        week_id: id, attendance_deadline: round.attendance_deadline || round.attendanceDeadline || current.rounds[id]?.attendance_deadline,
      },
    } }));
  };

  const playerId = account.profile?.player_id ?? null;
  const passwordRecovery = Boolean(account.user?.id && passwordRecoveryUserId === account.user.id);
  return <PlayerSessionContext.Provider value={{
    ...account, playerId, linkedPlayerId: playerId,
    isAdmin: account.profile?.is_admin === true,
    loading, authLoading, authError: error, error: error || account.profileError,
    configured: isDemoMode || supabaseConfigured, isDemo: isDemoMode, googleEnabled,
    passwordRecovery, setupRequired: passwordRecovery, beginPasswordRecovery, completePasswordRecovery,
    signIn, signInWithGoogle, signInWithPassword, signUpWithPassword, signUp: signUpWithPassword,
    requestPasswordReset, requestPasswordSetup, updatePassword,
    signOut, refreshProfile, updateAttendance, updateDemoRound,
    saveAttendance: ({ weekId, status }) => updateAttendance(weekId, status), saveAvailability,
  }}>{children}</PlayerSessionContext.Provider>;
}

export function usePlayerSession() {
  const value = useContext(PlayerSessionContext);
  if (!value) throw new Error('usePlayerSession must be used within PlayerSessionProvider');
  return value;
}
