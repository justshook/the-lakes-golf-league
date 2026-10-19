import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase, supabaseConfigured, isDemoMode } from '../supabaseClient';
import { demoPlayers, demoWeeks } from '../demo/league';
import {
  attendanceIsOpen, loadPlayerAccount, readableServiceError, sendSignInLink,
  setPlayerAttendance, setPlayerAvailability,
} from '../lib/player-service';

const PlayerSessionContext = createContext(null);
const emptyAccount = { user: null, profile: null, rounds: {}, attendance: {}, availability: [] };

function demoAccount() {
  const player = demoPlayers.find(p => String(p.id) === '9001');
  return {
    user: { id: 'demo-player-9001', email: 'alex@example.test' },
    profile: { ...player, player_id: 9001, is_admin: true },
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
  const [error, setError] = useState(null);
  const generation = useRef(0);

  const refreshProfile = useCallback(async () => {
    if (isDemoMode || !supabase) return;
    const request = ++generation.current;
    setLoading(true);
    setError(null);
    try {
      const next = await loadPlayerAccount(supabase);
      if (request === generation.current) setAccount(next || emptyAccount);
    } catch (cause) {
      if (request === generation.current) {
        // Do not retain a previous user's profile or admin privileges after failure.
        setAccount(emptyAccount);
        setError(readableServiceError(cause));
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isDemoMode || !supabase) return;
    let timer;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        generation.current += 1;
        setAccount(emptyAccount);
        setLoading(false);
        return;
      }
      // Auth callbacks must return before calling other Supabase auth operations.
      clearTimeout(timer);
      timer = setTimeout(refreshProfile, 0);
    });
    refreshProfile();
    return () => { clearTimeout(timer); generation.current += 1; subscription.unsubscribe(); };
  }, [refreshProfile]);

  const signIn = async email => {
    setError(null);
    if (isDemoMode) { setAccount(demoAccount()); return; }
    await sendSignInLink(supabase, email, window.location.origin);
  };

  const signOut = async () => {
    if (!isDemoMode && supabase) {
      const result = await supabase.auth.signOut();
      if (result.error) throw new Error(readableServiceError(result.error));
    }
    generation.current += 1;
    setAccount(emptyAccount);
    setError(null);
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
  return <PlayerSessionContext.Provider value={{
    ...account, playerId, linkedPlayerId: playerId,
    isAdmin: account.profile?.is_admin === true,
    loading, error, configured: isDemoMode || supabaseConfigured, isDemo: isDemoMode,
    signIn, signOut, refreshProfile, updateAttendance, updateDemoRound,
    saveAttendance: ({ weekId, status }) => updateAttendance(weekId, status), saveAvailability,
  }}>{children}</PlayerSessionContext.Provider>;
}

export function usePlayerSession() {
  const value = useContext(PlayerSessionContext);
  if (!value) throw new Error('usePlayerSession must be used within PlayerSessionProvider');
  return value;
}
