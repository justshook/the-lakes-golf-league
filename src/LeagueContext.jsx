import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase, isDemoMode } from './supabaseClient';
import { usePlayerSession } from './contexts/PlayerSessionContext';
import { demoPlayers, demoWeeks, demoGames, demoScores, demoLedger } from './demo/league';
import { generateWeekSchedule, validateTeeSheet } from './lib/scheduler';
import { recordLedgerEntry as persistLedgerEntry, ledgerEntryFromRow } from './services/ledger-service';
import { normalizeLedgerEntry, reconcileLedger } from './lib/ledger';
import { getPlayerTeam, getTeamsForWeek } from './lib/teams';
import { publishLeagueRound, submitPlayerScore, readableServiceError } from './lib/player-service';
import { calc9HoleHandicap, calcTeamHandicap, generateSeasonWeeks, teeTimes, courseHoles, initialWeeklyGames, moneyCategories, SCHEDULE_FIXED_PARTNER, calculateFlights, calculateChampionshipStandings } from './constants';

const LeagueContext = createContext(null);
const same = (a, b) => String(a) === String(b);
const blank = () => ({ players: [], weeks: [], weeklyGames: [], playerScores: [], attendanceRows: [], ledgerEntries: [], giantSkins: courseHoles.map(h => ({ ...h, lowScore: null, players: [] })) });
const demo = () => ({ ...blank(), players: structuredClone(demoPlayers), weeks: structuredClone(demoWeeks), weeklyGames: structuredClone(demoGames), playerScores: structuredClone(demoScores), ledgerEntries: structuredClone(demoLedger) });
const supported = (game, week) => week.nineHoles === 'front' && ['individual', 'scramble'].includes(game?.scoringMode) && (!game.teamType || game.handicapFormat === 'scramble');
const gameFromRow = row => ({ weekId: row.week_id, gameName: row.game_name, gameDescription: row.game_description, teamType: row.team_type, handicapFormat: row.handicap_format, sideGame: row.side_game, sideGameDescription: row.side_game_description, manualNetEntry: row.manual_net_entry, noHandicap: row.no_handicap });

export function useLeague() {
  const context = useContext(LeagueContext);
  if (!context) throw new Error('useLeague must be inside LeagueProvider');
  return context;
}

export function LeagueProvider({ children }) {
  const session = usePlayerSession();
  const [state, setState] = useState(() => isDemoMode ? demo() : blank());
  const [isLoading, setLoading] = useState(Boolean(supabase));
  const [dataError, setDataError] = useState(null);
  const [ledgerError, setLedgerError] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(isDemoMode ? demoWeeks[2].id : null);
  const [playerFilter, setPlayerFilter] = useState('all');
  const [leaderboardView, setLeaderboardView] = useState('season');
  const generation = useRef(0);
  const identity = useRef(session.user?.id);
  identity.current = session.user?.id;

  const refreshData = useCallback(async () => {
    if (!supabase) return;
    const request = ++generation.current;
    setLoading(true);
    const tables = ['league_public_players', 'tee_sheets', 'player_money', 'player_scores', 'weekly_games', 'giant_skins', 'league_rounds'];
    if (session.isAdmin) tables.push('league_attendance', 'league_player_preferences');
    if (session.user) tables.push('league_ledger_entries');
    try {
      const results = await Promise.all(tables.map(table => supabase.from(table).select('*')));
      if (generation.current !== request) return;
      const rows = Object.fromEntries(tables.map((table, i) => [table, results[i].data || []]));
      const errors = results.filter(result => result.error);
      const next = blank();
      next.playerScores = rows.player_scores;
      next.players = rows.league_public_players.map(row => {
        const awards = rows.player_money.filter(m => same(m.player_id, row.id));
        const weeklyMoney = {};
        for (const award of awards) {
          weeklyMoney[award.week_id] ||= {};
          weeklyMoney[award.week_id][award.category] = Number(award.amount);
        }
        const preference = rows.league_player_preferences?.find(p => same(p.player_id, row.id));
        return { id: row.id, name: row.name, handicap: Number(row.handicap || 0), availability: preference?.availability ?? row.availability ?? [], type: row.type || 'full-time', cdgaId: '', weeklyMoney, totalMoney: awards.reduce((sum, award) => sum + Number(award.amount), 0), weeksPlayed: new Set(next.playerScores.filter(s => same(s.player_id, row.id)).map(s => String(s.week_id))).size };
      });
      // Preserve historical week IDs and dates. Never seed or write during reads.
      next.weeks = generateSeasonWeeks().filter(week => rows.tee_sheets.some(s => same(s.week_id, week.id)) || rows.player_scores.some(s => same(s.week_id, week.id)) || rows.player_money.some(m => same(m.week_id, week.id))).map(week => {
        const row = rows.tee_sheets.find(s => same(s.week_id, week.id)) || {};
        return { ...week, teeSheet: row.tee_sheet || [], status: 'finalized', legacy: true, scoresEntered: row.scores_entered || false, moneyEntered: row.money_entered || false, weatherCancelled: row.weather_cancelled || false, scoreSubmissionEnabled: false };
      });
      next.weeklyGames = initialWeeklyGames.map(game => ({ ...game, ...(rows.weekly_games.find(g => same(g.week_id, game.weekId)) ? gameFromRow(rows.weekly_games.find(g => same(g.week_id, game.weekId))) : {}) }));
      for (const round of rows.league_rounds) {
        const game = { ...round.rule_snapshot, weekId: round.week_id };
        const week = { id: round.week_id, date: round.date, nineHoles: game.nineHoles || 'front', status: round.status, teeSheet: round.tee_sheet || [], attendanceDeadline: round.attendance_deadline, scoreSubmissionEnabled: round.score_submission_enabled, weatherCancelled: round.status === 'cancelled', legacy: false };
        week.isScoringSupported = supported(game, week);
        next.weeks = next.weeks.filter(w => !same(w.id, week.id)); next.weeks.push(week);
        next.weeklyGames = next.weeklyGames.filter(g => !same(g.weekId, week.id)); next.weeklyGames.push(game);
      }
      next.weeks.sort((a, b) => a.date.localeCompare(b.date));
      next.attendanceRows = rows.league_attendance || [];
      next.ledgerEntries = (rows.league_ledger_entries || []).map(ledgerEntryFromRow);
      setLedgerError(results[tables.indexOf('league_ledger_entries')]?.error ? 'Payment tracking needs database setup.' : null);
      next.giantSkins = courseHoles.map(hole => {
        const row = rows.giant_skins.find(s => s.hole_number === hole.number);
        const players = row?.players?.length ? row.players : row?.player_id != null ? [{ playerId: row.player_id, weekId: row.week_id }] : [];
        return { ...hole, lowScore: row?.low_score || null, players };
      });
      setState(next);
      setDataError(errors.length ? 'Some league data could not load. The account migration may still need to be activated. Refresh or contact the commissioner.' : null);
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
      setSelectedWeek(current => next.weeks.some(w => same(w.id, current)) ? current : next.weeks.find(w => w.date >= today)?.id ?? next.weeks.at(-1)?.id ?? null);
    } catch (error) {
      if (generation.current === request) { setState(blank()); setDataError(readableServiceError(error)); }
    } finally { if (generation.current === request) setLoading(false); }
  }, [session.user?.id, session.isAdmin]);

  useEffect(() => {
    // Clear snapshots on identity changes, including failed or signed-out sessions.
    generation.current += 1;
    if (!isDemoMode) { setState(blank()); setLedgerError(null); }
    refreshData();
    return () => { generation.current += 1; };
  }, [refreshData]);

  const getPlayerById = id => state.players.find(p => same(p.id, id));
  const getGameForWeek = id => state.weeklyGames.find(g => same(g.weekId, id));
  const attendanceRows = [...state.attendanceRows.filter(row => !same(row.player_id, session.playerId)), ...Object.values(session.attendance || {})];
  const effectivePlayers = state.players.map(player => same(player.id, session.playerId) ? { ...player, availability: session.availability } : player);
  const requireAdmin = () => { if (!session.isAdmin) throw new Error('Commissioner access is required.'); };
  const generateDraft = weekId => {
    requireAdmin();
    const week = state.weeks.find(w => same(w.id, weekId));
    if (!week || week.legacy || !['draft', 'published'].includes(week.status)) throw new Error('This round cannot be scheduled.');
    if (state.playerScores.some(score => same(score.week_id, weekId))) throw new Error('Scores are already recorded. This tee sheet is locked.');
    return generateWeekSchedule({ weekId, players: effectivePlayers, weeks: state.weeks, weeklyGames: state.weeklyGames, teeTimes, game: getGameForWeek(weekId), attendance: attendanceRows, fixedPartnerRule: isDemoMode ? null : SCHEDULE_FIXED_PARTNER });
  };

  const publishDraft = async (weekId, draft) => {
    requireAdmin();
    const week = state.weeks.find(w => same(w.id, weekId));
    const game = getGameForWeek(weekId);
    if (!week || week.legacy || !['draft', 'published'].includes(week.status) || state.playerScores.some(s => same(s.week_id, weekId))) throw new Error('This round is locked.');
    if (!supported(game, week)) throw new Error('This round needs verified course and scoring rules before publishing.');
    const check = validateTeeSheet({ teeSheet: draft.teeSheet, players: effectivePlayers, teeTimes, attendance: attendanceRows, weekId, game, fixedPartnerRule: isDemoMode ? null : SCHEDULE_FIXED_PARTNER });
    if (!check.valid) throw new Error(check.errors.map(error => error.message).join(' '));
    if (draft.unscheduled?.length) throw new Error('Resolve unscheduled players before publishing.');
    const teams = getTeamsForWeek({ weekId, teeSheet: draft.teeSheet, game });
    if (teams.some(team => team.status !== 'complete')) throw new Error('Resolve incomplete teams before publishing.');
    const participants = draft.teeSheet.flatMap(slot => slot.players.map(id => {
      const team = teams.find(t => t.memberIds.some(member => same(member, id)));
      const handicap = team ? calcTeamHandicap(team.memberIds.map(member => calc9HoleHandicap(getPlayerById(member).handicap)), 'scramble') : calc9HoleHandicap(getPlayerById(id).handicap);
      return { player_id: Number(id), team_id: team?.teamId || null, handicap_used: handicap, tee_time: slot.time };
    }));
    if (!isDemoMode) await publishLeagueRound(supabase, { weekId, teeSheet: draft.teeSheet, participants, ruleSnapshot: { ...game, nineHoles: week.nineHoles } });
    if (isDemoMode) {
      setState(current => ({ ...current, weeks: current.weeks.map(w => same(w.id, weekId) ? { ...w, teeSheet: draft.teeSheet, status: 'published' } : w) }));
      session.updateDemoRound?.({ ...week, status: 'published' });
    }
    else { await refreshData(); await session.refreshProfile(); }
  };

  const createRound = async ({ date, attendanceDeadline, teamType }) => {
    requireAdmin();
    if (teamType === 'individual') teamType = null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(attendanceDeadline).getTime())) throw new Error('Enter a round date and attendance deadline.');
    if (state.weeks.some(w => w.date === date)) throw new Error('A round already exists on that date.');
    if (![null, '', '2-person', '4-person'].includes(teamType)) throw new Error('Choose a supported game.');
    const game = { gameName: teamType ? `${teamType === '2-person' ? 'Two' : 'Four'}-person scramble` : 'Individual stroke play', teamType: teamType || null, scoringMode: teamType ? 'scramble' : 'individual', handicapFormat: 'scramble', nineHoles: 'front' };
    if (!isDemoMode) {
      const { data, error } = await supabase.rpc('create_league_round', { p_date: date, p_attendance_deadline: attendanceDeadline, p_rule_snapshot: game });
      if (error) throw new Error(readableServiceError(error));
      await refreshData(); await session.refreshProfile();
      setSelectedWeek(data.week_id); return { ...data, id: data.week_id };
    } else {
      const id = date.replaceAll('-', '');
      setState(current => ({ ...current, weeks: [...current.weeks, { id, date, nineHoles: 'front', status: 'draft', teeSheet: [], attendanceDeadline, scoreSubmissionEnabled: true, legacy: false, isScoringSupported: true }].sort((a,b) => a.date.localeCompare(b.date)), weeklyGames: [...current.weeklyGames, { ...game, weekId: id }] }));
      setSelectedWeek(id);
      session.updateDemoRound?.({ id, date, status: 'draft', attendanceDeadline });
      return { id, date };
    }
  };

  const cancelRound = async weekId => {
    requireAdmin();
    const week = state.weeks.find(w => same(w.id, weekId));
    if (!week || week.legacy || week.status === 'finalized' || state.playerScores.some(s => same(s.week_id, weekId))) throw new Error('This round cannot be cancelled because it is historical or has scores.');
    if (!isDemoMode) { const { error } = await supabase.rpc('cancel_league_round', { p_week_id: String(weekId) }); if (error) throw new Error(readableServiceError(error)); }
    setState(current => ({ ...current, weeks: current.weeks.map(w => same(w.id, weekId) ? { ...w, status: 'cancelled', weatherCancelled: true } : w) }));
    if (!isDemoMode) await session.refreshProfile();
    else session.updateDemoRound?.({ ...week, status: 'cancelled' });
  };

  const submitScore = async score => {
    if (!session.playerId) throw new Error('Sign in with your league account.');
    if (isDemoMode) throw new Error('Score submission is available on your connected league. Demo scores are examples.');
    await submitPlayerScore(supabase, score); await refreshData();
  };

  const recordLedgerEntry = async entry => {
    requireAdmin();
    const actor = identity.current;
    let saved;
    if (isDemoMode) {
      saved = normalizeLedgerEntry(entry);
      reconcileLedger([...state.ledgerEntries.filter(e => same(e.playerId, saved.playerId)), saved], { playerId: saved.playerId });
    } else saved = await persistLedgerEntry(supabase, entry);
    if (identity.current !== actor) return saved;
    setState(current => ({ ...current, ledgerEntries: [...current.ledgerEntries.filter(e => e.id !== saved.id), saved] }));
    return saved;
  };

  const formatDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const formatShortDate = date => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // Championship IDs 18–20 belong to the archived 2026 season. Future awards
  // and rounds must never silently move those historical players between flights.
  const archivedWeekIds = new Set(generateSeasonWeeks().map(week => String(week.id)));
  const championshipPlayers = state.players.map(player => {
    const weeklyMoney = Object.fromEntries(Object.entries(player.weeklyMoney || {}).filter(([weekId]) => archivedWeekIds.has(String(weekId))));
    return { ...player, weeklyMoney, totalMoney: Object.values(weeklyMoney).reduce((total, entries) => total + Object.values(entries).reduce((sum, amount) => sum + Number(amount || 0), 0), 0), weeksPlayed: Object.keys(weeklyMoney).length };
  });
  const flightAssignments = calculateFlights(championshipPlayers);
  const getTeammatesForWeek = (playerId, weekId) => getPlayerTeam({ playerId, weekId, teeSheet: state.weeks.find(w => same(w.id, weekId))?.teeSheet || [], game: getGameForWeek(weekId) });
  const getPayoutLabel = (_weekId, key) => moneyCategories.find(category => category.id === key)?.name || key;

  return <LeagueContext.Provider value={{ ...state, attendanceRows, isLoading, dataError, selectedWeek, setSelectedWeek, playerFilter, setPlayerFilter, leaderboardView, setLeaderboardView, refreshData, generateDraft, publishDraft, createRound, cancelRound, submitScore, recordLedgerEntry, ledgerError,
    ledgerTrackingComplete: isDemoMode, getPlayerById, getGameForWeek, getTeamTypeForWeek: id => getGameForWeek(id)?.teamType || null, getTeammatesForWeek, getPayoutLabel, formatDate, formatShortDate,
    filteredPlayers: state.players.filter(p => playerFilter === 'all' || p.type === playerFilter), sortedByMoney: [...state.players].sort((a,b) => b.totalMoney - a.totalMoney), getPlayerFlight: id => flightAssignments[id] || null,
    championshipStandings: calculateChampionshipStandings(championshipPlayers, state.playerScores, flightAssignments),
    getWeekPayouts: () => [], payoutEntryKey: payout => payout.key || payout.category,
    getWeeklyMoneyTotal: weekId => state.players.reduce((sum,p) => sum + Object.values(p.weeklyMoney?.[weekId] || {}).reduce((a,b) => a + Number(b), 0), 0),
    isAdminAuthenticated: session.isAdmin,
  }}>{children}</LeagueContext.Provider>;
}
