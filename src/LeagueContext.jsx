import React, { useState, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  initialPlayers, calc9HoleHandicap, calcTeamHandicap, generateSeasonWeeks,
  teeTimes, courseHoles, moneyCategories, initialWeeklyGames, ADMIN_PASSWORD,
  DEFAULT_SEASON_BUY_IN, defaultPayoutTemplates, defaultWeekTemplates,
  SCHEDULE_FIXED_PARTNER
} from './constants';

const LeagueContext = createContext(null);

// Strip legacy hardcoded payout text from game descriptions (migrates old Supabase data)
const stripPayoutText = (desc) => {
  if (!desc) return desc;
  return desc.replace(/\n\n(Payouts?|No main game payout)[\s\S]*$/, '');
};

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within a LeagueProvider');
  return ctx;
}

export function LeagueProvider({ children }) {
  const location = useLocation();

  const [players, setPlayers] = useState(initialPlayers);
  const [weeks, setWeeks] = useState(generateSeasonWeeks());
  const [selectedWeek, setSelectedWeek] = useState(() => {
    const allWeeks = generateSeasonWeeks();
    const today = new Date().toLocaleDateString('en-CA');
    const current = allWeeks.find(w => w.date === today);
    if (current) return current.id;
    const next = allWeeks.find(w => w.date > today);
    if (next) return next.id;
    return allWeeks.length > 0 ? allWeeks[allWeeks.length - 1].id : 1;
  });
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [giantSkins, setGiantSkins] = useState(
    courseHoles.map(hole => ({ ...hole, lowScore: null, players: [] }))
  );

  const [pairingHistory, setPairingHistory] = useState({});

  // Admin state
  const [showScheduleBuilder, setShowScheduleBuilder] = useState(false);
  const [showMoneyEntry, setShowMoneyEntry] = useState(false);
  const [scheduleSelections, setScheduleSelections] = useState({});
  const [moneyEntries, setMoneyEntries] = useState({});
  const [dragPlayer, setDragPlayer] = useState(null);
  const [dragOverSlot, setDragOverSlot] = useState(null);

  // Weekly games state
  const [weeklyGames, setWeeklyGames] = useState(initialWeeklyGames);
  const [showWeeklyGameEditor, setShowWeeklyGameEditor] = useState(false);
  const [weeklyGameEdit, setWeeklyGameEdit] = useState({
    gameName: '', gameDescription: '', sideGame: '', sideGameDescription: '', teamType: null,
    showTeamHandicap: false, handicapFormat: 'scramble', reducedHandicap: false
  });

  // Player management state
  const [showPlayerEditor, setShowPlayerEditor] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState(null);
  const [playerEdit, setPlayerEdit] = useState({
    name: '', phone: '', email: '', handicap: 0, cdgaId: '', availability: [], type: 'full-time'
  });
  const [playerSearchTerm, setPlayerSearchTerm] = useState('');
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [newPlayer, setNewPlayer] = useState({
    name: '', phone: '', email: '', handicap: 0, cdgaId: '', availability: [], type: 'full-time'
  });
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(null);

  // Admin authentication
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const [playerFilter, setPlayerFilter] = useState('all');
  const [leaderboardView, setLeaderboardView] = useState('season');
  const [isLoading, setIsLoading] = useState(true);

  // Player self-service score entry
  const [showPlayerScoreEntry, setShowPlayerScoreEntry] = useState(false);
  const [playerScoreForm, setPlayerScoreForm] = useState({
    playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: [], phoneInput: ''
  });

  const [playerScores, setPlayerScores] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Giant Skins management state (admin)
  const [showGiantSkinsManager, setShowGiantSkinsManager] = useState(false);
  const [giantSkinsAddForm, setGiantSkinsAddForm] = useState({ holeNumber: '', playerId: '', type: 'birdie' });

  // Score management state (admin)
  const [showScoreManager, setShowScoreManager] = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [scoreManagerWeek, setScoreManagerWeek] = useState(1);
  const [adminAddScore, setAdminAddScore] = useState({ playerId: '', grossScore: '', birdieHoles: [], eagleHoles: [] });

  // Sub signup state
  const [showSubSignup, setShowSubSignup] = useState(false);
  const [subSignupSlot, setSubSignupSlot] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState('');
  const [signupPhoneInput, setSignupPhoneInput] = useState('');

  // Remove from tee time state
  const [showRemoveFromTeeTime, setShowRemoveFromTeeTime] = useState(false);
  const [removeFromTeeTimeInfo, setRemoveFromTeeTimeInfo] = useState(null);
  const [removePhoneInput, setRemovePhoneInput] = useState('');

  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState(null);
  const [resetWeekId, setResetWeekId] = useState(null);

  // Score overwrite confirmation state
  const [scoreOverwriteConfirm, setScoreOverwriteConfirm] = useState(null);

  // Payout tracker state
  const [seasonBuyIn, setSeasonBuyIn] = useState(DEFAULT_SEASON_BUY_IN);
  const [payoutTemplates, setPayoutTemplates] = useState(defaultPayoutTemplates);
  const [weekTemplateAssignments, setWeekTemplateAssignments] = useState(defaultWeekTemplates);
  const [showBudgetDashboard, setShowBudgetDashboard] = useState(false);
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Helper to convert Supabase player row to app player object
  const supabasePlayerToApp = (row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    handicap: row.handicap || 0,
    cdgaId: row.cdga_id || '',
    availability: row.availability || [],
    type: row.type || 'full-time',
    weeksPlayed: 0,
    totalMoney: 0,
    weeklyMoney: {}
  });

  // Load data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load players from Supabase (seed from constants if table is empty)
        const { data: playersData, error: playersError } = await supabase
          .from('players').select('*');

        let loadedPlayers;
        if (playersError) {
          // Table does not exist — use initialPlayers and warn admin
          console.error('Players table error:', playersError.message);
          console.error('IMPORTANT: You need to create the "players" table in your Supabase dashboard. Player changes will NOT persist until the table is created.');
          loadedPlayers = initialPlayers;
        } else if (playersData && playersData.length > 0) {
          loadedPlayers = playersData.map(supabasePlayerToApp);
          // Migration: restore '5:20 PM' to any player whose initialPlayers availability includes it
          const initialPlayerMap = new Map(initialPlayers.map(p => [p.id, p]));
          const toMigrate = loadedPlayers.filter(p => {
            const orig = initialPlayerMap.get(p.id);
            return orig && orig.availability.includes('5:20 PM') && !p.availability.includes('5:20 PM');
          });
          if (toMigrate.length > 0) {
            await Promise.all(toMigrate.map(p =>
              supabase.from('players').update({ availability: [...p.availability, '5:20 PM'] }).eq('id', p.id)
            ));
            loadedPlayers = loadedPlayers.map(p =>
              toMigrate.some(m => m.id === p.id) ? { ...p, availability: [...p.availability, '5:20 PM'] } : p
            );
          }
        } else {
          // Table exists but is empty — seed it from initialPlayers
          const rows = initialPlayers.map(p => ({
            id: p.id, name: p.name, phone: p.phone, email: p.email,
            handicap: p.handicap, cdga_id: p.cdgaId, availability: p.availability, type: p.type
          }));
          const { error: seedError } = await supabase.from('players').upsert(rows, { onConflict: 'id' });
          if (seedError) console.error('Error seeding players:', seedError);
          loadedPlayers = initialPlayers;
        }
        setPlayers(loadedPlayers);

        const { data: teeSheetData, error: teeSheetError } = await supabase
          .from('tee_sheets').select('*');
        if (teeSheetError) {
          console.error('Tee sheets table error:', teeSheetError.message);
          console.error('IMPORTANT: You need to create the "tee_sheets" table in your Supabase dashboard. Tee sheet changes will NOT persist until the table is created.');
        } else if (teeSheetData && teeSheetData.length > 0) {
          setWeeks(prevWeeks => prevWeeks.map(week => {
            const savedSheet = teeSheetData.find(ts => ts.week_id === week.id);
            if (savedSheet) {
              return { ...week, teeSheet: (savedSheet.tee_sheet || []), scoresEntered: savedSheet.scores_entered || false, moneyEntered: savedSheet.money_entered || false, weatherCancelled: savedSheet.weather_cancelled || false, scoreSubmissionEnabled: savedSheet.score_submission_enabled ?? true, teeSignupEnabled: savedSheet.tee_signup_enabled ?? true };
            }
            return week;
          }));
        }

        const { data: moneyData, error: moneyError } = await supabase
          .from('player_money').select('*');
        if (moneyError) {
          console.error('Player money table error:', moneyError.message);
          console.error('IMPORTANT: You need to create the "player_money" table in your Supabase dashboard. Money tracking will NOT persist until the table is created.');
        } else if (moneyData && moneyData.length > 0) {
          setPlayers(prevPlayers => prevPlayers.map(player => {
            const playerMoney = moneyData.filter(m => m.player_id === player.id);
            if (playerMoney.length > 0) {
              const weeklyMoney = {};
              let totalMoney = 0;
              const weeksWithMoney = new Set();
              playerMoney.forEach(m => {
                if (!weeklyMoney[m.week_id]) weeklyMoney[m.week_id] = {};
                weeklyMoney[m.week_id][m.category] = m.amount;
                totalMoney += m.amount;
                weeksWithMoney.add(m.week_id);
              });
              return { ...player, weeklyMoney, totalMoney, weeksPlayed: weeksWithMoney.size };
            }
            return player;
          }));
        }

        const { data: skinsData, error: skinsError } = await supabase
          .from('giant_skins').select('*');
        if (skinsError) {
          console.error('Giant skins table error:', skinsError.message);
          console.error('IMPORTANT: You need to create the "giant_skins" table in your Supabase dashboard. Giant skins tracking will NOT persist until the table is created.');
        } else if (skinsData && skinsData.length > 0) {
          setGiantSkins(prevSkins => prevSkins.map(skin => {
            const savedSkin = skinsData.find(s => s.hole_number === skin.number);
            if (savedSkin && savedSkin.low_score) {
              let players = savedSkin.players || [];
              if (players.length === 0 && savedSkin.player_id) {
                players = [{ playerId: savedSkin.player_id, weekId: savedSkin.week_id }];
              }
              return { ...skin, lowScore: savedSkin.low_score, players };
            }
            return skin;
          }));
        }

        const { data: scoresData, error: scoresError } = await supabase
          .from('player_scores').select('*');
        if (scoresError) {
          console.error('Player scores table error:', scoresError.message);
          console.error('IMPORTANT: You need to create the "player_scores" table in your Supabase dashboard. Score tracking will NOT persist until the table is created.');
        } else if (scoresData && scoresData.length > 0) {
          setPlayerScores(scoresData);
        }

        // Load weekly games from Supabase
        const { data: gamesData, error: gamesError } = await supabase
          .from('weekly_games').select('*');
        if (gamesError) {
          console.error('Weekly games table error:', gamesError.message);
          console.error('IMPORTANT: You need to create the "weekly_games" table in your Supabase dashboard. Weekly game changes will NOT persist until the table is created.');
        } else if (gamesData && gamesData.length > 0) {
          setWeeklyGames(initialWeeklyGames.map(game => {
            const saved = gamesData.find(g => g.week_id === game.weekId);
            if (saved) {
              return {
                ...game,
                gameName: saved.game_name ?? game.gameName,
                gameDescription: stripPayoutText(saved.game_description ?? game.gameDescription),
                sideGame: saved.side_game ?? game.sideGame,
                sideGameDescription: saved.side_game_description ?? game.sideGameDescription,
                teamType: saved.team_type ?? game.teamType,
                showTeamHandicap: saved.show_team_handicap ?? false,
                handicapFormat: saved.handicap_format ?? 'scramble',
                reducedHandicap: saved.reduced_handicap ?? false
              };
            }
            return game;
          }));
        }

        // Load league settings (payout tracker)
        const { data: settingsData } = await supabase.from('league_settings').select('*').eq('id', 1).single();
        if (settingsData) {
          if (settingsData.season_buy_in) setSeasonBuyIn(settingsData.season_buy_in);
          if (settingsData.week_template_assignments) setWeekTemplateAssignments(settingsData.week_template_assignments);
        }

        // Load payout templates
        const { data: templatesData } = await supabase.from('payout_templates').select('*');
        if (templatesData && templatesData.length > 0) {
          setPayoutTemplates(templatesData.map(t => ({
            id: t.id, name: t.name, payouts: t.payouts || [],
            sideGameTotal: t.side_game_total || 0,
            sideGameName: t.side_game_name || '',
            sideGameDescription: t.side_game_description || '',
            isDefault: t.is_default || false
          })));
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Refresh data on route change
  const refreshData = async () => {
    try {
      // Reload players from Supabase
      const { data: playersData } = await supabase.from('players').select('*');
      if (playersData && playersData.length > 0) {
        const basePlayers = playersData.map(supabasePlayerToApp);

        // Apply money data on top of the fresh player list
        const { data: moneyData } = await supabase.from('player_money').select('*');
        const playersWithMoney = basePlayers.map(player => {
          const playerMoney = (moneyData || []).filter(m => m.player_id === player.id);
          if (playerMoney.length > 0) {
            const weeklyMoney = {};
            let totalMoney = 0;
            const weeksWithMoney = new Set();
            playerMoney.forEach(m => {
              if (!weeklyMoney[m.week_id]) weeklyMoney[m.week_id] = {};
              weeklyMoney[m.week_id][m.category] = m.amount;
              totalMoney += m.amount;
              weeksWithMoney.add(m.week_id);
            });
            return { ...player, weeklyMoney, totalMoney, weeksPlayed: weeksWithMoney.size };
          }
          return player;
        });
        setPlayers(playersWithMoney);
      }

      const { data: skinsData } = await supabase.from('giant_skins').select('*');
      if (skinsData) {
        setGiantSkins(prevSkins => prevSkins.map(skin => {
          const savedSkin = skinsData.find(s => s.hole_number === skin.number);
          if (savedSkin && savedSkin.low_score) {
            let players = savedSkin.players || [];
            if (players.length === 0 && savedSkin.player_id) {
              players = [{ playerId: savedSkin.player_id, weekId: savedSkin.week_id }];
            }
            return { ...skin, lowScore: savedSkin.low_score, players };
          }
          return { ...skin, lowScore: null, players: [] };
        }));
      }

      const { data: scoresData } = await supabase.from('player_scores').select('*');
      if (scoresData) setPlayerScores(scoresData);

      const { data: teeSheetData } = await supabase.from('tee_sheets').select('*');
      if (teeSheetData && teeSheetData.length > 0) {
        setWeeks(prevWeeks => prevWeeks.map(week => {
          const savedSheet = teeSheetData.find(ts => ts.week_id === week.id);
          if (savedSheet) {
            return { ...week, teeSheet: (savedSheet.tee_sheet || []), scoresEntered: savedSheet.scores_entered || false, moneyEntered: savedSheet.money_entered || false, weatherCancelled: savedSheet.weather_cancelled || false, scoreSubmissionEnabled: savedSheet.score_submission_enabled ?? true, teeSignupEnabled: savedSheet.tee_signup_enabled ?? true };
          }
          return week;
        }));
      }

      // Refresh weekly games from Supabase
      const { data: gamesData } = await supabase.from('weekly_games').select('*');
      if (gamesData && gamesData.length > 0) {
        setWeeklyGames(initialWeeklyGames.map(game => {
          const saved = gamesData.find(g => g.week_id === game.weekId);
          if (saved) {
            return {
              ...game,
              gameName: saved.game_name ?? game.gameName,
              gameDescription: stripPayoutText(saved.game_description ?? game.gameDescription),
              sideGame: saved.side_game ?? game.sideGame,
              sideGameDescription: saved.side_game_description ?? game.sideGameDescription,
              teamType: saved.team_type ?? game.teamType,
              showTeamHandicap: saved.show_team_handicap ?? false,
              handicapFormat: saved.handicap_format ?? 'scramble',
              reducedHandicap: saved.reduced_handicap ?? false
            };
          }
          return game;
        }));
      }

      // Refresh payout templates and league settings
      const { data: settingsData } = await supabase.from('league_settings').select('*').eq('id', 1).single();
      if (settingsData) {
        if (settingsData.season_buy_in) setSeasonBuyIn(settingsData.season_buy_in);
        if (settingsData.week_template_assignments) setWeekTemplateAssignments(settingsData.week_template_assignments);
      }
      const { data: templatesData } = await supabase.from('payout_templates').select('*');
      if (templatesData && templatesData.length > 0) {
        setPayoutTemplates(templatesData.map(t => ({
          id: t.id, name: t.name, payouts: t.payouts || [],
          sideGameTotal: t.side_game_total || 0,
          sideGameName: t.side_game_name || '',
          sideGameDescription: t.side_game_description || '',
          isDefault: t.is_default || false
        })));
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  useEffect(() => {
    if (!isLoading) refreshData();
  }, [location.pathname]);

  // === Supabase save helpers ===
  const savePlayerToSupabase = async (player) => {
    try {
      const { error } = await supabase.from('players').upsert({
        id: player.id,
        name: player.name,
        phone: player.phone || '',
        email: player.email || '',
        handicap: player.handicap,
        cdga_id: player.cdgaId || '',
        availability: player.availability || [],
        type: player.type || 'full-time'
      }, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving player:', error);
      alert(`Failed to save player to database: ${error.message || 'Unknown error'}. Please check the browser console and ensure the "players" table exists in Supabase.`);
      return false;
    }
  };

  const deletePlayerFromSupabase = async (playerId) => {
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting player:', error);
      alert(`Failed to remove player from database: ${error.message || 'Unknown error'}`);
      return false;
    }
  };

  const saveTeeSheetToSupabase = async (weekId, teeSheet, scoresEntered = false, moneyEntered = false, weatherCancelled = false, scoreSubmissionEnabled = true, teeSignupEnabled = true) => {
    try {
      const { error } = await supabase.from('tee_sheets').upsert({
        week_id: weekId, tee_sheet: teeSheet, scores_entered: scoresEntered, money_entered: moneyEntered, weather_cancelled: weatherCancelled, score_submission_enabled: scoreSubmissionEnabled, tee_signup_enabled: teeSignupEnabled
      }, { onConflict: 'week_id' });
      if (error) throw error;
    } catch (error) {
      console.error('Error saving tee sheet:', error);
      if (error?.message?.includes('weather_cancelled')) {
        console.error('IMPORTANT: Add a "weather_cancelled boolean DEFAULT false" column to the "tee_sheets" table in Supabase for the weather cancellation feature to persist.');
      }
      if (error?.message?.includes('score_submission_enabled')) {
        console.error('IMPORTANT: Add a "score_submission_enabled boolean DEFAULT true" column to the "tee_sheets" table in Supabase for the submit-score toggle to persist.');
      }
      if (error?.message?.includes('tee_signup_enabled')) {
        console.error('IMPORTANT: Add a "tee_signup_enabled boolean DEFAULT true" column to the "tee_sheets" table in Supabase for the tee time signup lock toggle to persist.');
      }
    }
  };

  const toggleWeatherCancelled = async (weekId) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;
    const newValue = !week.weatherCancelled;
    setWeeks(weeks.map(w => w.id === weekId ? { ...w, weatherCancelled: newValue } : w));
    await saveTeeSheetToSupabase(
      weekId,
      week.teeSheet || [],
      week.scoresEntered || false,
      week.moneyEntered || false,
      newValue,
      week.scoreSubmissionEnabled ?? true
    );
  };

  const setScoreSubmissionEnabled = async (weekId, enabled) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;
    setWeeks(weeks.map(w => w.id === weekId ? { ...w, scoreSubmissionEnabled: enabled } : w));
    await saveTeeSheetToSupabase(
      weekId,
      week.teeSheet || [],
      week.scoresEntered || false,
      week.moneyEntered || false,
      week.weatherCancelled || false,
      enabled,
      week.teeSignupEnabled ?? true
    );
  };

  const setTeeSignupEnabled = async (weekId, enabled) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;
    setWeeks(weeks.map(w => w.id === weekId ? { ...w, teeSignupEnabled: enabled } : w));
    await saveTeeSheetToSupabase(
      weekId,
      week.teeSheet || [],
      week.scoresEntered || false,
      week.moneyEntered || false,
      week.weatherCancelled || false,
      week.scoreSubmissionEnabled ?? true,
      enabled
    );
  };

  const saveMoneyToSupabase = async (playerId, weekId, category, amount) => {
    const { error } = await supabase.from('player_money').upsert({
      player_id: playerId, week_id: weekId, category, amount
    }, { onConflict: 'player_id,week_id,category' });
    if (error) console.error('Error saving money:', error);
    return error;
  };

  const saveGiantSkinToSupabase = async (holeNumber, lowScore, players) => {
    try {
      const { error } = await supabase.from('giant_skins').upsert({
        hole_number: holeNumber, low_score: lowScore, players
      }, { onConflict: 'hole_number' });
      if (error) throw error;
    } catch (error) { console.error('Error saving giant skin:', error); }
  };

  // === Payout tracker Supabase helpers ===
  const saveLeagueSettings = async (buyIn) => {
    try {
      const { error } = await supabase.from('league_settings').upsert({
        id: 1, season_buy_in: buyIn
      }, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) { console.error('Error saving league settings:', error); }
  };

  const savePayoutTemplatesData = async (templates) => {
    try {
      const { error: deleteError } = await supabase.from('payout_templates').delete().neq('id', '');
      if (deleteError) {
        console.error('Delete step failed:', deleteError);
        alert(`Failed to clear payout templates (delete step): ${deleteError.message || JSON.stringify(deleteError)}`);
        return;
      }
      if (templates.length > 0) {
        const rows = templates.map(t => ({
          id: t.id, name: t.name, payouts: t.payouts,
          side_game_total: t.sideGameTotal ?? 0,
          side_game_name: t.sideGameName || '',
          side_game_description: t.sideGameDescription || '',
          is_default: t.isDefault || false
        }));
        const { error } = await supabase.from('payout_templates').upsert(rows, { onConflict: 'id' });
        if (error) {
          console.error('Upsert step failed:', error, 'rows sent:', JSON.stringify(rows));
          alert(`Failed to save payout templates (upsert step): ${error.message || JSON.stringify(error)}`);
        }
      }
    } catch (error) {
      console.error('Error saving payout templates:', error);
      alert(`Failed to save payout templates: ${error.message || JSON.stringify(error)}`);
    }
  };

  const saveWeekTemplateAssignments = async (assignments) => {
    try {
      const { error } = await supabase.from('league_settings').upsert({
        id: 1, season_buy_in: seasonBuyIn, week_template_assignments: assignments
      }, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) { console.error('Error saving week template assignments:', error); alert('Failed to save week assignments. Check the browser console for details.'); }
  };

  const savePlayerScoreToSupabase = async (playerId, weekId, grossScore, netScore, handicapUsed, birdieHoles = [], eagleHoles = [], isTeamScore = false) => {
    // Delete any existing score for this player/week first, then insert fresh.
    // This avoids relying on a unique constraint for upsert conflict resolution.
    const { error: deleteError } = await supabase.from('player_scores')
      .delete().eq('player_id', playerId).eq('week_id', weekId);
    if (deleteError) throw deleteError;
    const { error: insertError } = await supabase.from('player_scores').insert({
      player_id: playerId, week_id: weekId, gross_score: grossScore, net_score: netScore,
      handicap_used: handicapUsed, birdie_holes: birdieHoles, eagle_holes: eagleHoles, is_team_score: isTeamScore
    });
    if (insertError) throw insertError;
  };

  // === Tee time signup ===
  const handleSubSignup = async () => {
    if (!subSignupSlot || !selectedSubId) return;
    const { weekId, slotIndex } = subSignupSlot;
    const subId = parseInt(selectedSubId);

    const signupWeek = weeks.find(w => w.id === weekId);
    if (signupWeek && signupWeek.teeSignupEnabled === false) {
      alert('The tee sheet is locked for this week. Please contact the league admin to change tee times.');
      return;
    }

    // Phone verification
    const player = players.find(p => p.id === subId);
    if (player) {
      const storedLast4 = (player.phone || '').replace(/\D/g, '').slice(-4);
      if (storedLast4 && signupPhoneInput.trim() !== storedLast4) {
        alert('Phone verification failed. Please enter the last 4 digits of your phone number.');
        return;
      }
    }

    const week = weeks.find(w => w.id === weekId);
    if (!week) return;

    // Build updated tee sheet — handle swap if player already in a slot
    const updatedTeeSheet = week.teeSheet.map((slot, idx) => {
      // Remove player from any existing slot (swap case)
      let updatedPlayers = slot.players.filter(id => id !== subId);
      // Add player to the target slot
      if (idx === slotIndex) {
        updatedPlayers = [...updatedPlayers, subId];
      }
      return { ...slot, players: updatedPlayers };
    });

    setWeeks(weeks.map(w => w.id === weekId ? { ...w, teeSheet: updatedTeeSheet } : w));
    await saveTeeSheetToSupabase(weekId, updatedTeeSheet, week.scoresEntered || false, week.moneyEntered || false, week.weatherCancelled || false, week.scoreSubmissionEnabled ?? true, week.teeSignupEnabled ?? true);
    setShowSubSignup(false);
    setSubSignupSlot(null);
    setSelectedSubId('');
    setSignupPhoneInput('');
  };

  // === Remove from tee time ===
  const handleRemoveFromTeeTime = async () => {
    if (!removeFromTeeTimeInfo) return;
    const { weekId, slotIndex, playerId } = removeFromTeeTimeInfo;

    const removeWeek = weeks.find(w => w.id === weekId);
    if (removeWeek && removeWeek.teeSignupEnabled === false) {
      alert('The tee sheet is locked for this week. Please contact the league admin to change tee times.');
      return;
    }

    // Phone verification
    const player = players.find(p => p.id === playerId);
    if (player) {
      const storedLast4 = (player.phone || '').replace(/\D/g, '').slice(-4);
      if (storedLast4 && removePhoneInput.trim() !== storedLast4) {
        alert('Phone verification failed. Please enter the last 4 digits of your phone number.');
        return;
      }
    }

    const week = weeks.find(w => w.id === weekId);
    if (!week) return;

    const updatedTeeSheet = week.teeSheet.map((slot, idx) => {
      if (idx === slotIndex) {
        return { ...slot, players: slot.players.filter(id => id !== playerId) };
      }
      return slot;
    });

    setWeeks(weeks.map(w => w.id === weekId ? { ...w, teeSheet: updatedTeeSheet } : w));
    await saveTeeSheetToSupabase(weekId, updatedTeeSheet, week.scoresEntered || false, week.moneyEntered || false, week.weatherCancelled || false, week.scoreSubmissionEnabled ?? true, week.teeSignupEnabled ?? true);
    setShowRemoveFromTeeTime(false);
    setRemoveFromTeeTimeInfo(null);
    setRemovePhoneInput('');
  };

  // === Giant Skins ===
  const recalculateGiantSkins = async () => {
    try {
      const { data: allScores, error } = await supabase.from('player_scores').select('*');
      if (error) throw error;

      const holeBestScores = {};
      for (const score of (allScores || [])) {
        const birdieHoles = score.birdie_holes || [];
        const eagleHoles = score.eagle_holes || [];

        for (const holeNum of birdieHoles) {
          const hole = courseHoles.find(h => h.number === holeNum);
          if (!hole) continue;
          const birdieScore = hole.par - 1;
          const playerEntry = { playerId: score.player_id, weekId: score.week_id };
          if (!holeBestScores[holeNum]) {
            holeBestScores[holeNum] = { lowScore: birdieScore, players: [playerEntry] };
          } else if (birdieScore < holeBestScores[holeNum].lowScore) {
            holeBestScores[holeNum] = { lowScore: birdieScore, players: [playerEntry] };
          } else if (birdieScore === holeBestScores[holeNum].lowScore) {
            const exists = holeBestScores[holeNum].players.some(p => p.playerId === score.player_id && p.weekId === score.week_id);
            if (!exists) holeBestScores[holeNum].players.push(playerEntry);
          }
        }

        for (const holeNum of eagleHoles) {
          const hole = courseHoles.find(h => h.number === holeNum);
          if (!hole) continue;
          const eagleScore = hole.par - 2;
          const playerEntry = { playerId: score.player_id, weekId: score.week_id };
          if (!holeBestScores[holeNum]) {
            holeBestScores[holeNum] = { lowScore: eagleScore, players: [playerEntry] };
          } else if (eagleScore < holeBestScores[holeNum].lowScore) {
            holeBestScores[holeNum] = { lowScore: eagleScore, players: [playerEntry] };
          } else if (eagleScore === holeBestScores[holeNum].lowScore) {
            const exists = holeBestScores[holeNum].players.some(p => p.playerId === score.player_id && p.weekId === score.week_id);
            if (!exists) holeBestScores[holeNum].players.push(playerEntry);
          }
        }
      }

      // Preserve manual entries from current state
      const manualEntries = {};
      for (const skin of giantSkins) {
        const manualPlayers = (skin.players || []).filter(p => p.manual);
        if (manualPlayers.length > 0) {
          // Determine manual score from hole par and whether it's birdie or eagle level
          manualEntries[skin.number] = { lowScore: skin.lowScore, players: manualPlayers };
        }
      }

      const updatedGiantSkins = courseHoles.map(hole => {
        const best = holeBestScores[hole.number];
        const manual = manualEntries[hole.number];

        if (best && manual) {
          // Merge: keep whichever has the lower score, or combine if equal
          if (best.lowScore < manual.lowScore) {
            return { ...hole, lowScore: best.lowScore, players: best.players };
          } else if (manual.lowScore < best.lowScore) {
            return { ...hole, lowScore: manual.lowScore, players: manual.players };
          } else {
            // Equal scores - combine, avoiding duplicates
            const combined = [...best.players];
            for (const mp of manual.players) {
              const exists = combined.some(p => p.playerId === mp.playerId);
              if (!exists) combined.push(mp);
            }
            return { ...hole, lowScore: best.lowScore, players: combined };
          }
        } else if (best) {
          return { ...hole, lowScore: best.lowScore, players: best.players };
        } else if (manual) {
          return { ...hole, lowScore: manual.lowScore, players: manual.players };
        }
        return { ...hole, lowScore: null, players: [] };
      });

      for (const skin of updatedGiantSkins) {
        await saveGiantSkinToSupabase(skin.number, skin.lowScore, skin.players || []);
      }
      setGiantSkins(updatedGiantSkins);
    } catch (error) { console.error('Error recalculating giant skins:', error); }
  };

  // === Giant Skins Admin Management ===
  const addPlayerToGiantSkin = async (holeNumber, playerId, type) => {
    const hole = courseHoles.find(h => h.number === holeNumber);
    if (!hole) return;
    const score = type === 'eagle' ? hole.par - 2 : hole.par - 1;
    const newEntry = { playerId, weekId: null, manual: true };

    setGiantSkins(prev => {
      const updated = prev.map(skin => {
        if (skin.number !== holeNumber) return skin;
        if (!skin.lowScore || score < skin.lowScore) {
          return { ...skin, lowScore: score, players: [newEntry] };
        } else if (score === skin.lowScore) {
          const exists = skin.players.some(p => p.playerId === playerId);
          if (exists) return skin;
          return { ...skin, players: [...skin.players, newEntry] };
        }
        return skin;
      });
      // Save async
      const updatedHole = updated.find(s => s.number === holeNumber);
      saveGiantSkinToSupabase(holeNumber, updatedHole.lowScore, updatedHole.players || []);
      return updated;
    });
  };

  const removePlayerFromGiantSkin = async (holeNumber, playerId) => {
    setGiantSkins(prev => {
      const updated = prev.map(skin => {
        if (skin.number !== holeNumber) return skin;
        const newPlayers = skin.players.filter(p => p.playerId !== playerId);
        if (newPlayers.length === 0) {
          return { ...skin, lowScore: null, players: [] };
        }
        return { ...skin, players: newPlayers };
      });
      const updatedHole = updated.find(s => s.number === holeNumber);
      saveGiantSkinToSupabase(holeNumber, updatedHole.lowScore, updatedHole.players || []);
      return updated;
    });
  };

  const editGiantSkinType = async (holeNumber, playerId, newType) => {
    const hole = courseHoles.find(h => h.number === holeNumber);
    if (!hole) return;
    const newScore = newType === 'eagle' ? hole.par - 2 : hole.par - 1;

    setGiantSkins(prev => {
      const updated = prev.map(skin => {
        if (skin.number !== holeNumber) return skin;
        // Remove this player first
        const otherPlayers = skin.players.filter(p => p.playerId !== playerId);
        const playerEntry = skin.players.find(p => p.playerId === playerId);
        if (!playerEntry) return skin;
        const updatedEntry = { ...playerEntry, manual: playerEntry.manual || false };

        // Recalculate low score from remaining players + new entry
        let bestScore = newScore;
        let bestPlayers = [updatedEntry];

        // Check if other players still have a valid score
        for (const p of otherPlayers) {
          // Other players keep their existing score (the current lowScore)
          if (skin.lowScore < bestScore) {
            bestScore = skin.lowScore;
            bestPlayers = [p];
          } else if (skin.lowScore === bestScore) {
            bestPlayers.push(p);
          }
        }

        // If new type makes a better score, only the edited player remains
        if (newScore < skin.lowScore && otherPlayers.length > 0) {
          return { ...skin, lowScore: newScore, players: [updatedEntry] };
        } else if (newScore === skin.lowScore) {
          return { ...skin, players: [...otherPlayers, updatedEntry] };
        } else if (newScore > skin.lowScore && otherPlayers.length > 0) {
          // New type is worse, remove the player from this hole
          return { ...skin, players: otherPlayers };
        } else {
          // Only player on this hole
          return { ...skin, lowScore: newScore, players: [updatedEntry] };
        }
      });
      const updatedHole = updated.find(s => s.number === holeNumber);
      saveGiantSkinToSupabase(holeNumber, updatedHole.lowScore, updatedHole.players || []);
      return updated;
    });
  };

  // === Score management ===
  const updatePlayerScore = async (playerId, weekId, newGrossScore, newBirdieHoles = [], newEagleHoles = []) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const game = weeklyGames.find(g => g.weekId === weekId);
    const manualNetEntry = !!game?.manualNetEntry;
    const { handicap: rawHandicap9 } = getHandicapForWeek(playerId, weekId);
    const handicap9 = manualNetEntry ? 0 : rawHandicap9;
    const newNetScore = manualNetEntry ? newGrossScore : newGrossScore - handicap9;
    try {
      const { error } = await supabase.from('player_scores').update({
        gross_score: newGrossScore, net_score: newNetScore, handicap_used: handicap9,
        birdie_holes: newBirdieHoles, eagle_holes: newEagleHoles
      }).eq('player_id', playerId).eq('week_id', weekId);
      if (error) throw error;
      setPlayerScores(prev => prev.map(s =>
        s.player_id === playerId && s.week_id === weekId
          ? { ...s, gross_score: newGrossScore, net_score: newNetScore, handicap_used: handicap9, birdie_holes: newBirdieHoles, eagle_holes: newEagleHoles }
          : s
      ));
      await recalculateGiantSkins();
      setEditingScore(null);
    } catch (error) { console.error('Error updating player score:', error); }
  };

  const deletePlayerScore = async (playerId, weekId) => {
    try {
      const { error } = await supabase.from('player_scores').delete().eq('player_id', playerId).eq('week_id', weekId);
      if (error) throw error;
      setPlayerScores(prev => prev.filter(s => !(s.player_id === playerId && s.week_id === weekId)));
      await recalculateGiantSkins();
    } catch (error) { console.error('Error deleting player score:', error); }
  };

  // === Reset functions ===
  const resetSingleWeek = async (weekId) => {
    try {
      const { error: teeError } = await supabase.from('tee_sheets').delete().eq('week_id', weekId);
      if (teeError) throw teeError;
      const { error: moneyError } = await supabase.from('player_money').delete().eq('week_id', weekId);
      if (moneyError) throw moneyError;
      const { error: skinsError } = await supabase.from('giant_skins').update({ low_score: null, player_id: null, week_id: null }).eq('week_id', weekId);
      if (skinsError) throw skinsError;

      setWeeks(prevWeeks => prevWeeks.map(w => w.id === weekId ? { ...w, teeSheet: [], scoresEntered: false, moneyEntered: false, weatherCancelled: false } : w));
      setPlayers(prevPlayers => prevPlayers.map(player => {
        const weekMoney = player.weeklyMoney[weekId];
        if (!weekMoney) return player;
        const weekTotal = Object.values(weekMoney).reduce((sum, amt) => sum + amt, 0);
        const newWeeklyMoney = { ...player.weeklyMoney };
        delete newWeeklyMoney[weekId];
        return { ...player, weeklyMoney: newWeeklyMoney, totalMoney: player.totalMoney - weekTotal, weeksPlayed: Object.keys(newWeeklyMoney).length };
      }));
      setGiantSkins(prevSkins => prevSkins.map(skin => {
        if (!skin.players || skin.players.length === 0) return skin;
        const filteredPlayers = skin.players.filter(p => p.weekId !== weekId);
        if (filteredPlayers.length === 0) return { ...skin, lowScore: null, players: [] };
        if (filteredPlayers.length < skin.players.length) return { ...skin, players: filteredPlayers };
        return skin;
      }));

      const { error: scoresError } = await supabase.from('player_scores').delete().eq('week_id', weekId);
      if (scoresError) throw scoresError;
      setPlayerScores(prev => prev.filter(s => s.week_id !== weekId));
      setShowResetConfirm(null);
      setResetWeekId(null);
    } catch (error) { console.error('Error resetting week:', error); }
  };

  const resetMoneyData = async () => {
    try {
      const { error } = await supabase.from('player_money').delete().neq('id', 0);
      if (error) throw error;
      setPlayers(prevPlayers => prevPlayers.map(p => ({ ...p, totalMoney: 0, weeklyMoney: {}, weeksPlayed: 0 })));
      setWeeks(prevWeeks => prevWeeks.map(w => ({ ...w, moneyEntered: false })));
      setShowResetConfirm(null);
    } catch (error) { console.error('Error resetting money:', error); }
  };

  const resetTeeSheets = async () => {
    try {
      const { error } = await supabase.from('tee_sheets').delete().neq('id', 0);
      if (error) throw error;
      setWeeks(prevWeeks => prevWeeks.map(w => ({ ...w, teeSheet: [], scoresEntered: false, moneyEntered: false, weatherCancelled: false })));
      setShowResetConfirm(null);
    } catch (error) { console.error('Error resetting tee sheets:', error); }
  };

  const resetGiantSkins = async () => {
    try {
      const { error } = await supabase.from('giant_skins').delete().neq('id', 0);
      if (error) throw error;
      setGiantSkins(courseHoles.map(h => ({ number: h.number, par: h.par, lowScore: null, players: [] })));
      setShowResetConfirm(null);
    } catch (error) { console.error('Error resetting giant skins:', error); }
  };

  const resetPlayerScores = async () => {
    try {
      const { error } = await supabase.from('player_scores').delete().neq('id', 0);
      if (error) throw error;
      setPlayerScores([]);
      setShowResetConfirm(null);
    } catch (error) { console.error('Error resetting player scores:', error); }
  };

  const resetAllData = async () => {
    await resetMoneyData();
    await resetTeeSheets();
    await resetGiantSkins();
    await resetPlayerScores();
    setShowResetConfirm(null);
  };

  // === Player score submission ===
  const doSubmitScore = async () => {
    const { playerId, weekId, totalScore, birdieHoles, eagleHoles } = playerScoreForm;
    setIsSubmitting(true);
    const playerIdNum = parseInt(playerId);
    const weekIdNum = parseInt(weekId);
    const teamType = getTeamTypeForWeek(weekIdNum);
    const isTeamScore = teamType !== null;

    if (isTeamScore) {
      const { teammates, isSolo } = getTeammatesForWeek(playerIdNum, weekIdNum);
      const allMembers = isSolo ? [playerIdNum] : [playerIdNum, ...teammates];
      const grossScore = parseInt(totalScore);
      const { handicap: teamHcp } = getHandicapForWeek(playerIdNum, weekIdNum);

      try {
        for (const memberId of allMembers) {
          const member = players.find(p => p.id === memberId);
          if (!member) continue;
          const handicap9 = teamHcp;
          const netScore = grossScore - handicap9;
          await savePlayerScoreToSupabase(memberId, weekIdNum, grossScore, netScore, handicap9, birdieHoles, eagleHoles, true);
          setPlayerScores(prev => {
            const existingIdx = prev.findIndex(s => s.player_id === memberId && s.week_id === weekIdNum);
            const newScore = { player_id: memberId, week_id: weekIdNum, gross_score: grossScore, net_score: netScore, handicap_used: handicap9, birdie_holes: birdieHoles, eagle_holes: eagleHoles, is_team_score: true };
            if (existingIdx >= 0) { const updated = [...prev]; updated[existingIdx] = newScore; return updated; }
            return [...prev, newScore];
          });
        }
        await recalculateGiantSkins();
        setPlayerScoreForm({ playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: [], phoneInput: '' });
        setShowPlayerScoreEntry(false);
        setIsSubmitting(false);
        const memberNames = allMembers.map(id => getPlayerById(id)?.name).filter(Boolean).join(', ');
        alert(`Team score submitted for: ${memberNames}`);
      } catch (error) {
        console.error('Error saving team score:', error);
        setIsSubmitting(false);
        alert(`Failed to save score: ${error?.message || JSON.stringify(error)}`);
      }
    } else {
      const player = players.find(p => p.id === playerIdNum);
      if (!player) { setIsSubmitting(false); return; }
      const entered = parseInt(totalScore);
      const game = weeklyGames.find(g => g.weekId === weekIdNum);
      const manualNetEntry = !!game?.manualNetEntry;
      const { handicap: rawHandicap9 } = getHandicapForWeek(playerIdNum, weekIdNum);
      const handicap9 = manualNetEntry ? 0 : rawHandicap9;
      const grossScore = entered;
      const netScore = manualNetEntry ? entered : entered - handicap9;
      try {
        await savePlayerScoreToSupabase(playerIdNum, weekIdNum, grossScore, netScore, handicap9, birdieHoles, eagleHoles, false);
        setPlayerScores(prev => {
          const existingIdx = prev.findIndex(s => s.player_id === playerIdNum && s.week_id === weekIdNum);
          const newScore = { player_id: playerIdNum, week_id: weekIdNum, gross_score: grossScore, net_score: netScore, handicap_used: handicap9, birdie_holes: birdieHoles, eagle_holes: eagleHoles, is_team_score: false };
          if (existingIdx >= 0) { const updated = [...prev]; updated[existingIdx] = newScore; return updated; }
          return [...prev, newScore];
        });
        await recalculateGiantSkins();
        setPlayerScoreForm({ playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: [], phoneInput: '' });
        setShowPlayerScoreEntry(false);
        setIsSubmitting(false);
        alert('Score submitted successfully! Your gross and net scores have been recorded.');
      } catch (error) {
        console.error('Error saving score:', error);
        setIsSubmitting(false);
        alert(`Failed to save score: ${error?.message || JSON.stringify(error)}`);
      }
    }
  };

  const handlePlayerScoreSubmit = async () => {
    if (isSubmitting) return;
    const { playerId, weekId, totalScore, phoneInput } = playerScoreForm;
    if (!playerId || !weekId) { alert('Please select your name and week'); return; }
    const targetWeek = weeks.find(w => w.id === parseInt(weekId));
    if (targetWeek && targetWeek.scoreSubmissionEnabled === false) {
      alert('Score submissions are turned off for this week.');
      return;
    }
    const scoreNum = parseInt(totalScore);
    if (!totalScore || isNaN(scoreNum) || scoreNum < 1) { alert('Please enter a valid score'); return; }

    // Phone verification
    const selectedPlayer = players.find(p => p.id === parseInt(playerId));
    if (selectedPlayer) {
      const storedLast4 = (selectedPlayer.phone || '').replace(/\D/g, '').slice(-4);
      if (storedLast4 && phoneInput.trim() !== storedLast4) {
        alert('Phone verification failed. Please enter the last 4 digits of your phone number.');
        return;
      }
    }

    // Check for existing score before saving
    const playerIdNum = parseInt(playerId);
    const weekIdNum = parseInt(weekId);
    const existingScore = playerScores.find(s => s.player_id === playerIdNum && s.week_id === weekIdNum);
    if (existingScore) {
      setScoreOverwriteConfirm({ existingGrossScore: existingScore.gross_score });
      return;
    }

    await doSubmitScore();
  };

  const handleConfirmedScoreOverwrite = async () => {
    setScoreOverwriteConfirm(null);
    await doSubmitScore();
  };

  const toggleHoleSelection = (holeNum, type) => {
    const field = type === 'birdie' ? 'birdieHoles' : 'eagleHoles';
    const otherField = type === 'birdie' ? 'eagleHoles' : 'birdieHoles';
    setPlayerScoreForm(prev => {
      const currentHoles = prev[field];
      const otherHoles = prev[otherField];
      const newOtherHoles = otherHoles.filter(h => h !== holeNum);
      if (currentHoles.includes(holeNum)) {
        return { ...prev, [field]: currentHoles.filter(h => h !== holeNum), [otherField]: newOtherHoles };
      } else {
        return { ...prev, [field]: [...currentHoles, holeNum], [otherField]: newOtherHoles };
      }
    });
  };

  // === Derived values ===
  const currentWeek = weeks.find(w => w.id === selectedWeek);
  const currentGame = weeklyGames.find(g => g.weekId === selectedWeek);

  const getGameForWeek = (weekId) => weeklyGames.find(g => g.weekId === weekId);

  const getTeamTypeForWeek = (weekId) => {
    const game = weeklyGames.find(g => g.weekId === weekId);
    return game?.teamType || null;
  };

  const getTeammatesForWeek = (playerId, weekId) => {
    const week = weeks.find(w => w.id === weekId);
    const teamType = getTeamTypeForWeek(weekId);
    if (!week || !teamType || !week.teeSheet.length) return { teammates: [], teamType: null, slot: null };

    const slot = week.teeSheet.find(s => s.players.includes(playerId));
    if (!slot) return { teammates: [], teamType: null, slot: null };
    const playerIndex = slot.players.indexOf(playerId);

    if (teamType === '4-person') {
      const teammates = slot.players.filter(id => id !== playerId);
      return { teammates, teamType, slot, isThreesome: slot.players.length === 3 };
    }

    if (teamType === '2-person') {
      if (slot.players.length === 4) {
        const isTeamA = playerIndex < 2;
        const teammates = isTeamA ? [slot.players[playerIndex === 0 ? 1 : 0]] : [slot.players[playerIndex === 2 ? 3 : 2]];
        return { teammates, teamType, slot, isThreesome: false, isSolo: false };
      } else if (slot.players.length === 3) {
        if (playerIndex === 0) return { teammates: [slot.players[1]], teamType, slot, isThreesome: true, isSolo: false };
        if (playerIndex === 1) return { teammates: [slot.players[0]], teamType, slot, isThreesome: true, isSolo: false };
        return { teammates: [], teamType, slot, isThreesome: true, isSolo: true };
      } else {
        return { teammates: [], teamType, slot, isThreesome: false, isSolo: true };
      }
    }

    return { teammates: [], teamType: null, slot: null };
  };

  // Returns { handicap, isTeamHcp } to use for a player's net score on a given week.
  // When the week's game has showTeamHandicap + a teamType and the player has teammates
  // on the tee sheet, returns the team handicap computed via calcTeamHandicap from each
  // team member's 9-hole course handicap. Otherwise falls back to the player's
  // individual 9-hole handicap.
  const getHandicapForWeek = (playerId, weekId) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return { handicap: 0, isTeamHcp: false };
    const game = weeklyGames.find(g => g.weekId === weekId);
    const applyAllowance = (h) => game?.reducedHandicap ? Math.round(h * 0.8) : h;
    const individual = applyAllowance(calc9HoleHandicap(player.handicap));

    if (!game?.showTeamHandicap || !game?.teamType) {
      return { handicap: individual, isTeamHcp: false };
    }

    const { teammates, isSolo } = getTeammatesForWeek(playerId, weekId);
    if (isSolo || !teammates || teammates.length === 0) {
      return { handicap: individual, isTeamHcp: false };
    }

    const teamIds = [playerId, ...teammates];
    const teamHcps = teamIds
      .map(id => players.find(p => p.id === id))
      .filter(Boolean)
      .map(p => calc9HoleHandicap(p.handicap));

    return {
      handicap: calcTeamHandicap(teamHcps, game.handicapFormat || 'scramble'),
      isTeamHcp: true,
    };
  };

  // === Weekly game edit ===
  const loadWeeklyGameForEdit = () => {
    const game = getGameForWeek(selectedWeek);
    if (game) {
      setWeeklyGameEdit({ gameName: game.gameName, gameDescription: game.gameDescription, sideGame: game.sideGame, sideGameDescription: game.sideGameDescription, teamType: game.teamType || null, showTeamHandicap: game.showTeamHandicap || false, handicapFormat: game.handicapFormat || 'scramble', reducedHandicap: game.reducedHandicap || false });
    } else {
      setWeeklyGameEdit({ gameName: '', gameDescription: '', sideGame: '', sideGameDescription: '', teamType: null, showTeamHandicap: false, handicapFormat: 'scramble', reducedHandicap: false });
    }
    setShowWeeklyGameEditor(true);
  };

  const handleSaveWeeklyGame = async () => {
    const updatedGame = { ...weeklyGames.find(g => g.weekId === selectedWeek), ...weeklyGameEdit };
    setWeeklyGames(weeklyGames.map(g => g.weekId === selectedWeek ? updatedGame : g));
    setShowWeeklyGameEditor(false);

    // Persist to Supabase
    const { error } = await supabase.from('weekly_games').upsert({
      week_id: selectedWeek,
      game_name: updatedGame.gameName,
      game_description: updatedGame.gameDescription,
      side_game: updatedGame.sideGame,
      side_game_description: updatedGame.sideGameDescription,
      team_type: updatedGame.teamType,
      show_team_handicap: updatedGame.showTeamHandicap || false,
      handicap_format: updatedGame.handicapFormat || 'scramble',
      reduced_handicap: updatedGame.reducedHandicap || false
    }, { onConflict: 'week_id' });
    if (error) console.error('Error saving weekly game:', error);
  };

  // === Player editing ===
  const loadPlayerForEdit = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setPlayerEdit({ name: player.name, phone: player.phone, email: player.email, handicap: player.handicap, cdgaId: player.cdgaId, availability: [...player.availability], type: player.type });
      setEditingPlayerId(playerId);
      setShowPlayerEditor(true);
    }
  };

  const handleSavePlayer = async () => {
    const updatedPlayer = { ...players.find(p => p.id === editingPlayerId), ...playerEdit };
    const saved = await savePlayerToSupabase(updatedPlayer);
    if (saved) {
      setPlayers(players.map(p => p.id === editingPlayerId ? updatedPlayer : p));
      setShowPlayerEditor(false);
      setEditingPlayerId(null);
    }
  };

  const handleAddPlayer = async () => {
    if (!newPlayer.name.trim()) { alert('Player name is required'); return; }
    const maxId = players.reduce((max, p) => Math.max(max, p.id), 0);
    const player = {
      ...newPlayer,
      id: maxId + 1,
      name: newPlayer.name.trim(),
      handicap: parseFloat(newPlayer.handicap) || 0,
      weeksPlayed: 0,
      totalMoney: 0,
      weeklyMoney: {}
    };
    const saved = await savePlayerToSupabase(player);
    if (saved) {
      setPlayers(prev => [...prev, player]);
      setNewPlayer({ name: '', phone: '', email: '', handicap: 0, cdgaId: '', availability: [], type: 'full-time' });
      setShowAddPlayer(false);
    }
  };

  const handleRemovePlayer = async (playerId) => {
    const deleted = await deletePlayerFromSupabase(playerId);
    if (deleted) {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    }
    setShowRemoveConfirm(null);
  };

  const toggleNewPlayerAvailability = (time) => {
    if (newPlayer.availability.includes(time)) {
      setNewPlayer({ ...newPlayer, availability: newPlayer.availability.filter(t => t !== time) });
    } else {
      setNewPlayer({ ...newPlayer, availability: [...newPlayer.availability, time].sort((a, b) => teeTimes.indexOf(a) - teeTimes.indexOf(b)) });
    }
  };

  const toggleAvailability = (time) => {
    if (playerEdit.availability.includes(time)) {
      setPlayerEdit({ ...playerEdit, availability: playerEdit.availability.filter(t => t !== time) });
    } else {
      setPlayerEdit({ ...playerEdit, availability: [...playerEdit.availability, time].sort((a, b) => teeTimes.indexOf(a) - teeTimes.indexOf(b)) });
    }
  };

  const filteredPlayersForAdmin = players.filter(p =>
    p.name.toLowerCase().includes(playerSearchTerm.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      setPasswordError(false);
      setAdminPassword('');
    } else {
      setPasswordError(true);
    }
  };

  // === Pairing helpers ===
  const getPairingKey = (id1, id2) => [id1, id2].sort((a, b) => a - b).join('-');

  // === Auto-schedule ===

  // Fisher-Yates shuffle for randomization
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Build a pairing-count map from the actual tee sheets already saved this season.
  // This makes "mix up the pairings" reflect the real season history rather than only
  // pairings made during the current browser session.
  const computeSeasonPairingHistory = (excludeWeekIds = new Set()) => {
    const hist = {};
    weeks.forEach(w => {
      if (excludeWeekIds.has(w.id)) return;
      (w.teeSheet || []).forEach(slot => {
        const ps = slot.players || [];
        for (let i = 0; i < ps.length; i++) {
          for (let j = i + 1; j < ps.length; j++) {
            const key = getPairingKey(ps[i], ps[j]);
            hist[key] = (hist[key] || 0) + 1;
          }
        }
      });
    });
    return hist;
  };

  // Build a per-player frequency map of the tee times they've actually been scheduled at
  // so far this season: { playerId: { '4:30 PM': 3, ... } }. Used to bias each player
  // toward the times they typically play.
  const computeTimePreference = (excludeWeekIds = new Set()) => {
    const freq = {};
    weeks.forEach(w => {
      if (excludeWeekIds.has(w.id)) return;
      (w.teeSheet || []).forEach(slot => {
        (slot.players || []).forEach(pid => {
          if (!freq[pid]) freq[pid] = {};
          freq[pid][slot.time] = (freq[pid][slot.time] || 0) + 1;
        });
      });
    });
    return freq;
  };

  // Resolve the fixed-partner rule (e.g. Justin must always be grouped with one of a
  // specific set of players) against the current player list.
  const getFixedPartnerConfig = () => {
    const anchor = players.find(p => p.name === SCHEDULE_FIXED_PARTNER.anchorName);
    const allowedIds = new Set(
      SCHEDULE_FIXED_PARTNER.allowedPartnerNames
        .map(name => players.find(p => p.name === name)?.id)
        .filter(id => id != null)
    );
    return { anchorId: anchor ? anchor.id : null, allowedIds };
  };

  // Core scheduler: build a tee sheet for a single week. Pure-ish — it does not mutate
  // React state, it just returns the computed sheet plus any warning to surface.
  // basePairing: pairing-count map to score against (lets callers chain weeks together
  // so variety is maintained across a multi-week batch).
  const buildWeekTeeSheet = (weekId, basePairing, excludeForFreq = new Set([weekId])) => {
    const eligiblePlayers = players.filter(p => p.type === 'full-time');
    const teamType = getTeamTypeForWeek(weekId);
    const newTeeSheet = teeTimes.map(time => ({ time, players: [] }));
    const assigned = new Set();
    const pairCount = (a, b) => basePairing[getPairingKey(a, b)] || 0;
    const timeFreq = computeTimePreference(excludeForFreq);
    const { anchorId, allowedIds } = getFixedPartnerConfig();

    // Anchor constraint helpers: the anchor (e.g. Justin) may only ever share a tee time
    // with allowed partners, and no disallowed player may join the anchor's group. Once the
    // anchor's group has been built it's locked so nobody else can be added to it.
    let anchorSlotRef = null;
    let anchorSlotLocked = false;
    const slotHasAnchor = (slot) => anchorId != null && slot.players.includes(anchorId);
    const canJoin = (playerId, slot) => {
      if (slot.players.length >= 4) return false;
      if (anchorSlotLocked && slot === anchorSlotRef) return false;
      if (anchorId == null) return true;
      if (playerId === anchorId) {
        // Anchor can only join a slot whose current occupants are all allowed partners.
        return slot.players.every(id => allowedIds.has(id));
      }
      // A disallowed player can never join the anchor's slot.
      if (slotHasAnchor(slot) && !allowedIds.has(playerId)) return false;
      return true;
    };

    // Build the anchor's group up front so we fully control who they play with. The anchor
    // (e.g. Justin) is grouped only with allowed partners, and we greedily pick the partners
    // they've played with LEAST — and that those partners have played with each other least —
    // so the lineup rotates week to week instead of repeating the same people. The chosen
    // tee time still respects the anchor's availability and usual playing times. The group is
    // then locked so the rest of the scheduler leaves it alone.
    if (anchorId != null) {
      const anchor = eligiblePlayers.find(p => p.id === anchorId);
      if (anchor) {
        const GROUP_TARGET = 4;
        const ANCHOR_WEIGHT = 100; // weight avoiding repeats of the anchor's own pairings most
        const partnerPool = eligiblePlayers.filter(p => allowedIds.has(p.id));
        const anchorTimes = anchor.availability.filter(t => teeTimes.includes(t));

        // Pick the anchor's tee time: prefer one with enough available partners and that
        // matches the times the anchor usually plays.
        let chosenIdx = null, chosenScore = -Infinity;
        anchorTimes.forEach(time => {
          const idx = teeTimes.indexOf(time);
          const availPartners = partnerPool.filter(p => p.availability.includes(time));
          if (availPartners.length === 0) return;
          const score = Math.min(availPartners.length, GROUP_TARGET - 1) * 2
            + (timeFreq[anchorId]?.[time] || 0) * 3
            + Math.random();
          if (score > chosenScore) { chosenScore = score; chosenIdx = idx; }
        });

        if (chosenIdx != null) {
          const slot = newTeeSheet[chosenIdx];
          slot.players.push(anchorId);
          assigned.add(anchorId);
          // Greedily add the least-paired available partners, also mixing up the trio itself.
          let pool = partnerPool.filter(p => p.availability.includes(teeTimes[chosenIdx]));
          while (slot.players.length < GROUP_TARGET && pool.length > 0) {
            let bestPartner = null, bestCost = Infinity;
            shuffleArray(pool).forEach(p => {
              const cost = pairCount(p.id, anchorId) * ANCHOR_WEIGHT
                + slot.players.reduce((sum, id) => id === anchorId ? sum : sum + pairCount(p.id, id), 0);
              if (cost < bestCost) { bestCost = cost; bestPartner = p; }
            });
            slot.players.push(bestPartner.id);
            assigned.add(bestPartner.id);
            pool = pool.filter(p => p.id !== bestPartner.id);
          }
          anchorSlotRef = slot;
          anchorSlotLocked = true;
        }
      }
    }

    // Group players by availability count, shuffle within each group, then concatenate.
    // Most-constrained players (fewest available slots) are placed first,
    // but order within each constraint tier is randomized.
    const playersByConstraint = {};
    eligiblePlayers.forEach(player => {
      if (assigned.has(player.id)) return;
      const key = player.availability.length;
      if (!playersByConstraint[key]) playersByConstraint[key] = [];
      playersByConstraint[key].push(player);
    });
    const sortedPlayers = Object.keys(playersByConstraint)
      .sort((a, b) => Number(a) - Number(b))
      .flatMap(key => shuffleArray(playersByConstraint[key]));

    sortedPlayers.forEach(player => {
      const availableSlots = player.availability
        .map(time => { const idx = teeTimes.indexOf(time); return idx !== -1 ? { idx, slot: newTeeSheet[idx], time } : null; })
        .filter(s => s !== null);
      const slotsWithRoom = availableSlots.filter(s => canJoin(player.id, s.slot));

      if (slotsWithRoom.length > 0) {
        // Score each slot (lower score = better fit)
        const scoredSlots = slotsWithRoom.map(s => {
          let score = 0;
          // Capacity: prefer fuller slots on team weeks, emptier on non-team weeks
          if (teamType) {
            score += (4 - s.slot.players.length) * 10;
          } else {
            score += s.slot.players.length * 10;
          }
          // Pairing history: penalize slots with frequently-paired players
          const pairingScore = s.slot.players.reduce(
            (sum, id) => sum + pairCount(player.id, id), 0
          );
          score += pairingScore * 5;
          // Time preference: reward the times this player usually plays
          score -= (timeFreq[player.id]?.[s.time] || 0) * 3;
          return { ...s, score };
        });

        // Weighted random selection (lower score = higher weight)
        const maxScore = Math.max(...scoredSlots.map(s => s.score));
        const weights = scoredSlots.map(s => maxScore - s.score + 1);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let rand = Math.random() * totalWeight;
        let selectedIdx = 0;
        for (let i = 0; i < weights.length; i++) {
          rand -= weights[i];
          if (rand <= 0) { selectedIdx = i; break; }
        }

        scoredSlots[selectedIdx].slot.players.push(player.id);
        assigned.add(player.id);
      } else {
        // No room at a preferred time — overflow to the nearest open slot that the
        // anchor constraint still allows.
        const preferredIndices = player.availability.map(t => teeTimes.indexOf(t)).filter(i => i !== -1);
        const fitsHere = (i) => canJoin(player.id, newTeeSheet[i]);
        let assignedSlot = null;
        if (preferredIndices.length > 0) {
          const latestPreferredIdx = Math.max(...preferredIndices);
          const earliestPreferredIdx = Math.min(...preferredIndices);
          for (let i = latestPreferredIdx + 1; i < teeTimes.length; i++) { if (fitsHere(i)) { assignedSlot = newTeeSheet[i]; break; } }
          if (!assignedSlot) { for (let i = earliestPreferredIdx - 1; i >= 0; i--) { if (fitsHere(i)) { assignedSlot = newTeeSheet[i]; break; } } }
        }
        if (!assignedSlot) { for (let i = 0; i < teeTimes.length; i++) { if (fitsHere(i)) { assignedSlot = newTeeSheet[i]; break; } } }
        if (assignedSlot) { assignedSlot.players.push(player.id); assigned.add(player.id); }
      }
    });

    let warning = null;
    if (teamType) {
      const filledSlots = newTeeSheet.filter(s => s.players.length > 0);
      const threesomes = filledSlots.filter(s => s.players.length === 3);
      const foursomes = filledSlots.filter(s => s.players.length === 4);
      const others = filledSlots.filter(s => s.players.length !== 3 && s.players.length !== 4);
      // Deep copy player arrays to avoid reference mutation during reordering
      const reordered = [...foursomes, ...others, ...threesomes].map(s => [...s.players]);
      const filledIndices = newTeeSheet.reduce((acc, s, i) => s.players.length > 0 ? [...acc, i] : acc, []);
      filledIndices.forEach((slotIdx, i) => { if (i < reordered.length) newTeeSheet[slotIdx].players = reordered[i]; });
      if (threesomes.length > 0) warning = `${threesomes.length} threesome(s) were created for this team week. They have been moved to the last tee times. Consider adjusting manually.`;
    }

    return { teeSheet: newTeeSheet, warning };
  };

  // Count the pairings produced by a tee sheet (used to chain weeks together).
  const addSheetPairings = (target, teeSheet) => {
    teeSheet.forEach(slot => {
      for (let i = 0; i < slot.players.length; i++) {
        for (let j = i + 1; j < slot.players.length; j++) {
          const key = getPairingKey(slot.players[i], slot.players[j]);
          target[key] = (target[key] || 0) + 1;
        }
      }
    });
    return target;
  };

  const autoScheduleWeek = (weekIdArg) => {
    const weekId = typeof weekIdArg === 'number' ? weekIdArg : selectedWeek;
    const targetWeek = weeks.find(w => w.id === weekId);
    const basePairing = computeSeasonPairingHistory(new Set([weekId]));
    const { teeSheet, warning } = buildWeekTeeSheet(weekId, basePairing);
    if (warning) alert(`Warning: ${warning}`);

    setPairingHistory(addSheetPairings({ ...pairingHistory }, teeSheet));

    const playingIds = teeSheet.flatMap(s => s.players);
    setPlayers(players.map(p => playingIds.includes(p.id) ? { ...p, weeksPlayed: p.weeksPlayed + 1 } : p));
    setWeeks(weeks.map(w => w.id === weekId ? { ...w, teeSheet } : w));
    saveTeeSheetToSupabase(weekId, teeSheet, false, false, targetWeek?.weatherCancelled || false, targetWeek?.scoreSubmissionEnabled ?? true, targetWeek?.teeSignupEnabled ?? true);
  };

  // Auto-generate the next N upcoming weeks that haven't been scheduled yet, in one pass.
  // "Not scheduled" means the week has no tee sheet yet; weeks are processed in date order
  // and chained so pairings stay varied across the batch.
  const autoScheduleNextWeeks = (count = 4) => {
    const today = new Date().toISOString().split('T')[0];
    const targetWeeks = weeks
      .filter(w => w.date && w.date >= today && !w.scoresEntered && (w.teeSheet || []).length === 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, count);
    if (targetWeeks.length === 0) {
      alert('No upcoming unscheduled weeks found — the next weeks already have tee sheets.');
      return;
    }

    const regenIds = new Set(targetWeeks.map(w => w.id));
    // Seed variety from every OTHER week's real tee sheet, then chain the batch together.
    const runningPairing = computeSeasonPairingHistory(regenIds);
    const builtSheets = {};
    const warnings = [];

    targetWeeks.forEach(w => {
      const { teeSheet, warning } = buildWeekTeeSheet(w.id, runningPairing, regenIds);
      builtSheets[w.id] = teeSheet;
      addSheetPairings(runningPairing, teeSheet);
      if (warning) warnings.push(`Week ${w.id} (${w.date}): ${warning}`);
    });

    // Apply pairing history, weeks-played counts, and tee sheets in one batch.
    const mergedPairing = { ...pairingHistory };
    Object.values(builtSheets).forEach(sheet => addSheetPairings(mergedPairing, sheet));
    setPairingHistory(mergedPairing);

    const playedCount = {};
    Object.values(builtSheets).forEach(sheet => {
      sheet.flatMap(s => s.players).forEach(id => { playedCount[id] = (playedCount[id] || 0) + 1; });
    });
    setPlayers(players.map(p => playedCount[p.id] ? { ...p, weeksPlayed: p.weeksPlayed + playedCount[p.id] } : p));

    setWeeks(weeks.map(w => builtSheets[w.id] ? { ...w, teeSheet: builtSheets[w.id] } : w));

    targetWeeks.forEach(w => {
      saveTeeSheetToSupabase(w.id, builtSheets[w.id], false, false, w.weatherCancelled || false, w.scoreSubmissionEnabled ?? true, w.teeSignupEnabled ?? true);
    });

    const summary = `Generated tee sheets for ${targetWeeks.length} week(s): ${targetWeeks.map(w => `Week ${w.id}`).join(', ')}.`;
    alert(warnings.length ? `${summary}\n\n${warnings.join('\n')}` : summary);
  };

  // === Compact schedule (push empty slots to the end) ===
  const compactTeeSheet = () => {
    const currentWeekData = weeks.find(w => w.id === selectedWeek);
    if (!currentWeekData?.teeSheet?.length) {
      alert('No schedule found for this week.');
      return;
    }

    const filledSlots = currentWeekData.teeSheet.filter(slot => slot.players?.length > 0);

    if (filledSlots.length === 0) {
      alert('No players are scheduled this week.');
      return;
    }

    const alreadyCompact = filledSlots.every((slot, i) => slot.time === teeTimes[i]);
    if (alreadyCompact) {
      alert('Schedule is already compact — teams are already filling the earliest tee times.');
      return;
    }

    const emptyCount = Math.max(0, teeTimes.length - filledSlots.length);
    const newTeeSheet = [
      ...filledSlots.map((slot, idx) => ({ time: teeTimes[idx], players: slot.players })),
      ...Array.from({ length: emptyCount }, (_, i) => ({ time: teeTimes[filledSlots.length + i], players: [] })),
    ];

    setWeeks(weeks.map(w => w.id === selectedWeek ? { ...w, teeSheet: newTeeSheet } : w));
    saveTeeSheetToSupabase(selectedWeek, newTeeSheet, currentWeekData.scoresEntered || false, currentWeekData.moneyEntered || false, currentWeekData.weatherCancelled || false, currentWeekData.scoreSubmissionEnabled ?? true, currentWeekData.teeSignupEnabled ?? true);
    alert(`Done! ${filledSlots.length} teams now fill ${teeTimes[0]}–${teeTimes[filledSlots.length - 1]}. Open slots are at the end.`);
  };

  // === Manual schedule ===
  const loadExistingSchedule = () => {
    if (currentWeek && currentWeek.teeSheet.length > 0) {
      const existingSelections = {};
      currentWeek.teeSheet.forEach((slot, timeIdx) => {
        slot.players.forEach((playerId, slotIdx) => { existingSelections[`${timeIdx}-${slotIdx}`] = String(playerId); });
      });
      setScheduleSelections(existingSelections);
    } else { setScheduleSelections({}); }
    setShowScheduleBuilder(true);
  };

  const handleBuildSchedule = () => {
    const teeSheet = teeTimes.map((time, idx) => ({
      time,
      players: [scheduleSelections[`${idx}-0`] || null, scheduleSelections[`${idx}-1`] || null, scheduleSelections[`${idx}-2`] || null, scheduleSelections[`${idx}-3`] || null].filter(Boolean).map(id => parseInt(id))
    }));

    const newPlayerIds = teeSheet.flatMap(t => t.players);
    const existingPlayerIds = currentWeek?.teeSheet.flatMap(t => t.players) || [];
    const addedPlayers = newPlayerIds.filter(id => !existingPlayerIds.includes(id));
    const removedPlayers = existingPlayerIds.filter(id => !newPlayerIds.includes(id));

    const newPairingHistory = { ...pairingHistory };
    if (existingPlayerIds.length > 0) {
      currentWeek.teeSheet.forEach(slot => {
        for (let i = 0; i < slot.players.length; i++) {
          for (let j = i + 1; j < slot.players.length; j++) {
            const key = getPairingKey(slot.players[i], slot.players[j]);
            newPairingHistory[key] = Math.max(0, (newPairingHistory[key] || 0) - 1);
          }
        }
      });
    }
    teeSheet.forEach(slot => {
      for (let i = 0; i < slot.players.length; i++) {
        for (let j = i + 1; j < slot.players.length; j++) {
          const key = getPairingKey(slot.players[i], slot.players[j]);
          newPairingHistory[key] = (newPairingHistory[key] || 0) + 1;
        }
      }
    });
    setPairingHistory(newPairingHistory);

    setWeeks(weeks.map(w => w.id === selectedWeek ? { ...w, teeSheet } : w));
    saveTeeSheetToSupabase(selectedWeek, teeSheet, currentWeek?.scoresEntered || false, currentWeek?.moneyEntered || false, currentWeek?.weatherCancelled || false, currentWeek?.scoreSubmissionEnabled ?? true, currentWeek?.teeSignupEnabled ?? true);

    setPlayers(players.map(p => {
      if (addedPlayers.includes(p.id)) return { ...p, weeksPlayed: p.weeksPlayed + 1 };
      if (removedPlayers.includes(p.id)) return { ...p, weeksPlayed: Math.max(0, p.weeksPlayed - 1) };
      return p;
    }));

    setShowScheduleBuilder(false);
    setScheduleSelections({});
  };

  // === Payout tracker helpers ===
  const fullTimePlayers = players.filter(p => p.type === 'full-time');
  const seasonBudget = seasonBuyIn * fullTimePlayers.length;

  const getTemplateById = (templateId) => payoutTemplates.find(t => t.id === templateId);

  const getWeekPlannedPayout = (weekId) => {
    const templateId = weekTemplateAssignments[weekId];
    if (!templateId) return 0;
    const template = getTemplateById(templateId);
    if (!template) return 0;
    return template.payouts.reduce((sum, p) => sum + p.amount, 0) + (template.sideGameTotal || 0);
  };

  const totalPlannedPayouts = Object.keys(weekTemplateAssignments).reduce((sum, weekId) => {
    return sum + getWeekPlannedPayout(parseInt(weekId));
  }, 0);

  const totalActualPayouts = players.reduce((sum, p) => sum + p.totalMoney, 0);

  const remainingBudget = seasonBudget - totalActualPayouts;

  const handleUpdateBuyIn = async (newBuyIn) => {
    setSeasonBuyIn(newBuyIn);
    await saveLeagueSettings(newBuyIn);
  };

  const handleSavePayoutTemplate = async (template) => {
    const updated = payoutTemplates.some(t => t.id === template.id)
      ? payoutTemplates.map(t => t.id === template.id ? template : t)
      : [...payoutTemplates, template];
    setPayoutTemplates(updated);
    await savePayoutTemplatesData(updated);
  };

  const handleDeletePayoutTemplate = async (templateId) => {
    const inUse = Object.values(weekTemplateAssignments).includes(templateId);
    if (inUse) {
      alert('Cannot delete a template that is assigned to a week. Unassign it first.');
      return;
    }
    const updated = payoutTemplates.filter(t => t.id !== templateId);
    setPayoutTemplates(updated);
    await savePayoutTemplatesData(updated);
  };

  const handleAssignTemplateToWeek = async (weekId, templateId) => {
    const updated = { ...weekTemplateAssignments, [weekId]: templateId || null };
    if (!templateId) delete updated[weekId];
    setWeekTemplateAssignments(updated);
    await saveWeekTemplateAssignments(updated);
  };

  const getTemplateMoneyEntries = (weekId) => {
    const templateId = weekTemplateAssignments[weekId];
    if (!templateId) return null;
    const template = getTemplateById(templateId);
    if (!template) return null;
    return template;
  };

  // Stable, dash-free money-entry key for a single payout row. Falls back to the
  // payout's category so existing (single-category) templates keep their data.
  const payoutEntryKey = (payout) => payout.key || payout.category;

  // Give every payout in a template a unique, dash-free entry key so that rows
  // sharing a category (e.g. several "1st place" hole prizes) stay independent
  // instead of all writing to the same slot. Explicit keys are preserved; the
  // first row of a category keeps that category as its key (backward compatible
  // with already-entered money) and later duplicates get a numeric suffix. The
  // result is deterministic for a given payout order, so the entry form, the
  // displays, and saved money all agree.
  const assignPayoutKeys = (payouts = []) => {
    const used = new Set();
    return payouts.map(p => {
      let key = (payoutEntryKey(p) || 'payout').replace(/-/g, '');
      if (used.has(key)) {
        let n = 2;
        while (used.has(`${key}${n}`)) n++;
        key = `${key}${n}`;
      }
      used.add(key);
      return { ...p, key };
    });
  };

  // The list of main-game payouts to enter/display for a week, taken from the
  // week's assigned template, each normalized to carry a unique entry key.
  // Returns [] when no template is assigned.
  const getWeekPayouts = (weekId) => {
    const template = getTemplateMoneyEntries(weekId);
    return template ? assignPayoutKeys(template.payouts) : [];
  };

  // Resolve a human-readable label for a stored money category key on a given
  // week: prefer the assigned template's payout label, then a known money
  // category name, then the raw key.
  const getPayoutLabel = (weekId, categoryKey) => {
    const match = getWeekPayouts(weekId).find(p => payoutEntryKey(p) === categoryKey);
    if (match) return match.label;
    const cat = moneyCategories.find(c => c.id === categoryKey);
    return cat ? cat.name : categoryKey;
  };

  // === Money entry ===
  const handleEnterMoney = async () => {
    const weekObj = weeks.find(w => w.id === selectedWeek);
    const { error: deleteError } = await supabase.from('player_money').delete().eq('week_id', selectedWeek);
    if (deleteError) { console.error('Error clearing existing money:', deleteError); alert('Failed to update money entries. Please try again.'); return; }

    const updatedPlayers = players.map(p => {
      const newPlayer = { ...p, weeklyMoney: { ...p.weeklyMoney }, totalMoney: p.totalMoney };
      if (newPlayer.weeklyMoney[selectedWeek]) {
        const oldTotal = Object.values(newPlayer.weeklyMoney[selectedWeek]).reduce((a, b) => a + b, 0);
        newPlayer.totalMoney -= oldTotal;
        const { [selectedWeek]: _, ...restMoney } = newPlayer.weeklyMoney;
        newPlayer.weeklyMoney = restMoney;
      }
      return newPlayer;
    });

    const saveErrors = [];
    for (const [key, amount] of Object.entries(moneyEntries)) {
      // Key is `${playerId}-${categoryKey}`; both parts are dash-free, so the
      // split yields exactly the player id and the payout's category key.
      const [playerId, category] = key.split('-');
      const playerIdx = updatedPlayers.findIndex(p => p.id === parseInt(playerId));
      if (playerIdx !== -1 && amount) {
        const amountNum = parseFloat(amount);
        updatedPlayers[playerIdx] = {
          ...updatedPlayers[playerIdx],
          totalMoney: updatedPlayers[playerIdx].totalMoney + amountNum,
          weeklyMoney: {
            ...updatedPlayers[playerIdx].weeklyMoney,
            [selectedWeek]: { ...(updatedPlayers[playerIdx].weeklyMoney[selectedWeek] || {}), [category]: amountNum }
          }
        };
        const err = await saveMoneyToSupabase(parseInt(playerId), selectedWeek, category, amountNum);
        if (err) saveErrors.push(err);
      }
    }

    setPlayers(updatedPlayers);

    if (saveErrors.length > 0) {
      const first = saveErrors[0];
      alert(
        `${saveErrors.length} payout entr${saveErrors.length === 1 ? 'y' : 'ies'} could not be saved to the database, so this week was not marked complete.\n\n` +
        `Error: ${first.message || JSON.stringify(first)}\n\n` +
        `If this mentions the "category" column or a check/enum constraint, the player_money table's category column needs to allow custom values. ` +
        `Your entries are still on screen so you can retry after fixing it.`
      );
      return;
    }

    setWeeks(weeks.map(w => w.id === selectedWeek ? { ...w, moneyEntered: true } : w));
    saveTeeSheetToSupabase(selectedWeek, weekObj?.teeSheet || [], weekObj?.scoresEntered || false, true, weekObj?.weatherCancelled || false, weekObj?.scoreSubmissionEnabled ?? true, weekObj?.teeSignupEnabled ?? true);
    setShowMoneyEntry(false);
    setMoneyEntries({});
  };

  // === Utility functions ===
  const getPlayerById = (id) => players.find(p => p.id === id);

  const loadMoneyForEdit = () => {
    const entries = {};
    players.forEach(p => {
      const weekMoney = p.weeklyMoney[selectedWeek];
      if (weekMoney) {
        Object.entries(weekMoney).forEach(([category, amount]) => { entries[`${p.id}-${category}`] = String(amount); });
      }
    });
    setMoneyEntries(entries);
    setShowMoneyEntry(true);
  };

  const getPlayersForWeek = (weekId) => {
    const week = weeks.find(w => w.id === weekId);
    if (!week || !week.teeSheet.length) return [];
    return week.teeSheet.flatMap(t => t.players);
  };

  const getWeeklyMoneyTotal = (weekId) => {
    return players.reduce((sum, p) => {
      const weekMoney = p.weeklyMoney[weekId];
      if (!weekMoney) return sum;
      return sum + Object.values(weekMoney).reduce((a, b) => a + b, 0);
    }, 0);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const sortedByMoney = [...players].sort((a, b) => b.totalMoney - a.totalMoney);

  const filteredPlayers = players.filter(p => {
    if (playerFilter === 'all') return true;
    return p.type === playerFilter;
  });

  const assignedPlayerIds = Object.values(scheduleSelections).filter(Boolean).map(id => parseInt(id));

  const getAvailablePlayersForTime = (time) => {
    return players.filter(p => p.availability.includes(time) && (p.type === 'full-time' || !assignedPlayerIds.includes(p.id)));
  };

  const value = {
    // State
    players, setPlayers, weeks, setWeeks, selectedWeek, setSelectedWeek,
    selectedPlayer, setSelectedPlayer, giantSkins, setGiantSkins,
    pairingHistory, setPairingHistory,
    showScheduleBuilder, setShowScheduleBuilder, showMoneyEntry, setShowMoneyEntry,
    scheduleSelections, setScheduleSelections, moneyEntries, setMoneyEntries,
    dragPlayer, setDragPlayer, dragOverSlot, setDragOverSlot,
    weeklyGames, setWeeklyGames, showWeeklyGameEditor, setShowWeeklyGameEditor,
    weeklyGameEdit, setWeeklyGameEdit,
    showPlayerEditor, setShowPlayerEditor, editingPlayerId, setEditingPlayerId,
    playerEdit, setPlayerEdit, playerSearchTerm, setPlayerSearchTerm,
    showAddPlayer, setShowAddPlayer, newPlayer, setNewPlayer,
    showRemoveConfirm, setShowRemoveConfirm,
    isAdminAuthenticated, setIsAdminAuthenticated, adminPassword, setAdminPassword,
    passwordError, setPasswordError,
    playerFilter, setPlayerFilter, leaderboardView, setLeaderboardView,
    isLoading,
    showPlayerScoreEntry, setShowPlayerScoreEntry, playerScoreForm, setPlayerScoreForm,
    playerScores, setPlayerScores, isSubmitting,
    showScoreManager, setShowScoreManager, editingScore, setEditingScore,
    scoreManagerWeek, setScoreManagerWeek, adminAddScore, setAdminAddScore,
    showGiantSkinsManager, setShowGiantSkinsManager, giantSkinsAddForm, setGiantSkinsAddForm,
    showSubSignup, setShowSubSignup, subSignupSlot, setSubSignupSlot, selectedSubId, setSelectedSubId, signupPhoneInput, setSignupPhoneInput,
    showRemoveFromTeeTime, setShowRemoveFromTeeTime, removeFromTeeTimeInfo, setRemoveFromTeeTimeInfo, removePhoneInput, setRemovePhoneInput,
    showResetConfirm, setShowResetConfirm, resetWeekId, setResetWeekId,
    scoreOverwriteConfirm, setScoreOverwriteConfirm,
    // Payout tracker state
    seasonBuyIn, setSeasonBuyIn, payoutTemplates, setPayoutTemplates,
    weekTemplateAssignments, setWeekTemplateAssignments,
    showBudgetDashboard, setShowBudgetDashboard,
    showTemplateManager, setShowTemplateManager,
    editingTemplate, setEditingTemplate,

    // Derived
    currentWeek, currentGame, sortedByMoney, filteredPlayers, filteredPlayersForAdmin, assignedPlayerIds,
    // Payout tracker derived
    seasonBudget, totalPlannedPayouts, totalActualPayouts, remainingBudget, fullTimePlayers,

    // Functions
    refreshData, saveTeeSheetToSupabase, saveMoneyToSupabase, saveGiantSkinToSupabase, savePlayerScoreToSupabase,
    toggleWeatherCancelled, setScoreSubmissionEnabled, setTeeSignupEnabled,
    handleSubSignup, handleRemoveFromTeeTime, recalculateGiantSkins, updatePlayerScore, deletePlayerScore,
    addPlayerToGiantSkin, removePlayerFromGiantSkin, editGiantSkinType,
    resetSingleWeek, resetMoneyData, resetTeeSheets, resetGiantSkins, resetPlayerScores, resetAllData,
    handlePlayerScoreSubmit, handleConfirmedScoreOverwrite, toggleHoleSelection,
    getGameForWeek, getTeamTypeForWeek, getTeammatesForWeek, getHandicapForWeek,
    loadWeeklyGameForEdit, handleSaveWeeklyGame,
    loadPlayerForEdit, handleSavePlayer, toggleAvailability,
    handleAddPlayer, handleRemovePlayer, toggleNewPlayerAvailability,
    handleAdminLogin,
    autoScheduleWeek, autoScheduleNextWeeks, compactTeeSheet, loadExistingSchedule, handleBuildSchedule,
    handleEnterMoney, loadMoneyForEdit,
    getPlayerById, getPlayersForWeek, getWeeklyMoneyTotal,
    formatDate, formatShortDate,
    getAvailablePlayersForTime,
    // Payout tracker functions
    handleUpdateBuyIn, handleSavePayoutTemplate, handleDeletePayoutTemplate,
    handleAssignTemplateToWeek, getTemplateById, getWeekPlannedPayout,
    getTemplateMoneyEntries, getWeekPayouts, getPayoutLabel, payoutEntryKey,
  };

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}
