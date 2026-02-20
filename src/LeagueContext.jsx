import React, { useState, useEffect, createContext, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from './supabaseClient';
import {
  initialPlayers, calc9HoleHandicap, generateSeasonWeeks,
  teeTimes, courseHoles, moneyCategories, initialWeeklyGames, ADMIN_PASSWORD
} from './constants';

const LeagueContext = createContext(null);

export function useLeague() {
  const ctx = useContext(LeagueContext);
  if (!ctx) throw new Error('useLeague must be used within a LeagueProvider');
  return ctx;
}

export function LeagueProvider({ children }) {
  const location = useLocation();

  const [players, setPlayers] = useState(initialPlayers);
  const [weeks, setWeeks] = useState(generateSeasonWeeks());
  const [selectedWeek, setSelectedWeek] = useState(1);
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
    gameName: '', gameDescription: '', sideGame: '', sideGameDescription: '', teamType: null
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
    playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: []
  });

  const [playerScores, setPlayerScores] = useState([]);

  // Score management state (admin)
  const [showScoreManager, setShowScoreManager] = useState(false);
  const [editingScore, setEditingScore] = useState(null);
  const [scoreManagerWeek, setScoreManagerWeek] = useState(1);
  const [adminAddScore, setAdminAddScore] = useState({ playerId: '', grossScore: '', birdieHoles: [], eagleHoles: [] });

  // Sub signup state
  const [showSubSignup, setShowSubSignup] = useState(false);
  const [subSignupSlot, setSubSignupSlot] = useState(null);
  const [selectedSubId, setSelectedSubId] = useState('');

  // Reset state
  const [showResetConfirm, setShowResetConfirm] = useState(null);
  const [resetWeekId, setResetWeekId] = useState(null);

  // Load data from Supabase on mount
  useEffect(() => {
    async function loadData() {
      try {
        const { data: teeSheetData, error: teeSheetError } = await supabase
          .from('tee_sheets').select('*');
        if (teeSheetError) throw teeSheetError;

        if (teeSheetData && teeSheetData.length > 0) {
          setWeeks(prevWeeks => prevWeeks.map(week => {
            const savedSheet = teeSheetData.find(ts => ts.week_id === week.id);
            if (savedSheet) {
              return { ...week, teeSheet: savedSheet.tee_sheet || [], scoresEntered: savedSheet.scores_entered || false, moneyEntered: savedSheet.money_entered || false };
            }
            return week;
          }));
        }

        const { data: moneyData, error: moneyError } = await supabase
          .from('player_money').select('*');
        if (moneyError) throw moneyError;

        if (moneyData && moneyData.length > 0) {
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
        if (skinsError) throw skinsError;

        if (skinsData && skinsData.length > 0) {
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
        if (scoresError) throw scoresError;
        if (scoresData && scoresData.length > 0) setPlayerScores(scoresData);

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
            return { ...week, teeSheet: savedSheet.tee_sheet || [], scoresEntered: savedSheet.scores_entered || false, moneyEntered: savedSheet.money_entered || false };
          }
          return week;
        }));
      }

      const { data: moneyData } = await supabase.from('player_money').select('*');
      if (moneyData && moneyData.length > 0) {
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
    } catch (error) {
      console.error('Error refreshing data:', error);
    }
  };

  useEffect(() => {
    if (!isLoading) refreshData();
  }, [location.pathname]);

  // === Supabase save helpers ===
  const saveTeeSheetToSupabase = async (weekId, teeSheet, scoresEntered = false, moneyEntered = false) => {
    try {
      const { error } = await supabase.from('tee_sheets').upsert({
        week_id: weekId, tee_sheet: teeSheet, scores_entered: scoresEntered, money_entered: moneyEntered
      }, { onConflict: 'week_id' });
      if (error) throw error;
    } catch (error) { console.error('Error saving tee sheet:', error); }
  };

  const saveMoneyToSupabase = async (playerId, weekId, category, amount) => {
    try {
      const { error } = await supabase.from('player_money').upsert({
        player_id: playerId, week_id: weekId, category, amount
      }, { onConflict: 'player_id,week_id,category' });
      if (error) throw error;
    } catch (error) { console.error('Error saving money:', error); }
  };

  const saveGiantSkinToSupabase = async (holeNumber, lowScore, players) => {
    try {
      const { error } = await supabase.from('giant_skins').upsert({
        hole_number: holeNumber, low_score: lowScore, players
      }, { onConflict: 'hole_number' });
      if (error) throw error;
    } catch (error) { console.error('Error saving giant skin:', error); }
  };

  const savePlayerScoreToSupabase = async (playerId, weekId, grossScore, netScore, handicapUsed, birdieHoles = [], eagleHoles = [], isTeamScore = false) => {
    try {
      const { error } = await supabase.from('player_scores').upsert({
        player_id: playerId, week_id: weekId, gross_score: grossScore, net_score: netScore,
        handicap_used: handicapUsed, birdie_holes: birdieHoles, eagle_holes: eagleHoles, is_team_score: isTeamScore
      }, { onConflict: 'player_id,week_id' });
      if (error) throw error;
    } catch (error) { console.error('Error saving player score:', error); }
  };

  // === Sub signup ===
  const handleSubSignup = async () => {
    if (!subSignupSlot || !selectedSubId) return;
    const { weekId, slotIndex } = subSignupSlot;
    const subId = parseInt(selectedSubId);
    const week = weeks.find(w => w.id === weekId);
    if (!week) return;

    const updatedTeeSheet = week.teeSheet.map((slot, idx) => {
      if (idx === slotIndex) return { ...slot, players: [...slot.players, subId] };
      return slot;
    });

    setWeeks(weeks.map(w => w.id === weekId ? { ...w, teeSheet: updatedTeeSheet } : w));
    await saveTeeSheetToSupabase(weekId, updatedTeeSheet, week.scoresEntered || false, week.moneyEntered || false);
    setShowSubSignup(false);
    setSubSignupSlot(null);
    setSelectedSubId('');
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

      const updatedGiantSkins = courseHoles.map(hole => {
        const best = holeBestScores[hole.number];
        if (best) return { ...hole, lowScore: best.lowScore, players: best.players };
        return { ...hole, lowScore: null, players: [] };
      });

      for (const skin of updatedGiantSkins) {
        await saveGiantSkinToSupabase(skin.number, skin.lowScore, skin.players || []);
      }
      setGiantSkins(updatedGiantSkins);
    } catch (error) { console.error('Error recalculating giant skins:', error); }
  };

  // === Score management ===
  const updatePlayerScore = async (playerId, weekId, newGrossScore, newBirdieHoles = [], newEagleHoles = []) => {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const handicap9 = calc9HoleHandicap(player.handicap);
    const newNetScore = newGrossScore - handicap9;
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

      setWeeks(prevWeeks => prevWeeks.map(w => w.id === weekId ? { ...w, teeSheet: [], scoresEntered: false, moneyEntered: false } : w));
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
      setWeeks(prevWeeks => prevWeeks.map(w => ({ ...w, teeSheet: [], scoresEntered: false, moneyEntered: false })));
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
  const handlePlayerScoreSubmit = async () => {
    const { playerId, weekId, totalScore, birdieHoles, eagleHoles } = playerScoreForm;
    if (!playerId || !weekId) { alert('Please select your name and week'); return; }
    const scoreNum = parseInt(totalScore);
    if (!totalScore || isNaN(scoreNum) || scoreNum < 1) { alert('Please enter a valid score'); return; }

    const playerIdNum = parseInt(playerId);
    const weekIdNum = parseInt(weekId);
    const teamType = getTeamTypeForWeek(weekIdNum);
    const isTeamScore = teamType !== null;

    if (isTeamScore) {
      const { teammates, isSolo } = getTeammatesForWeek(playerIdNum, weekIdNum);
      const allMembers = isSolo ? [playerIdNum] : [playerIdNum, ...teammates];
      const grossScore = parseInt(totalScore);

      for (const memberId of allMembers) {
        const member = players.find(p => p.id === memberId);
        if (!member) continue;
        const handicap9 = calc9HoleHandicap(member.handicap);
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
      setPlayerScoreForm({ playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: [] });
      setShowPlayerScoreEntry(false);
      const memberNames = allMembers.map(id => getPlayerById(id)?.name).filter(Boolean).join(', ');
      alert(`Team score submitted for: ${memberNames}`);
    } else {
      const player = players.find(p => p.id === playerIdNum);
      if (!player) return;
      const grossScore = parseInt(totalScore);
      const handicap9 = calc9HoleHandicap(player.handicap);
      const netScore = grossScore - handicap9;
      await savePlayerScoreToSupabase(playerIdNum, weekIdNum, grossScore, netScore, handicap9, birdieHoles, eagleHoles, false);
      setPlayerScores(prev => {
        const existingIdx = prev.findIndex(s => s.player_id === playerIdNum && s.week_id === weekIdNum);
        const newScore = { player_id: playerIdNum, week_id: weekIdNum, gross_score: grossScore, net_score: netScore, handicap_used: handicap9, birdie_holes: birdieHoles, eagle_holes: eagleHoles, is_team_score: false };
        if (existingIdx >= 0) { const updated = [...prev]; updated[existingIdx] = newScore; return updated; }
        return [...prev, newScore];
      });
      await recalculateGiantSkins();
      setPlayerScoreForm({ playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: [] });
      setShowPlayerScoreEntry(false);
      alert('Score submitted successfully! Your gross and net scores have been recorded.');
    }
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

  // === Weekly game edit ===
  const loadWeeklyGameForEdit = () => {
    const game = getGameForWeek(selectedWeek);
    if (game) {
      setWeeklyGameEdit({ gameName: game.gameName, gameDescription: game.gameDescription, sideGame: game.sideGame, sideGameDescription: game.sideGameDescription, teamType: game.teamType || null });
    } else {
      setWeeklyGameEdit({ gameName: '', gameDescription: '', sideGame: '', sideGameDescription: '', teamType: null });
    }
    setShowWeeklyGameEditor(true);
  };

  const handleSaveWeeklyGame = () => {
    setWeeklyGames(weeklyGames.map(g => g.weekId === selectedWeek ? { ...g, ...weeklyGameEdit } : g));
    setShowWeeklyGameEditor(false);
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

  const handleSavePlayer = () => {
    setPlayers(players.map(p => p.id === editingPlayerId ? { ...p, ...playerEdit } : p));
    setShowPlayerEditor(false);
    setEditingPlayerId(null);
  };

  const handleAddPlayer = () => {
    if (!newPlayer.name.trim()) { alert('Player name is required'); return; }
    const maxId = players.reduce((max, p) => Math.max(max, p.id), 0);
    const player = {
      ...newPlayer,
      id: maxId + 1,
      name: newPlayer.name.trim(),
      handicap: parseInt(newPlayer.handicap) || 0,
      weeksPlayed: 0,
      totalMoney: 0,
      weeklyMoney: {}
    };
    setPlayers(prev => [...prev, player]);
    setNewPlayer({ name: '', phone: '', email: '', handicap: 0, cdgaId: '', availability: [], type: 'full-time' });
    setShowAddPlayer(false);
  };

  const handleRemovePlayer = (playerId) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
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
  const getPairingCount = (id1, id2) => pairingHistory[getPairingKey(id1, id2)] || 0;

  // === Auto-schedule ===
  const autoScheduleWeek = () => {
    const eligiblePlayers = players.filter(p => p.type === 'full-time');
    const teamType = getTeamTypeForWeek(selectedWeek);
    const newTeeSheet = teeTimes.map(time => ({ time, players: [] }));
    const assigned = new Set();

    const sortedPlayers = [...eligiblePlayers].sort((a, b) => {
      if (a.availability.length !== b.availability.length) return a.availability.length - b.availability.length;
      return a.handicap - b.handicap;
    });

    sortedPlayers.forEach(player => {
      const availableSlots = player.availability
        .map(time => { const idx = teeTimes.indexOf(time); return idx !== -1 ? { idx, slot: newTeeSheet[idx], time } : null; })
        .filter(s => s !== null);
      const slotsWithRoom = availableSlots.filter(s => s.slot.players.length < 4);

      if (slotsWithRoom.length > 0) {
        slotsWithRoom.sort((a, b) => {
          if (teamType) {
            const capacityDiff = b.slot.players.length - a.slot.players.length;
            if (capacityDiff !== 0) return capacityDiff;
          } else {
            const capacityDiff = a.slot.players.length - b.slot.players.length;
            if (capacityDiff !== 0) return capacityDiff;
          }
          const scoreA = a.slot.players.reduce((sum, id) => sum + getPairingCount(player.id, id), 0);
          const scoreB = b.slot.players.reduce((sum, id) => sum + getPairingCount(player.id, id), 0);
          return scoreA - scoreB;
        });
        slotsWithRoom[0].slot.players.push(player.id);
        assigned.add(player.id);
      } else {
        const preferredIndices = player.availability.map(t => teeTimes.indexOf(t)).filter(i => i !== -1);
        if (preferredIndices.length === 0) {
          const anySlot = newTeeSheet.find(s => s.players.length < 4);
          if (anySlot) { anySlot.players.push(player.id); assigned.add(player.id); }
          return;
        }
        const latestPreferredIdx = Math.max(...preferredIndices);
        const earliestPreferredIdx = Math.min(...preferredIndices);
        let assignedSlot = null;
        for (let i = latestPreferredIdx + 1; i < teeTimes.length; i++) { if (newTeeSheet[i].players.length < 4) { assignedSlot = newTeeSheet[i]; break; } }
        if (!assignedSlot) { for (let i = earliestPreferredIdx - 1; i >= 0; i--) { if (newTeeSheet[i].players.length < 4) { assignedSlot = newTeeSheet[i]; break; } } }
        if (!assignedSlot) assignedSlot = newTeeSheet.find(s => s.players.length < 4);
        if (assignedSlot) { assignedSlot.players.push(player.id); assigned.add(player.id); }
      }
    });

    if (teamType) {
      const filledSlots = newTeeSheet.filter(s => s.players.length > 0);
      const threesomes = filledSlots.filter(s => s.players.length === 3);
      const foursomes = filledSlots.filter(s => s.players.length === 4);
      const others = filledSlots.filter(s => s.players.length !== 3 && s.players.length !== 4);
      const reordered = [...foursomes, ...others, ...threesomes];
      const filledIndices = newTeeSheet.reduce((acc, s, i) => s.players.length > 0 ? [...acc, i] : acc, []);
      filledIndices.forEach((slotIdx, i) => { if (i < reordered.length) newTeeSheet[slotIdx].players = reordered[i].players; });
      if (threesomes.length > 0) alert(`Warning: ${threesomes.length} threesome(s) were created for this team week. They have been moved to the last tee times. Consider adjusting manually.`);
    }

    const newPairingHistory = { ...pairingHistory };
    newTeeSheet.forEach(slot => {
      for (let i = 0; i < slot.players.length; i++) {
        for (let j = i + 1; j < slot.players.length; j++) {
          const key = getPairingKey(slot.players[i], slot.players[j]);
          newPairingHistory[key] = (newPairingHistory[key] || 0) + 1;
        }
      }
    });
    setPairingHistory(newPairingHistory);

    const playingIds = newTeeSheet.flatMap(s => s.players);
    setPlayers(players.map(p => playingIds.includes(p.id) ? { ...p, weeksPlayed: p.weeksPlayed + 1 } : p));
    setWeeks(weeks.map(w => w.id === selectedWeek ? { ...w, teeSheet: newTeeSheet } : w));
    saveTeeSheetToSupabase(selectedWeek, newTeeSheet, false, false);
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
    saveTeeSheetToSupabase(selectedWeek, teeSheet, currentWeek?.scoresEntered || false, currentWeek?.moneyEntered || false);

    setPlayers(players.map(p => {
      if (addedPlayers.includes(p.id)) return { ...p, weeksPlayed: p.weeksPlayed + 1 };
      if (removedPlayers.includes(p.id)) return { ...p, weeksPlayed: Math.max(0, p.weeksPlayed - 1) };
      return p;
    }));

    setShowScheduleBuilder(false);
    setScheduleSelections({});
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

    for (const [key, amount] of Object.entries(moneyEntries)) {
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
        await saveMoneyToSupabase(parseInt(playerId), selectedWeek, category, amountNum);
      }
    }

    setPlayers(updatedPlayers);
    setWeeks(weeks.map(w => w.id === selectedWeek ? { ...w, moneyEntered: true } : w));
    saveTeeSheetToSupabase(selectedWeek, weekObj?.teeSheet || [], weekObj?.scoresEntered || false, true);
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
    playerScores, setPlayerScores,
    showScoreManager, setShowScoreManager, editingScore, setEditingScore,
    scoreManagerWeek, setScoreManagerWeek, adminAddScore, setAdminAddScore,
    showSubSignup, setShowSubSignup, subSignupSlot, setSubSignupSlot, selectedSubId, setSelectedSubId,
    showResetConfirm, setShowResetConfirm, resetWeekId, setResetWeekId,

    // Derived
    currentWeek, currentGame, sortedByMoney, filteredPlayers, filteredPlayersForAdmin, assignedPlayerIds,

    // Functions
    refreshData, saveTeeSheetToSupabase, saveMoneyToSupabase, saveGiantSkinToSupabase, savePlayerScoreToSupabase,
    handleSubSignup, recalculateGiantSkins, updatePlayerScore, deletePlayerScore,
    resetSingleWeek, resetMoneyData, resetTeeSheets, resetGiantSkins, resetPlayerScores, resetAllData,
    handlePlayerScoreSubmit, toggleHoleSelection,
    getGameForWeek, getTeamTypeForWeek, getTeammatesForWeek,
    loadWeeklyGameForEdit, handleSaveWeeklyGame,
    loadPlayerForEdit, handleSavePlayer, toggleAvailability,
    handleAddPlayer, handleRemovePlayer, toggleNewPlayerAvailability,
    handleAdminLogin,
    autoScheduleWeek, loadExistingSchedule, handleBuildSchedule,
    handleEnterMoney, loadMoneyForEdit,
    getPlayerById, getPlayersForWeek, getWeeklyMoneyTotal,
    formatDate, formatShortDate,
    getAvailablePlayersForTime,
  };

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>;
}
