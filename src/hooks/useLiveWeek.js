import { useCallback, useEffect, useRef, useState } from 'react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { supabase, isDemoMode } from '../supabaseClient';
import { loadLiveWeek, changeScorecard } from '../services/live-scoring-service';
import { calc9HoleHandicap, calcTeamHandicap, courseHoles } from '../constants';
import { entryKey } from '../lib/live-scoring';
import { getTeamsForWeek } from '../lib/teams';

const empty = { cards: [], participants: [], scores: [] };
const demoKey = 'lakes-live-scorecards-v1';
function demoCards() { try { return JSON.parse(sessionStorage.getItem(demoKey) || '[]'); } catch { return []; } }

export function useLiveWeek(weekId) {
  const { weeks, weeklyGames, players, playerScores, refreshData } = useLeague();
  const { playerId, user } = usePlayerSession();
  const [state, setState] = useState({ ...empty, loading: true, error: '', updatedAt: null });
  const request = useRef(0), busy = useRef(false);
  const demoSnapshot = useCallback(() => {
    const week = weeks.find(w => String(w.id) === String(weekId));
    const game = weeklyGames.find(g => String(g.weekId) === String(weekId));
    const teams = getTeamsForWeek({ weekId, teeSheet: week?.teeSheet || [], game });
    const participants = (week?.teeSheet || []).flatMap(slot => slot.players.map(id => {
      const team = teams.find(t => t.memberIds.includes(id));
      const handicaps = (team?.memberIds || [id]).map(pid => calc9HoleHandicap(players.find(p => p.id === pid)?.handicap));
      return { week_id: String(weekId), player_id: id, team_id: team?.teamId || null, handicap_used: team ? calcTeamHandicap(handicaps, 'scramble') : handicaps[0] };
    }));
    const cards = demoCards().filter(c => c.week_id === String(weekId));
    const submitted = cards.filter(c => c.submitted_at).flatMap(card => card.member_ids.map(id => ({ player_id: id, week_id: card.week_id, gross_score: card.gross_scores.reduce((a, b) => a + b, 0), net_score: card.gross_scores.reduce((a, b) => a + b, 0) - card.handicap_used, handicap_used: card.handicap_used, is_team_score: Boolean(card.team_id) })));
    return { cards, participants, scores: [...playerScores.filter(s => String(s.week_id) === String(weekId)), ...submitted] };
  }, [weekId, weeks, weeklyGames, players, playerScores]);
  const refresh = useCallback(async () => {
    if (weekId == null || !user) { setState({ ...empty, loading: false, error: '', updatedAt: null }); return; }
    if (busy.current) return;
    const version = ++request.current;
    try {
      const next = isDemoMode ? demoSnapshot() : await loadLiveWeek(supabase, weekId);
      if (version !== request.current) return false;
      setState({ ...next, loading: false, error: '', updatedAt: new Date() });
      return true;
    } catch (error) {
      if (version === request.current) setState(current => ({ ...current, loading: false, error: error.message }));
      return false;
    }
  }, [weekId, user?.id, demoSnapshot]);
  useEffect(() => {
    setState({ ...empty, loading: true, error: '', updatedAt: null });
    refresh();
    const wake = () => { if (document.visibilityState !== 'hidden') refresh(); };
    const timer = setInterval(wake, 10000);
    window.addEventListener('focus', wake); window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);
    return () => { request.current++; clearInterval(timer); window.removeEventListener('focus', wake); window.removeEventListener('online', wake); document.removeEventListener('visibilitychange', wake); };
  }, [refresh]);

  const mutate = async input => {
    if (busy.current) throw new Error('Please wait for the current save.');
    busy.current = true; request.current++;
    const actorRequest = request.current;
    try {
      let card;
      if (isDemoMode) {
        const snapshot = demoSnapshot();
        const participant = snapshot.participants.find(p => String(p.player_id) === String(playerId));
        if (!participant) throw new Error('You are not assigned to this round.');
        const key = entryKey(participant), all = demoCards();
        card = all.find(c => c.week_id === String(weekId) && c.entry_key === key);
        if (input.action === 'start' && !card) {
          card = { week_id: String(weekId), entry_key: key, team_id: participant.team_id, member_ids: snapshot.participants.filter(p => entryKey(p) === key).map(p => p.player_id), handicap_used: participant.handicap_used, holes: courseHoles.slice(0, 9), gross_scores: Array(9).fill(null), revision: 0, submitted_at: null };
          all.push(card);
        } else if (input.action !== 'start') {
          if (!card || card.submitted_at) throw new Error('This scorecard is locked.');
          if (input.revision !== card.revision) throw new Error('This card changed. Reload it before trying again.');
          if (input.action === 'save') card.gross_scores[input.hole - 1] = input.gross;
          if (input.action === 'submit') {
            if (card.gross_scores.some(s => s == null)) throw new Error('Complete all nine holes.');
            card.submitted_at = new Date().toISOString();
          }
          card.revision++;
        }
        sessionStorage.setItem(demoKey, JSON.stringify(all));
      } else card = await changeScorecard(supabase, { ...input, weekId });
      if (request.current === actorRequest) setState(current => ({ ...current, cards: [...current.cards.filter(c => c.entry_key !== card.entry_key), card], error: '', updatedAt: new Date() }));
      if (input.action === 'submit' && !isDemoMode) void refreshData();
      return card;
    } finally { busy.current = false; }
  };
  return { ...state, refresh, mutate };
}
