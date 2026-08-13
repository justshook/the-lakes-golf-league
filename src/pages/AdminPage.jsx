import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLeague } from '../LeagueContext';
import { calc9HoleHandicap, calcTeamHandicap, teeTimes, courseHoles, moneyCategories, defaultPayoutTemplates } from '../constants';
import { jsPDF } from 'jspdf';
import exportScorecardsPdf from '../utils/exportScorecards';

export default function AdminPage() {
  const {
    players, weeks, selectedWeek, setSelectedWeek,
    currentWeek, currentGame,
    isAdminAuthenticated, setIsAdminAuthenticated,
    adminPassword, setAdminPassword, passwordError, setPasswordError,
    handleAdminLogin,
    // Schedule builder
    showScheduleBuilder, setShowScheduleBuilder,
    scheduleSelections, setScheduleSelections,
    dragPlayer, setDragPlayer, dragOverSlot, setDragOverSlot,
    assignedPlayerIds,
    autoScheduleWeek, autoScheduleNextWeeks, compactTeeSheet, loadExistingSchedule, handleBuildSchedule,
    // Money entry
    showMoneyEntry, setShowMoneyEntry,
    moneyEntries, setMoneyEntries,
    handleEnterMoney, loadMoneyForEdit,
    getTeamTypeForWeek, getPlayersForWeek, getPlayerById,
    // Score management
    showScoreManager, setShowScoreManager,
    editingScore, setEditingScore,
    scoreManagerWeek, setScoreManagerWeek,
    adminAddScore, setAdminAddScore,
    playerScores, setPlayerScores,
    savePlayerScoreToSupabase, recalculateGiantSkins,
    updatePlayerScore, deletePlayerScore, recountWeekAsGross,
    getTeammatesForWeek, getHandicapForWeek, getGameForWeek,
    // Weekly games
    showWeeklyGameEditor, setShowWeeklyGameEditor,
    weeklyGameEdit, setWeeklyGameEdit,
    loadWeeklyGameForEdit, handleSaveWeeklyGame,
    // Player management
    showPlayerEditor, setShowPlayerEditor,
    editingPlayerId, setEditingPlayerId,
    playerEdit, setPlayerEdit,
    playerSearchTerm, setPlayerSearchTerm,
    filteredPlayersForAdmin,
    loadPlayerForEdit, handleSavePlayer, toggleAvailability,
    showAddPlayer, setShowAddPlayer, newPlayer, setNewPlayer,
    showRemoveConfirm, setShowRemoveConfirm,
    handleAddPlayer, handleRemovePlayer, toggleNewPlayerAvailability,
    // Giant Skins management
    giantSkins, showGiantSkinsManager, setShowGiantSkinsManager,
    giantSkinsAddForm, setGiantSkinsAddForm,
    addPlayerToGiantSkin, removePlayerFromGiantSkin, editGiantSkinType,
    // Reset
    showResetConfirm, setShowResetConfirm,
    resetWeekId, setResetWeekId,
    resetSingleWeek, resetMoneyData, resetTeeSheets, resetGiantSkins, resetPlayerScores, resetAllData,
    // Utilities
    formatDate, formatShortDate,
    // Payout tracker
    seasonBuyIn, payoutTemplates, weekTemplateAssignments,
    showBudgetDashboard, setShowBudgetDashboard,
    showTemplateManager, setShowTemplateManager,
    editingTemplate, setEditingTemplate,
    seasonBudget, totalPlannedPayouts, totalActualPayouts, remainingBudget, fullTimePlayers,
    handleUpdateBuyIn, handleSavePayoutTemplate, handleDeletePayoutTemplate,
    handleAssignTemplateToWeek, getTemplateById, getWeekPlannedPayout,
    getTemplateMoneyEntries, getWeeklyMoneyTotal, payoutEntryKey, getWeekPayouts,
    weeklyGames,
    toggleWeatherCancelled, setScoreSubmissionEnabled,
    // Championship flights
    flightStandings,
  } = useLeague();

  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'week';

  const [activeSelectSlot, setActiveSelectSlot] = useState(null);
  const selectDropdownRef = useRef(null);

  // Payout tracker local state
  const [editBuyIn, setEditBuyIn] = useState(false);
  const [buyInInput, setBuyInInput] = useState('');
  const [templateForm, setTemplateForm] = useState(null);

  // Championship flight roster
  const [copiedFlights, setCopiedFlights] = useState(false);

  const flightListText = () => flightStandings.map(flight => {
    const lines = flight.players.length
      ? flight.players.map(p => `${p.tied ? 'T' : ''}${p.rank}. ${p.name} — $${p.money.toLocaleString()}`)
      : ['(no players yet)'];
    return [`${flight.name.toUpperCase()} — ${flight.description}`, ...lines].join('\n');
  }).join('\n\n');

  const copyFlightList = async () => {
    const text = flightListText();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for browsers without the async clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedFlights(true);
      setTimeout(() => setCopiedFlights(false), 2000);
    } catch (err) {
      console.error('Could not copy flight list:', err);
    }
  };

  useEffect(() => {
    if (!activeSelectSlot) return;
    const handleClickOutside = (e) => {
      if (selectDropdownRef.current && !selectDropdownRef.current.contains(e.target)) {
        setActiveSelectSlot(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [activeSelectSlot]);

  const exportTeeTimes = () => {
    if (!currentWeek) return;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 14;
    let y = 18;

    const weekDate = new Date(currentWeek.date + 'T00:00:00');
    const weekDateStr = weekDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('The Lakes Golf League', pageW / 2, y, { align: 'center' });
    y += 9;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(weekDateStr, pageW / 2, y, { align: 'center' });
    y += 6;

    const nineLabel = currentWeek.nineHoles === 'front' ? 'Front 9 (Holes 1-9)' : 'Back 9 (Holes 10-18)';
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(nineLabel, pageW / 2, y, { align: 'center' });
    y += 8;

    doc.setDrawColor(100, 120, 100);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    if (currentGame) {
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(currentGame.gameName, margin, y);
      if (currentGame.teamType) {
        const label = currentGame.teamType === '2-person' ? '2-Person Teams' : '4-Person Teams';
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(label, pageW - margin, y, { align: 'right' });
      }
      y += 7;
    }

    const totalPlayers = currentWeek.teeSheet.reduce((sum, t) => sum + t.players.length, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`${totalPlayers} players scheduled`, margin, y);
    y += 8;
    doc.setTextColor(0, 0, 0);

    currentWeek.teeSheet.forEach((slot) => {
      if (slot.players.length === 0) return;
      if (y > 265) { doc.addPage(); y = 18; }

      const rowH = 8;
      doc.setFillColor(235, 240, 235);
      doc.rect(margin, y - 5, pageW - margin * 2, rowH + 2, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(slot.time, margin + 2, y);

      const is2person = currentGame?.teamType === '2-person';
      if (is2person) {
        const teamA = [slot.players[0] ?? null, slot.players[1] ?? null];
        const teamB = [slot.players[2] ?? null, slot.players[3] ?? null];
        const colMid = pageW / 2;

        if (currentGame?.showTeamHandicap) {
          const hcpA = calcTeamHandicap(
            teamA.filter(id => id != null).map(id => calc9HoleHandicap(getPlayerById(id)?.handicap)),
            currentGame?.handicapFormat || 'scramble'
          );
          const hcpB = calcTeamHandicap(
            teamB.filter(id => id != null).map(id => calc9HoleHandicap(getPlayerById(id)?.handicap)),
            currentGame?.handicapFormat || 'scramble'
          );
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text(`Team HCP ${hcpA}`, colMid - 4, y, { align: 'right' });
          doc.text(`Team HCP ${hcpB}`, pageW - margin - 2, y, { align: 'right' });
          doc.setTextColor(0, 0, 0);
        }

        y += rowH;
        [[teamA, margin + 2], [teamB, colMid + 2]].forEach(([ids, xStart]) => {
          ids.forEach((playerId) => {
            if (y > 270) { doc.addPage(); y = 18; }
            const player = getPlayerById(playerId);
            doc.setFontSize(10);
            doc.setFont('helvetica', player ? 'normal' : 'italic');
            doc.setTextColor(player ? 0 : 140, player ? 0 : 140, player ? 0 : 140);
            doc.text(player ? player.name : '—', xStart + 4, y);
            if (player) {
              doc.setTextColor(80, 80, 80);
              const rightEdge = xStart === margin + 2 ? colMid - 4 : pageW - margin - 2;
              doc.text(`HCP ${calc9HoleHandicap(player.handicap)}`, rightEdge, y, { align: 'right' });
            }
            doc.setTextColor(0, 0, 0);
            y += 6;
          });
        });
      } else {
        y += rowH;
        slot.players.forEach((playerId) => {
          if (y > 270) { doc.addPage(); y = 18; }
          const player = getPlayerById(playerId);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(0, 0, 0);
          doc.text(player ? player.name : '—', margin + 4, y);
          if (player) {
            doc.setTextColor(80, 80, 80);
            doc.text(`HCP ${calc9HoleHandicap(player.handicap)}`, pageW - margin - 2, y, { align: 'right' });
            doc.setTextColor(0, 0, 0);
          }
          y += 6;
        });
      }

      y += 3;
    });

    doc.save(`tee-times-${currentWeek.date}.pdf`);
  };

  const exportScorecards = () => {
    if (!currentWeek) return;
    exportScorecardsPdf({ week: currentWeek, currentGame, getPlayerById });
  };

  const exportPlayersPdf = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 18;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('The Lakes Golf League', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text('Player Roster', pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • ${players.length} players`,
      pageW / 2,
      y,
      { align: 'center' }
    );
    doc.setTextColor(0, 0, 0);
    y += 6;

    doc.setDrawColor(100, 120, 100);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    const colName = margin + 2;
    const colType = margin + 70;
    const colHcp = margin + 105;
    const colTimes = margin + 130;
    const timesWidth = pageW - margin - colTimes - 2;

    const drawHeader = () => {
      doc.setFillColor(235, 240, 235);
      doc.rect(margin, y - 5, pageW - margin * 2, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Name', colName, y);
      doc.text('Type', colType, y);
      doc.text('HCP (9 / 18)', colHcp, y);
      doc.text('Available Tee Times', colTimes, y);
      y += 7;
    };

    drawHeader();

    const sorted = [...players].sort((a, b) =>
      calc9HoleHandicap(a.handicap) - calc9HoleHandicap(b.handicap)
    );

    sorted.forEach((player, idx) => {
      const timesStr = player.availability.length > 0 ? player.availability.join(', ') : '—';
      const timeLines = doc.splitTextToSize(timesStr, timesWidth);
      const rowH = Math.max(6, timeLines.length * 4.5) + 2;

      if (y + rowH > pageH - 12) {
        doc.addPage();
        y = 18;
        drawHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 248, 244);
        doc.rect(margin, y - 4, pageW - margin * 2, rowH, 'F');
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(player.name, colName, y);

      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(player.type === 'full-time' ? 'Member' : 'Substitute', colType, y);

      doc.setTextColor(0, 0, 0);
      doc.text(`${calc9HoleHandicap(player.handicap)} / ${player.handicap}`, colHcp, y);

      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      doc.text(timeLines, colTimes, y);
      doc.setTextColor(0, 0, 0);

      y += rowH;
    });

    doc.save(`lakes-players-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!isAdminAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="max-w-md mx-auto mt-12">
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-forest-900 px-6 py-4 text-center">
              <div className="text-3xl mb-2">🔐</div>
              <h3 className="text-xl font-serif text-cream-200">Admin Access</h3>
              <p className="text-cream-200/60 text-sm">Enter password to access league administration</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => { setAdminPassword(e.target.value); setPasswordError(false); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    placeholder="Enter admin password"
                    autoComplete="off"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    className={`w-full border rounded-input px-4 py-3 text-center text-lg bg-cream-100 ${
                      passwordError ? 'border-red-400 bg-red-50' : 'border-charcoal-800/20'
                    }`}
                  />
                  {passwordError && (
                    <p className="text-red-500 text-sm mt-2 text-center">Incorrect password. Try again.</p>
                  )}
                </div>
                <button
                  onClick={handleAdminLogin}
                  className="w-full bg-forest-900 text-cream-200 py-3 rounded-pill hover:bg-forest-800 font-medium text-lg"
                >
                  Enter Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ─── WEEK TAB ─── */}
      {activeTab === 'week' && (
        <div className="space-y-6">

          {/* Week Navigation */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {currentWeek && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-cream-200 font-medium">{formatDate(currentWeek.date)}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-pill font-medium ${currentWeek.nineHoles === 'front' ? 'bg-forest-800 text-cream-200' : 'bg-forest-700 text-cream-200'}`}>
                    {currentWeek.nineHoles === 'front' ? 'Front 9' : 'Back 9'}
                  </span>
                  {currentWeek.teeSheet.length > 0 && <span className="bg-cream-200/10 text-cream-200/80 px-2.5 py-0.5 rounded-pill text-xs">✓ Scheduled</span>}
                  {currentWeek.moneyEntered && <span className="bg-gold-500/20 text-gold-400 px-2.5 py-0.5 rounded-pill text-xs">✓ Money</span>}
                  {currentWeek.weatherCancelled && <span className="bg-red-500/20 text-red-300 px-2.5 py-0.5 rounded-pill text-xs">⛈ Weather Cancelled</span>}
                  {currentWeek.scoreSubmissionEnabled === false && <span className="bg-charcoal-800/20 text-cream-200/80 px-2.5 py-0.5 rounded-pill text-xs">📝 Submit Off</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
                disabled={selectedWeek === 1}
                className="px-5 py-2.5 bg-forest-800 text-cream-200 rounded-pill disabled:opacity-50 hover:bg-forest-700 text-sm transition-colors"
              >
                ← Prev
              </button>
              <span className="text-cream-200 font-semibold text-sm min-w-[70px] text-center">Week {selectedWeek}</span>
              <button
                onClick={() => setSelectedWeek(Math.min(weeks.length, selectedWeek + 1))}
                disabled={selectedWeek === weeks.length}
                className="px-5 py-2.5 bg-forest-800 text-cream-200 rounded-pill disabled:opacity-50 hover:bg-forest-700 text-sm transition-colors"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Weather Cancellation */}
          {currentWeek && (
            <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
              <div className="bg-cream-300 px-4 py-3">
                <h3 className="font-display font-semibold text-charcoal-950">⛈ Weather Cancellation</h3>
              </div>
              <div className="p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!currentWeek.weatherCancelled}
                    onChange={() => toggleWeatherCancelled(currentWeek.id)}
                    className="w-5 h-5 mt-0.5 rounded border-gray-300 text-forest-900 focus:ring-forest-800"
                  />
                  <div>
                    <span className="font-medium text-charcoal-950">Cancel this week due to weather</span>
                    <p className="text-xs text-charcoal-400 mt-0.5">
                      The tee time schedule and game data are retained, but the public schedule will display "This Week Is Cancelled Due To Weather" instead of the tee times.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Score Submission Toggle */}
          {currentWeek && (() => {
            const enabled = currentWeek.scoreSubmissionEnabled ?? true;
            return (
              <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
                <div className="bg-cream-300 px-4 py-3">
                  <h3 className="font-display font-semibold text-charcoal-950">📝 Player Score Submission</h3>
                </div>
                <div className="p-4 space-y-3">
                  <p className="text-xs text-charcoal-400">
                    Controls whether the "Submit My Score" button is shown to players on the home page for Week {currentWeek.id}. Turn off for weeks where you don't want players to submit scores.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 cursor-pointer flex-1 border border-charcoal-800/20 rounded-input px-3 py-2 hover:bg-cream-100">
                      <input
                        type="radio"
                        name={`score-submission-${currentWeek.id}`}
                        checked={enabled === true}
                        onChange={() => setScoreSubmissionEnabled(currentWeek.id, true)}
                        className="w-4 h-4 text-forest-900 focus:ring-forest-800"
                      />
                      <span className="font-medium text-charcoal-950">On — players can submit scores</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer flex-1 border border-charcoal-800/20 rounded-input px-3 py-2 hover:bg-cream-100">
                      <input
                        type="radio"
                        name={`score-submission-${currentWeek.id}`}
                        checked={enabled === false}
                        onChange={() => setScoreSubmissionEnabled(currentWeek.id, false)}
                        className="w-4 h-4 text-forest-900 focus:ring-forest-800"
                      />
                      <span className="font-medium text-charcoal-950">Off — hide submit button</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Weekly Games Editor */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-charcoal-950">🎮 Weekly Games</h3>
              {!showWeeklyGameEditor && (
                <button
                  onClick={loadWeeklyGameForEdit}
                  className="bg-forest-900 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-800 text-sm font-medium"
                >
                  Edit Game Info
                </button>
              )}
            </div>

            {!showWeeklyGameEditor && currentGame && (
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-cream-100 rounded-card p-3">
                    <div className="text-sm text-charcoal-400 mb-1">This Week's Game</div>
                    <div className="font-bold text-forest-900">{currentGame.gameName}</div>
                  </div>
                  <div className="bg-cream-100 rounded-card p-3">
                    <div className="text-sm text-charcoal-400 mb-1">Side Game</div>
                    <div className="font-bold text-gold-600">{currentGame.sideGame}</div>
                  </div>
                </div>
                {weekTemplateAssignments[selectedWeek] && (() => {
                  const t = getTemplateById(weekTemplateAssignments[selectedWeek]);
                  return t ? (
                    <div className="mt-3 bg-forest-900/5 border border-forest-900/10 rounded-card p-2 text-sm">
                      <span className="text-forest-900 font-medium">Payout: {t.name}</span>
                      <span className="text-charcoal-950 ml-2 font-bold">${t.payouts.reduce((s, p) => s + p.amount, 0) + (t.sideGameTotal || 0)}</span>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {showWeeklyGameEditor && (
              <div className="p-4">
                <p className="text-sm text-charcoal-600 mb-4">
                  Edit the game name, description, and side game for Week {selectedWeek}.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Game Name</label>
                    <input
                      type="text"
                      value={weeklyGameEdit.gameName}
                      onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, gameName: e.target.value })}
                      placeholder="e.g., 2-Man Scramble"
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Game Description (include payouts)</label>
                    <textarea
                      value={weeklyGameEdit.gameDescription}
                      onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, gameDescription: e.target.value })}
                      placeholder="Describe the game format and include payout structure..."
                      rows={6}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-600 mb-1">Side Game Name</label>
                      <input
                        type="text"
                        value={weeklyGameEdit.sideGame}
                        onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, sideGame: e.target.value })}
                        placeholder="e.g., Greenies"
                        className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-600 mb-1">Side Game Description</label>
                      <input
                        type="text"
                        value={weeklyGameEdit.sideGameDescription}
                        onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, sideGameDescription: e.target.value })}
                        placeholder="e.g., $10 per greenie"
                        className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Team Type</label>
                    <select
                      value={weeklyGameEdit.teamType || ''}
                      onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, teamType: e.target.value || null, showTeamHandicap: e.target.value ? weeklyGameEdit.showTeamHandicap : false })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    >
                      <option value="">Individual (no teams)</option>
                      <option value="2-person">2-Person Teams</option>
                      <option value="4-person">4-Person Teams</option>
                    </select>
                  </div>
                  {weeklyGameEdit.teamType && (
                    <div className="bg-cream-100 border border-charcoal-800/10 rounded-card p-4 space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={weeklyGameEdit.showTeamHandicap}
                          onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, showTeamHandicap: e.target.checked })}
                          className="w-5 h-5 rounded border-gray-300 text-forest-900 focus:ring-forest-800"
                        />
                        <div>
                          <span className="font-medium text-charcoal-950">Show Team Handicap</span>
                          <p className="text-xs text-charcoal-400 mt-0.5">Display calculated team handicap on the tee sheet</p>
                        </div>
                      </label>
                      {weeklyGameEdit.showTeamHandicap && (
                        <div>
                          <label className="block text-sm font-medium text-charcoal-600 mb-1">USGA Handicap Format</label>
                          <select
                            value={weeklyGameEdit.handicapFormat || 'scramble'}
                            onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, handicapFormat: e.target.value })}
                            className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                          >
                            <option value="scramble">Scramble (35%/15% or 20%/15%/10%/5%)</option>
                            <option value="fourBall">Four-Ball / Best Ball (85% of lowest)</option>
                            <option value="shamble">Shamble (75% each, summed)</option>
                            <option value="aggregate">Aggregate (100% sum)</option>
                          </select>
                          <p className="text-xs text-charcoal-400 mt-1">
                            {weeklyGameEdit.handicapFormat === 'scramble' && 'USGA Scramble: 2-person = 35% low + 15% high. 4-person = 20% + 15% + 10% + 5% (low to high).'}
                            {weeklyGameEdit.handicapFormat === 'fourBall' && 'USGA Four-Ball: Each player at 85% of course handicap. Team handicap = lowest adjusted.'}
                            {weeklyGameEdit.handicapFormat === 'shamble' && 'Shamble: Each player at 75% of course handicap. Team handicap = sum of adjusted handicaps.'}
                            {weeklyGameEdit.handicapFormat === 'aggregate' && 'Full course handicaps summed together (100% of each player).'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="bg-cream-100 border border-charcoal-800/10 rounded-card p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={weeklyGameEdit.reducedHandicap || false}
                        onChange={(e) => setWeeklyGameEdit({ ...weeklyGameEdit, reducedHandicap: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-forest-900 focus:ring-forest-800"
                      />
                      <div>
                        <span className="font-medium text-charcoal-950">80% Individual Handicap Allowance</span>
                        <p className="text-xs text-charcoal-400 mt-0.5">When on, each player's net score uses 80% of their 9-hole handicap (rounded). Does not affect team handicap formats.</p>
                      </div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Payout Template</label>
                    <select
                      value={weekTemplateAssignments[selectedWeek] || ''}
                      onChange={(e) => handleAssignTemplateToWeek(selectedWeek, e.target.value || null)}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    >
                      <option value="">None</option>
                      {payoutTemplates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} (${t.payouts.reduce((s, p) => s + p.amount, 0) + (t.sideGameTotal || 0)})</option>
                      ))}
                    </select>
                    {weekTemplateAssignments[selectedWeek] && (() => {
                      const t = getTemplateById(weekTemplateAssignments[selectedWeek]);
                      return t ? (
                        <div className="mt-1 text-xs text-charcoal-400">
                          {t.payouts.map((p, i) => <span key={i}>{p.label}: ${p.amount}{i < t.payouts.length - 1 ? ' | ' : ''}</span>)}
                          {t.sideGameTotal > 0 && <span> | Side: ${t.sideGameTotal}</span>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSaveWeeklyGame}
                    className="flex-1 bg-forest-900 text-cream-200 py-2 rounded-pill hover:bg-forest-800 font-medium"
                  >
                    Save Game Info
                  </button>
                  <button
                    onClick={() => setShowWeeklyGameEditor(false)}
                    className="px-4 py-2 border border-charcoal-800/20 rounded-pill hover:bg-cream-300 text-charcoal-950"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
          {/* END Weekly Games Editor */}

          {/* Build Weekly Schedule */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-display font-semibold text-charcoal-950">📅 Build Weekly Schedule</h3>
              {!showScheduleBuilder && (
                <div className="flex flex-wrap gap-2">
                  {currentWeek?.teeSheet.length > 0 && (
                    <button
                      onClick={exportTeeTimes}
                      className="bg-gold-500 text-forest-950 px-3 py-1 rounded-pill hover:bg-gold-400 text-sm font-medium"
                    >
                      Export PDF
                    </button>
                  )}
                  {currentWeek?.teeSheet.length > 0 && (
                    <button
                      onClick={exportScorecards}
                      className="bg-gold-500 text-forest-950 px-3 py-1 rounded-pill hover:bg-gold-400 text-sm font-medium"
                    >
                      Print Scorecards
                    </button>
                  )}
                  <button
                    onClick={autoScheduleWeek}
                    className="bg-forest-800 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-700 text-sm font-medium"
                  >
                    ✨ Auto-Generate
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Generate tee sheets for the next 4 upcoming weeks that have not been scheduled yet?')) {
                        autoScheduleNextWeeks(4);
                      }
                    }}
                    className="bg-forest-800 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-700 text-sm font-medium"
                  >
                    ✨ Generate Next 4 Weeks
                  </button>
                  {currentWeek?.teeSheet.length > 0 && (
                    <button
                      onClick={compactTeeSheet}
                      className="bg-forest-800 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-700 text-sm font-medium"
                    >
                      Compact
                    </button>
                  )}
                  <button
                    onClick={loadExistingSchedule}
                    className="bg-forest-900 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-800 text-sm font-medium"
                  >
                    {currentWeek?.teeSheet.length ? 'Edit Schedule' : 'Manual Build'}
                  </button>
                </div>
              )}
            </div>

            {showScheduleBuilder && (
              <div className="p-4">
                <p className="text-sm text-charcoal-600 mb-4">
                  Tap an empty slot to pick a player. Drag and drop to rearrange or swap.
                  <span className="font-medium"> {48 - assignedPlayerIds.length} spots remaining.</span>
                </p>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {teeTimes.map((time, timeIdx) => (
                    <div key={timeIdx} className="flex items-start gap-3 p-3 bg-cream-100 rounded-card">
                      <div className="w-16 flex-shrink-0">
                        <div className="font-bold text-forest-900 text-sm leading-tight">{time}</div>
                        <div className="text-xs text-charcoal-400">
                          {[0,1,2,3].filter(s => scheduleSelections[`${timeIdx}-${s}`]).length}/4
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                        {[0, 1, 2, 3].map(slot => {
                          const key = `${timeIdx}-${slot}`;
                          const playerId = scheduleSelections[key];
                          const player = playerId ? players.find(p => p.id === parseInt(playerId)) : null;
                          const isDragOver = dragOverSlot === key;
                          const isDragging = dragPlayer && dragPlayer.fromKey === key;

                          if (player) {
                            return (
                              <div
                                key={slot}
                                draggable="true"
                                onDragStart={(e) => {
                                  setDragPlayer({ playerId: String(player.id), fromKey: key, fromTimeIdx: timeIdx, fromSlotIdx: slot });
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => { setDragPlayer(null); setDragOverSlot(null); }}
                                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                onDragEnter={(e) => { e.preventDefault(); setDragOverSlot(key); }}
                                onDragLeave={(e) => {
                                  if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSlot(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverSlot(null);
                                  if (!dragPlayer || dragPlayer.fromKey === key) return;
                                  setScheduleSelections(prev => ({
                                    ...prev,
                                    [dragPlayer.fromKey]: String(player.id),
                                    [key]: dragPlayer.playerId
                                  }));
                                  setDragPlayer(null);
                                }}
                                className={`relative bg-cream-200 px-2 py-2 rounded-card border text-sm font-medium text-charcoal-950 cursor-grab active:cursor-grabbing transition-all select-none flex items-center justify-between ${
                                  isDragging ? 'opacity-40 border-charcoal-800/20' :
                                  isDragOver ? 'border-forest-700 bg-forest-900/5 shadow-md' :
                                  'border-charcoal-800/10 hover:border-forest-700 hover:shadow-sm'
                                }`}
                              >
                                <div className="truncate">
                                  <span>{player.name}</span>
                                  <span className="text-xs text-charcoal-400 ml-1">({calc9HoleHandicap(player.handicap)})</span>
                                  {player.type === 'substitute' && <span className="text-xs text-gold-600 ml-1">Sub</span>}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setScheduleSelections(prev => {
                                      const updated = { ...prev };
                                      delete updated[key];
                                      return updated;
                                    });
                                  }}
                                  className="ml-1 text-charcoal-400 hover:text-red-500 text-xs font-bold flex-shrink-0"
                                  title="Remove player"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          } else {
                            const isSelectOpen = activeSelectSlot === key;
                            const unassignedPlayers = players.filter(p =>
                              (p.type === 'full-time' || p.type === 'substitute') &&
                              !assignedPlayerIds.includes(p.id)
                            ).sort((a, b) => a.name.localeCompare(b.name));

                            return (
                              <div key={slot} className="relative">
                                <div
                                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                  onDragEnter={(e) => { e.preventDefault(); setDragOverSlot(key); }}
                                  onDragLeave={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget)) setDragOverSlot(null);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOverSlot(null);
                                    if (!dragPlayer) return;
                                    setScheduleSelections(prev => {
                                      const updated = { ...prev };
                                      if (dragPlayer.fromKey) delete updated[dragPlayer.fromKey];
                                      updated[key] = dragPlayer.playerId;
                                      return updated;
                                    });
                                    setDragPlayer(null);
                                  }}
                                  onClick={() => {
                                    if (dragPlayer) return;
                                    setActiveSelectSlot(isSelectOpen ? null : key);
                                  }}
                                  className={`px-2 py-2 rounded-card border-2 border-dashed text-xs text-center transition-all cursor-pointer ${
                                    isSelectOpen
                                      ? 'border-forest-700 bg-forest-900/5 text-forest-900'
                                      : isDragOver
                                      ? 'border-forest-700 bg-forest-900/5 text-forest-900'
                                      : 'border-charcoal-800/20 text-charcoal-400 hover:border-forest-700 hover:text-forest-900'
                                  }`}
                                >
                                  {isDragOver ? 'Drop here' : isSelectOpen ? 'Select player ▲' : '+ Add Player'}
                                </div>
                                {isSelectOpen && (
                                  <div
                                    ref={selectDropdownRef}
                                    className="absolute z-50 top-full left-0 mt-1 w-56 bg-cream-200 border border-charcoal-800/10 rounded-card shadow-card-hover max-h-60 overflow-y-auto"
                                  >
                                    {unassignedPlayers.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-charcoal-400">No available players</div>
                                    ) : (
                                      unassignedPlayers.map(p => (
                                        <button
                                          key={p.id}
                                          className="w-full text-left px-3 py-2 text-sm hover:bg-cream-300 flex items-center justify-between gap-2 border-b border-charcoal-800/5 last:border-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setScheduleSelections(prev => ({ ...prev, [key]: String(p.id) }));
                                            setActiveSelectSlot(null);
                                          }}
                                        >
                                          <span className="font-medium text-charcoal-950">{p.name}</span>
                                          <span className="text-xs text-charcoal-400 flex-shrink-0">
                                            ({calc9HoleHandicap(p.handicap)}){p.type === 'substitute' ? ' Sub' : ''}
                                          </span>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Unassigned Player Pool */}
                {(() => {
                  const unassignedPlayers = players.filter(p =>
                    (p.type === 'full-time' || p.type === 'substitute') &&
                    !assignedPlayerIds.includes(p.id)
                  ).sort((a, b) => a.name.localeCompare(b.name));

                  if (unassignedPlayers.length === 0) return null;

                  return (
                    <div className="mt-4 border-t border-charcoal-800/10 pt-4">
                      <p className="text-sm font-medium text-charcoal-600 mb-2">
                        Available Players ({unassignedPlayers.length})
                        <span className="text-charcoal-400 font-normal ml-2">Tap an empty slot above or drag</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {unassignedPlayers.map(p => (
                          <div
                            key={p.id}
                            draggable="true"
                            onDragStart={(e) => {
                              setDragPlayer({ playerId: String(p.id), fromKey: null, fromTimeIdx: null, fromSlotIdx: null });
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => { setDragPlayer(null); setDragOverSlot(null); }}
                            className="bg-forest-900/5 border border-forest-900/10 px-3 py-1.5 rounded-pill text-sm cursor-grab active:cursor-grabbing hover:bg-forest-900/10 transition-colors select-none"
                          >
                            <span className="font-medium text-forest-900">{p.name}</span>
                            <span className="text-xs text-charcoal-400 ml-1">({calc9HoleHandicap(p.handicap)})</span>
                            {p.type === 'substitute' && <span className="text-xs text-gold-600 ml-1">Sub</span>}
                            <span className="text-xs text-charcoal-400 ml-1">
                              [{p.availability.length === teeTimes.length ? 'All' : p.availability.length + ' times'}]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleBuildSchedule}
                    className="flex-1 bg-forest-900 text-cream-200 py-2 rounded-pill hover:bg-forest-800 font-medium"
                  >
                    Save Schedule
                  </button>
                  <button
                    onClick={() => { setShowScheduleBuilder(false); setScheduleSelections({}); setDragPlayer(null); setDragOverSlot(null); }}
                    className="px-4 py-2 border border-charcoal-800/20 rounded-pill hover:bg-cream-300 text-charcoal-950"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!showScheduleBuilder && (
              <div className="p-4 text-sm text-charcoal-600">
                <p><strong>Auto-Generate:</strong> Creates optimal schedule based on availability, handicap mixing, and rotation diversity.</p>
                <p><strong>Manual Build:</strong> Pick players yourself for each tee time (only shows available players).</p>
              </div>
            )}
          </div>
          {/* END Build Schedule */}

          {/* Enter Money */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-charcoal-950">💰 Enter Weekly Money</h3>
              {!showMoneyEntry && currentWeek?.teeSheet.length > 0 && (
                currentWeek?.moneyEntered ? (
                  <button
                    onClick={loadMoneyForEdit}
                    className="bg-forest-800 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-700 text-sm font-medium"
                  >
                    ✏️ Edit Money
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      const template = getTemplateMoneyEntries(selectedWeek);
                      if (template && template.payouts.length > 0) {
                        // amounts will show from template on open
                      }
                      setShowMoneyEntry(true);
                    }}
                    className="bg-forest-900 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-800 text-sm font-medium"
                  >
                    Enter Money
                  </button>
                )
              )}
            </div>

            {showMoneyEntry && currentWeek && (() => {
              const weekTemplate = getTemplateMoneyEntries(selectedWeek);
              const currentTotal = Object.values(moneyEntries).reduce((s, v) => s + (parseFloat(v) || 0), 0);
              const plannedTotal = getWeekPlannedPayout(selectedWeek);
              // When no template is assigned, fall back to the classic places so
              // ad-hoc money can still be entered.
              const fallbackPayouts = [
                { label: '1st Place', category: '1st' },
                { label: '2nd Place', category: '2nd' },
                { label: '3rd Place', category: '3rd' },
                { label: 'Low Gross', category: 'gross' }
              ];
              const templatePayouts = getWeekPayouts(selectedWeek);
              const payoutsToEnter = templatePayouts.length ? templatePayouts : fallbackPayouts;
              return (
                <div className="p-4">
                  {weekTemplate && (
                    <div className="mb-3 bg-forest-900/5 border border-forest-900/10 rounded-card p-2 text-sm text-charcoal-950 flex items-center justify-between">
                      <span>Template: <strong>{weekTemplate.name}</strong></span>
                      <span className={`font-medium ${currentTotal > plannedTotal && plannedTotal > 0 ? 'text-red-600' : ''}`}>
                        Entering: ${currentTotal} / Planned: {plannedTotal > 0 ? `$${plannedTotal}` : '-'}
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-charcoal-800">🏆 Main Game</h4>
                      {payoutsToEnter.map((payout, payoutIdx) => {
                        const place = payoutEntryKey(payout);
                        const cat = moneyCategories.find(c => c.id === payout.category);
                        const icon = cat?.icon || '🏆';
                        const label = payout.label || cat?.name || 'Payout';
                        const teamType = getTeamTypeForWeek(selectedWeek);
                        const selectedForPlace = Object.keys(moneyEntries).filter(k => k.endsWith(`-${place}`)).map(k => k.split('-')[0]);
                        // Amount that applies to this payout row: any already-entered
                        // amount for it, otherwise the template's planned amount.
                        const rowAmount = Object.entries(moneyEntries).find(([k]) => k.endsWith(`-${place}`))?.[1]
                          ?? (payout.amount != null ? String(payout.amount) : '');
                        const setRowAmount = (val) => {
                          const updated = { ...moneyEntries };
                          Object.keys(updated).forEach(k => { if (k.endsWith(`-${place}`)) updated[k] = val; });
                          setMoneyEntries(updated);
                        };

                        if (teamType) {
                          return (
                            <div key={`${place}-${payoutIdx}`} className="border border-charcoal-800/10 rounded-card p-3 bg-cream-100">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{icon}</span>
                                <span className="font-medium text-charcoal-800">{label}</span>
                                <div className="flex items-center gap-1 ml-auto">
                                  <span className="text-charcoal-400 text-sm">$</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={rowAmount}
                                    onChange={(e) => setRowAmount(e.target.value)}
                                    className="w-16 border border-charcoal-800/20 rounded-input px-2 py-1 bg-cream-100 text-sm"
                                  />
                                  <span className="text-charcoal-500 text-xs">each</span>
                                </div>
                              </div>
                              <div className="max-h-32 overflow-y-auto space-y-1">
                                {getPlayersForWeek(selectedWeek).map(id => {
                                  const p = getPlayerById(id);
                                  const isChecked = selectedForPlace.includes(String(id));
                                  return (
                                    <label key={id} className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-sm ${isChecked ? 'bg-forest-900/5' : 'hover:bg-cream-300'}`}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const newEntries = { ...moneyEntries };
                                          if (e.target.checked) {
                                            newEntries[`${id}-${place}`] = rowAmount;
                                          } else {
                                            delete newEntries[`${id}-${place}`];
                                          }
                                          setMoneyEntries(newEntries);
                                        }}
                                        className="rounded border-gray-300 text-forest-900"
                                      />
                                      <span className={isChecked ? 'font-medium text-forest-900' : 'text-charcoal-800'}>{p?.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              {selectedForPlace.length > 0 && (
                                <div className="text-xs text-charcoal-400 mt-1">{selectedForPlace.length} player{selectedForPlace.length !== 1 ? 's' : ''} selected</div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div key={`${place}-${payoutIdx}`} className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{icon}</span>
                                <span className="text-sm font-medium text-charcoal-700">{label}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <select
                                  value={selectedForPlace[0] || ''}
                                  onChange={(e) => {
                                    const newEntries = { ...moneyEntries };
                                    Object.keys(newEntries).forEach(k => {
                                      if (k.endsWith(`-${place}`)) delete newEntries[k];
                                    });
                                    if (e.target.value) {
                                      newEntries[`${e.target.value}-${place}`] = rowAmount;
                                    }
                                    setMoneyEntries(newEntries);
                                  }}
                                  className="flex-1 border border-charcoal-800/20 rounded-input px-2 py-1 bg-cream-100"
                                >
                                  <option value="">Select player...</option>
                                  {getPlayersForWeek(selectedWeek).map(id => {
                                    const p = getPlayerById(id);
                                    return <option key={id} value={id}>{p?.name}</option>;
                                  })}
                                </select>
                                <div className="flex items-center">
                                  <span className="text-charcoal-400">$</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={rowAmount}
                                    onChange={(e) => setRowAmount(e.target.value)}
                                    className="w-20 border border-charcoal-800/20 rounded-input px-2 py-1 bg-cream-100"
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-charcoal-800">🎯 Closest to Pin</h4>
                      {['ctp1', 'ctp2', 'ctp3'].map((ctp, idx) => (
                        <div key={ctp} className="flex items-center gap-3">
                          <span className="text-sm text-charcoal-400 w-8">#{idx + 1}</span>
                          <select
                            value={Object.keys(moneyEntries).find(k => k.endsWith(`-${ctp}`))?.split('-')[0] || ''}
                            onChange={(e) => {
                              const newEntries = { ...moneyEntries };
                              Object.keys(newEntries).forEach(k => {
                                if (k.endsWith(`-${ctp}`)) delete newEntries[k];
                              });
                              if (e.target.value) {
                                newEntries[`${e.target.value}-${ctp}`] = moneyEntries[`${e.target.value}-${ctp}`] || '';
                              }
                              setMoneyEntries(newEntries);
                            }}
                            className="flex-1 border border-charcoal-800/20 rounded-input px-2 py-1 bg-cream-100"
                          >
                            <option value="">Select player...</option>
                            {getPlayersForWeek(selectedWeek).map(id => {
                              const p = getPlayerById(id);
                              return <option key={id} value={id}>{p.name}</option>;
                            })}
                          </select>
                          <div className="flex items-center">
                            <span className="text-charcoal-400">$</span>
                            <input
                              type="number"
                              placeholder="0"
                              value={Object.entries(moneyEntries).find(([k]) => k.endsWith(`-${ctp}`))?.[1] || ''}
                              onChange={(e) => {
                                const key = Object.keys(moneyEntries).find(k => k.endsWith(`-${ctp}`));
                                if (key) setMoneyEntries({ ...moneyEntries, [key]: e.target.value });
                              }}
                              className="w-20 border border-charcoal-800/20 rounded-input px-2 py-1 bg-cream-100"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-6">
                    <button
                      onClick={handleEnterMoney}
                      className="flex-1 bg-forest-900 text-cream-200 py-2 rounded-pill hover:bg-forest-800 font-medium"
                    >
                      Save Money
                    </button>
                    <button
                      onClick={() => { setShowMoneyEntry(false); setMoneyEntries({}); }}
                      className="px-4 py-2 border border-charcoal-800/20 rounded-pill hover:bg-cream-300 text-charcoal-950"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
          {/* END Enter Money */}

          {/* Manage Player Scores */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-charcoal-950">📊 Manage Player Scores</h3>
              {!showScoreManager && (
                <button
                  onClick={() => setShowScoreManager(true)}
                  className="bg-forest-900 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-800 text-sm font-medium"
                >
                  View/Edit Scores
                </button>
              )}
            </div>

            {showScoreManager && (
              <div className="p-4">
                <div className="flex items-center gap-4 mb-4">
                  <label className="text-sm font-medium text-charcoal-600">View Week:</label>
                  <select
                    value={scoreManagerWeek}
                    onChange={(e) => setScoreManagerWeek(parseInt(e.target.value))}
                    className="border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                  >
                    {weeks.map(w => (
                      <option key={w.id} value={w.id}>
                        Week {w.id} - {formatShortDate(w.date)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowScoreManager(false)}
                    className="ml-auto text-charcoal-400 hover:text-charcoal-950"
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Add Score Form */}
                <div className="bg-cream-100 rounded-card p-3 mb-4">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <span className="text-sm font-medium text-charcoal-600">Add Score:</span>
                    <select
                      value={adminAddScore.playerId}
                      onChange={(e) => setAdminAddScore({ ...adminAddScore, playerId: e.target.value })}
                      className="border border-charcoal-800/20 rounded-input px-3 py-2 text-sm bg-cream-200"
                    >
                      <option value="">Select player...</option>
                      {players
                        .filter(p => !playerScores.some(s => s.player_id === p.id && s.week_id === scoreManagerWeek))
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(p => (
                          <option key={p.id} value={p.id}>{p.name} (HCP: {calc9HoleHandicap(p.handicap)})</option>
                        ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Gross Score"
                      value={adminAddScore.grossScore}
                      onChange={(e) => setAdminAddScore({ ...adminAddScore, grossScore: e.target.value })}
                      className="border border-charcoal-800/20 rounded-input px-3 py-2 w-28 text-sm bg-cream-200"
                    />
                  </div>

                  {/* Team Info for Admin */}
                  {adminAddScore.playerId && getTeamTypeForWeek(scoreManagerWeek) && (() => {
                    const { teammates, teamType, isThreesome } = getTeammatesForWeek(
                      parseInt(adminAddScore.playerId), scoreManagerWeek
                    );
                    const allMembers = [parseInt(adminAddScore.playerId), ...teammates];
                    return (
                      <div className="bg-forest-900/5 border border-forest-900/10 rounded-card p-2 text-sm mb-3">
                        <strong className="text-forest-900">{teamType === '2-person' ? '2-Person' : '4-Person'} Team Score</strong>
                        <span className="text-charcoal-800"> — saving for: {allMembers.map(id => getPlayerById(id)?.name).join(', ')}</span>
                        {isThreesome && <span className="text-gold-600 ml-2">(threesome)</span>}
                      </div>
                    );
                  })()}

                  {/* Birdie/Eagle Holes Selection */}
                  {adminAddScore.playerId && adminAddScore.grossScore && (() => {
                    const week = weeks.find(w => w.id === scoreManagerWeek);
                    const holesThisWeek = week?.nineHoles === 'front'
                      ? courseHoles.slice(0, 9)
                      : courseHoles.slice(9, 18);

                    return (
                      <div className="mb-3">
                        <div className="text-xs text-charcoal-400 mb-2">Select birdie/eagle holes (optional):</div>
                        <div className="flex flex-wrap gap-1">
                          {holesThisWeek.map(hole => {
                            const isBirdie = adminAddScore.birdieHoles.includes(hole.number);
                            const isEagle = adminAddScore.eagleHoles.includes(hole.number);
                            return (
                              <button
                                key={hole.number}
                                onClick={() => {
                                  if (isEagle) {
                                    setAdminAddScore(prev => ({
                                      ...prev,
                                      eagleHoles: prev.eagleHoles.filter(h => h !== hole.number)
                                    }));
                                  } else if (isBirdie) {
                                    setAdminAddScore(prev => ({
                                      ...prev,
                                      birdieHoles: prev.birdieHoles.filter(h => h !== hole.number),
                                      eagleHoles: [...prev.eagleHoles, hole.number]
                                    }));
                                  } else {
                                    setAdminAddScore(prev => ({
                                      ...prev,
                                      birdieHoles: [...prev.birdieHoles, hole.number]
                                    }));
                                  }
                                }}
                                className={`w-10 h-8 rounded text-xs font-bold transition-colors ${
                                  isEagle
                                    ? 'bg-gold-500 text-white'
                                    : isBirdie
                                      ? 'bg-forest-900 text-cream-200'
                                      : 'bg-cream-300 text-charcoal-800 hover:bg-cream-300'
                                }`}
                                title={`Hole ${hole.number} (Par ${hole.par}) - Click: ${isEagle ? 'Remove' : isBirdie ? 'Eagle' : 'Birdie'}`}
                              >
                                {hole.number}
                              </button>
                            );
                          })}
                        </div>
                        <div className="text-xs text-charcoal-400 mt-1">
                          Click once = Birdie (green), twice = Eagle (gold), third = remove
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={async () => {
                      if (!adminAddScore.playerId || !adminAddScore.grossScore) {
                        alert('Please select a player and enter a score');
                        return;
                      }
                      const playerId = parseInt(adminAddScore.playerId);
                      const grossScore = parseInt(adminAddScore.grossScore);
                      const teamType = getTeamTypeForWeek(scoreManagerWeek);
                      const isTeamScore = teamType !== null;

                      if (isTeamScore) {
                        const { teammates, isSolo } = getTeammatesForWeek(playerId, scoreManagerWeek);
                        const allMembers = isSolo ? [playerId] : [playerId, ...teammates];
                        // Weeks where teams enter an already-net team score take no further strokes.
                        const teamManualNetEntry = !!getGameForWeek(scoreManagerWeek)?.manualNetEntry;
                        const { handicap: rawTeamHcp } = getHandicapForWeek(playerId, scoreManagerWeek);
                        const teamHcp = teamManualNetEntry ? 0 : rawTeamHcp;

                        for (const memberId of allMembers) {
                          const member = players.find(p => p.id === memberId);
                          if (!member) continue;
                          const handicap9 = teamHcp;
                          const netScore = grossScore - handicap9;

                          await savePlayerScoreToSupabase(memberId, scoreManagerWeek, grossScore, netScore, handicap9, adminAddScore.birdieHoles, adminAddScore.eagleHoles, true);

                          setPlayerScores(prev => {
                            const existingIdx = prev.findIndex(s => s.player_id === memberId && s.week_id === scoreManagerWeek);
                            if (existingIdx >= 0) {
                              const updated = [...prev];
                              updated[existingIdx] = { player_id: memberId, week_id: scoreManagerWeek, gross_score: grossScore, net_score: netScore, handicap_used: handicap9, birdie_holes: adminAddScore.birdieHoles, eagle_holes: adminAddScore.eagleHoles, is_team_score: true };
                              return updated;
                            }
                            return [...prev, { player_id: memberId, week_id: scoreManagerWeek, gross_score: grossScore, net_score: netScore, handicap_used: handicap9, birdie_holes: adminAddScore.birdieHoles, eagle_holes: adminAddScore.eagleHoles, is_team_score: true }];
                          });
                        }
                      } else {
                        const player = players.find(p => p.id === playerId);
                        const manualNetEntry = !!getGameForWeek(scoreManagerWeek)?.manualNetEntry;
                        const { handicap: rawHandicap9 } = getHandicapForWeek(playerId, scoreManagerWeek);
                        const handicap9 = manualNetEntry ? 0 : rawHandicap9;
                        const netScore = manualNetEntry ? grossScore : grossScore - handicap9;

                        await savePlayerScoreToSupabase(playerId, scoreManagerWeek, grossScore, netScore, handicap9, adminAddScore.birdieHoles, adminAddScore.eagleHoles, false);

                        setPlayerScores(prev => [...prev, {
                          player_id: playerId,
                          week_id: scoreManagerWeek,
                          gross_score: grossScore,
                          net_score: netScore,
                          handicap_used: handicap9,
                          birdie_holes: adminAddScore.birdieHoles,
                          eagle_holes: adminAddScore.eagleHoles,
                          is_team_score: false
                        }]);
                      }

                      await recalculateGiantSkins();
                      setAdminAddScore({ playerId: '', grossScore: '', birdieHoles: [], eagleHoles: [] });
                    }}
                    disabled={!adminAddScore.playerId || !adminAddScore.grossScore}
                    className={`px-4 py-2 rounded-pill text-sm font-medium ${
                      adminAddScore.playerId && adminAddScore.grossScore
                        ? 'bg-forest-900 text-cream-200 hover:bg-forest-800'
                        : 'bg-cream-300 text-charcoal-400 cursor-not-allowed'
                    }`}
                  >
                    Add Score
                  </button>
                </div>

                {(() => {
                  const game = getGameForWeek(scoreManagerWeek);
                  const weekScores = playerScores.filter(s => s.week_id === scoreManagerWeek);
                  const hasHandicaps = weekScores.some(s => s.handicap_used !== 0 || s.net_score !== s.gross_score);
                  if (!game?.noHandicap || !hasHandicaps) return null;
                  return (
                    <div className="mb-3 flex items-center gap-2 bg-gold-100 border border-gold-300 rounded-card p-2">
                      <span className="text-xs text-charcoal-800">
                        No-handicap week — some saved scores still have handicaps applied.
                      </span>
                      <button
                        onClick={async () => {
                          const n = await recountWeekAsGross(scoreManagerWeek);
                          if (n > 0) alert(`Updated ${n} score${n === 1 ? '' : 's'} to count gross only.`);
                        }}
                        className="ml-auto whitespace-nowrap bg-forest-900 text-cream-200 px-3 py-1.5 rounded-pill text-xs font-medium hover:bg-forest-800"
                      >
                        Remove handicaps
                      </button>
                    </div>
                  );
                })()}

                {(() => {
                  const weekScores = playerScores.filter(s => s.week_id === scoreManagerWeek);
                  if (weekScores.length === 0) {
                    return (
                      <div className="text-center py-8 text-charcoal-400">
                        No scores recorded for Week {scoreManagerWeek}
                      </div>
                    );
                  }

                  const week = weeks.find(w => w.id === scoreManagerWeek);
                  const holesThisWeek = week?.nineHoles === 'front'
                    ? courseHoles.slice(0, 9)
                    : courseHoles.slice(9, 18);

                  return (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-cream-300">
                          <tr>
                            <th className="text-left p-2 text-charcoal-800">Player</th>
                            <th className="text-center p-2 text-charcoal-800">Gross</th>
                            <th className="text-center p-2 text-charcoal-800">HCP</th>
                            <th className="text-center p-2 text-charcoal-800">Net</th>
                            <th className="text-center p-2 text-charcoal-800">Birdies/Eagles</th>
                            <th className="text-center p-2 text-charcoal-800">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {weekScores
                            .sort((a, b) => a.net_score - b.net_score)
                            .map(score => {
                              const player = players.find(p => p.id === score.player_id);
                              const isEditing = editingScore?.player_id === score.player_id && editingScore?.week_id === score.week_id;
                              const birdies = score.birdie_holes || [];
                              const eagles = score.eagle_holes || [];

                              return (
                                <tr key={`${score.player_id}-${score.week_id}`} className={`border-b border-charcoal-800/5 ${isEditing ? 'bg-cream-300' : ''}`}>
                                  <td className="p-2 font-medium text-charcoal-950">{player?.name || 'Unknown'}</td>
                                  <td className="p-2 text-center">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        value={editingScore.gross_score}
                                        onChange={(e) => setEditingScore({ ...editingScore, gross_score: parseInt(e.target.value) || 0 })}
                                        className="w-16 border border-charcoal-800/20 rounded-input px-2 py-1 text-center bg-cream-200"
                                      />
                                    ) : (
                                      score.gross_score
                                    )}
                                  </td>
                                  <td className="p-2 text-center text-charcoal-400">-{score.handicap_used}</td>
                                  <td className="p-2 text-center font-bold text-forest-900">
                                    {isEditing
                                      ? (getGameForWeek(score.week_id)?.manualNetEntry
                                          ? editingScore.gross_score
                                          : editingScore.gross_score - getHandicapForWeek(score.player_id, score.week_id).handicap)
                                      : score.net_score}
                                  </td>
                                  <td className="p-2">
                                    {isEditing ? (
                                      <div className="flex flex-wrap gap-1 justify-center">
                                        {holesThisWeek.map(hole => {
                                          const editBirdies = editingScore.birdie_holes || [];
                                          const editEagles = editingScore.eagle_holes || [];
                                          const isBirdie = editBirdies.includes(hole.number);
                                          const isEagle = editEagles.includes(hole.number);
                                          return (
                                            <button
                                              key={hole.number}
                                              onClick={() => {
                                                if (isEagle) {
                                                  setEditingScore(prev => ({
                                                    ...prev,
                                                    eagle_holes: (prev.eagle_holes || []).filter(h => h !== hole.number)
                                                  }));
                                                } else if (isBirdie) {
                                                  setEditingScore(prev => ({
                                                    ...prev,
                                                    birdie_holes: (prev.birdie_holes || []).filter(h => h !== hole.number),
                                                    eagle_holes: [...(prev.eagle_holes || []), hole.number]
                                                  }));
                                                } else {
                                                  setEditingScore(prev => ({
                                                    ...prev,
                                                    birdie_holes: [...(prev.birdie_holes || []), hole.number]
                                                  }));
                                                }
                                              }}
                                              className={`w-7 h-6 rounded text-xs font-bold ${
                                                isEagle
                                                  ? 'bg-gold-500 text-white'
                                                  : isBirdie
                                                    ? 'bg-forest-900 text-cream-200'
                                                    : 'bg-cream-300 text-charcoal-600 hover:bg-cream-300'
                                              }`}
                                              title={`Hole ${hole.number} (Par ${hole.par})`}
                                            >
                                              {hole.number}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    ) : (
                                      <div className="flex gap-1 justify-center flex-wrap">
                                        {birdies.length === 0 && eagles.length === 0 && (
                                          <span className="text-charcoal-400 text-xs">-</span>
                                        )}
                                        {birdies.map(h => (
                                          <span key={`b${h}`} className="bg-forest-900/10 text-forest-900 px-1.5 py-0.5 rounded text-xs font-medium">
                                            #{h}🐦
                                          </span>
                                        ))}
                                        {eagles.map(h => (
                                          <span key={`e${h}`} className="bg-gold-300/40 text-charcoal-950 px-1.5 py-0.5 rounded text-xs font-medium">
                                            #{h}🦅
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2 text-center">
                                    {isEditing ? (
                                      <div className="flex gap-1 justify-center">
                                        <button
                                          onClick={() => updatePlayerScore(
                                            score.player_id,
                                            score.week_id,
                                            editingScore.gross_score,
                                            editingScore.birdie_holes || [],
                                            editingScore.eagle_holes || []
                                          )}
                                          className="bg-forest-900 text-cream-200 px-2 py-1 rounded-pill text-xs hover:bg-forest-800"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingScore(null)}
                                          className="bg-cream-300 text-charcoal-800 px-2 py-1 rounded-pill text-xs hover:bg-cream-300"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex gap-1 justify-center">
                                        <button
                                          onClick={() => setEditingScore({
                                            ...score,
                                            birdie_holes: score.birdie_holes || [],
                                            eagle_holes: score.eagle_holes || []
                                          })}
                                          className="bg-forest-900/10 text-forest-900 px-2 py-1 rounded-pill text-xs hover:bg-forest-900/20"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(`Delete score for ${player?.name}?`)) {
                                              deletePlayerScore(score.player_id, score.week_id);
                                            }
                                          }}
                                          className="bg-red-100 text-red-700 px-2 py-1 rounded-pill text-xs hover:bg-red-200"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          {/* END Manage Player Scores */}

        </div>
      )}
      {/* END WEEK TAB */}

      {/* ─── SEASON TAB ─── */}
      {activeTab === 'season' && (
        <div className="space-y-6">

          {/* Championship Flights */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3 flex items-center justify-between gap-3">
              <h3 className="font-display font-semibold text-charcoal-950">🏁 Championship Flights</h3>
              <button
                onClick={copyFlightList}
                className="bg-forest-900 text-cream-200 px-3 py-1.5 rounded-pill text-sm hover:bg-forest-800 whitespace-nowrap"
              >
                {copiedFlights ? 'Copied!' : 'Copy list'}
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-charcoal-600">
                Seeded off season money won outside the Championship weeks, so flights stay put as the final
                payouts are entered. Ties on money break on weeks played; players level on both share a rank
                and stay in the same flight.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {flightStandings.map(flight => (
                  <div key={flight.id} className="bg-cream-100 rounded-card border border-charcoal-800/10 overflow-hidden">
                    <div className="px-3 py-2 border-b border-charcoal-800/10">
                      <div className="font-display font-bold text-charcoal-950">
                        {flight.name} <span className="text-charcoal-400 font-sans font-normal text-sm">({flight.players.length})</span>
                      </div>
                      <div className="text-xs text-charcoal-400">{flight.description}</div>
                    </div>
                    <div className="divide-y divide-charcoal-800/5">
                      {flight.players.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-charcoal-400">No players yet</div>
                      ) : flight.players.map(p => (
                        <div key={p.id} className="px-3 py-1.5 flex items-center justify-between gap-2 text-sm">
                          <span className="text-charcoal-800 truncate">
                            <span className="text-charcoal-400 mr-1.5">{p.tied ? 'T' : ''}{p.rank}.</span>
                            {p.name}
                          </span>
                          <span className="text-charcoal-600 whitespace-nowrap">${p.money.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* END Championship Flights */}

          {/* Season Budget & Payouts */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3">
              <h3 className="font-display font-semibold text-charcoal-950">💵 Season Budget & Payouts</h3>
            </div>
            <div className="p-4 space-y-4">

              {/* Season Buy-In Config */}
              <div className="flex items-center justify-between bg-cream-100 rounded-card p-3">
                <div>
                  <div className="text-sm font-medium text-charcoal-800">Season Buy-In</div>
                  <div className="text-xs text-charcoal-400">{fullTimePlayers.length} full-time players</div>
                </div>
                {editBuyIn ? (
                  <div className="flex items-center gap-2">
                    <span className="text-charcoal-400">$</span>
                    <input
                      type="number"
                      value={buyInInput}
                      onChange={(e) => setBuyInInput(e.target.value)}
                      className="w-24 border border-charcoal-800/20 rounded-input px-2 py-1 text-sm bg-cream-200"
                      autoFocus
                    />
                    <button
                      onClick={() => { handleUpdateBuyIn(parseFloat(buyInInput) || 0); setEditBuyIn(false); }}
                      className="bg-forest-900 text-cream-200 px-3 py-1 rounded-pill text-sm hover:bg-forest-800"
                    >Save</button>
                    <button
                      onClick={() => setEditBuyIn(false)}
                      className="text-charcoal-400 hover:text-charcoal-950 text-sm"
                    >Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setBuyInInput(String(seasonBuyIn)); setEditBuyIn(true); }}
                    className="text-lg font-bold text-forest-900 hover:underline"
                  >${seasonBuyIn} / player</button>
                )}
              </div>

              {/* Budget Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-forest-900/5 border border-forest-900/20 rounded-card p-3 text-center">
                  <div className="text-xs text-forest-900 font-medium">Collected</div>
                  <div className="text-lg font-bold text-forest-900">${seasonBudget.toLocaleString()}</div>
                </div>
                <div className={`border rounded-card p-3 text-center ${totalPlannedPayouts > seasonBudget ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`text-xs font-medium ${totalPlannedPayouts > seasonBudget ? 'text-red-600' : 'text-blue-600'}`}>Planned</div>
                  <div className={`text-lg font-bold ${totalPlannedPayouts > seasonBudget ? 'text-red-800' : 'text-blue-800'}`}>${totalPlannedPayouts.toLocaleString()}</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-card p-3 text-center">
                  <div className="text-xs text-yellow-600 font-medium">Paid Out</div>
                  <div className="text-lg font-bold text-yellow-800">${totalActualPayouts.toLocaleString()}</div>
                </div>
                <div className={`border rounded-card p-3 text-center ${remainingBudget < 0 ? 'bg-red-50 border-red-200' : 'bg-cream-100 border-charcoal-800/10'}`}>
                  <div className={`text-xs font-medium ${remainingBudget < 0 ? 'text-red-600' : 'text-charcoal-600'}`}>Remaining</div>
                  <div className={`text-lg font-bold ${remainingBudget < 0 ? 'text-red-800' : 'text-charcoal-950'}`}>${remainingBudget.toLocaleString()}</div>
                </div>
              </div>

              {totalPlannedPayouts > seasonBudget && (
                <div className="bg-red-50 border border-red-300 rounded-card p-3 text-sm text-red-700">
                  Planned payouts exceed collected budget by <strong>${(totalPlannedPayouts - seasonBudget).toLocaleString()}</strong>. Adjust templates or buy-in.
                </div>
              )}

              {/* Budget Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-charcoal-400 mb-1">
                  <span>Paid: ${totalActualPayouts.toLocaleString()}</span>
                  <span>Budget: ${seasonBudget.toLocaleString()}</span>
                </div>
                <div className="w-full bg-cream-300 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${totalActualPayouts > seasonBudget ? 'bg-red-500' : 'bg-forest-800'}`}
                    style={{ width: `${Math.min((totalActualPayouts / seasonBudget) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Per-Week Breakdown Table */}
              <div>
                <h4 className="text-sm font-semibold text-charcoal-800 mb-2">Weekly Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-charcoal-400 border-b border-charcoal-800/10">
                        <th className="py-2 pr-2">Wk</th>
                        <th className="py-2 pr-2">Date</th>
                        <th className="py-2 pr-2">Game</th>
                        <th className="py-2 pr-2">Template</th>
                        <th className="py-2 pr-2 text-right">Planned</th>
                        <th className="py-2 text-right">Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeks.map(w => {
                        const game = weeklyGames.find(g => g.weekId === w.id);
                        const templateId = weekTemplateAssignments[w.id];
                        const template = templateId ? getTemplateById(templateId) : null;
                        const planned = getWeekPlannedPayout(w.id);
                        const paid = getWeeklyMoneyTotal(w.id);
                        return (
                          <tr key={w.id} className={`border-b border-charcoal-800/5 ${w.id === selectedWeek ? 'bg-forest-900/5' : ''}`}>
                            <td className="py-2 pr-2 font-medium text-charcoal-950">{w.id}</td>
                            <td className="py-2 pr-2 text-charcoal-600">{formatShortDate(w.date)}</td>
                            <td className="py-2 pr-2 text-charcoal-800 max-w-[120px] truncate">{game?.gameName || '-'}</td>
                            <td className="py-2 pr-2">
                              <select
                                value={templateId || ''}
                                onChange={(e) => handleAssignTemplateToWeek(w.id, e.target.value || null)}
                                className="text-xs border border-charcoal-800/20 rounded px-1 py-0.5 max-w-[110px] bg-cream-100"
                              >
                                <option value="">None</option>
                                {payoutTemplates.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2 text-right text-charcoal-800">{planned ? `$${planned}` : '-'}</td>
                            <td className={`py-2 text-right ${paid > 0 ? 'text-forest-900 font-medium' : 'text-charcoal-400'}`}>
                              {paid > 0 ? `$${paid}` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-charcoal-800/20 font-semibold">
                        <td colSpan={4} className="py-2 text-right pr-2 text-charcoal-800">Totals:</td>
                        <td className="py-2 pr-2 text-right text-charcoal-950">${totalPlannedPayouts.toLocaleString()}</td>
                        <td className="py-2 text-right text-forest-900">${totalActualPayouts.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          {/* END Season Budget */}

          {/* Payout Templates */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-charcoal-950">📋 Payout Templates</h3>
              {!templateForm && (
                <button
                  onClick={() => {
                    setTemplateForm({
                      id: '', name: '', payouts: [{ label: '', category: '1st', amount: '' }], sideGameTotal: '30', sideGameName: '', sideGameDescription: '', isDefault: false
                    });
                  }}
                  className="bg-forest-900 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-800 text-sm font-medium"
                >+ Add Template</button>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Template Add/Edit Form */}
              {templateForm && (
                <div className="border-2 border-forest-800/20 rounded-card p-4 bg-cream-100 space-y-3">
                  <h4 className="font-semibold text-charcoal-950">{templateForm.id ? 'Edit Template' : 'New Template'}</h4>
                  <div>
                    <label className="text-sm text-charcoal-600">Template Name</label>
                    <input
                      type="text"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="e.g., Standard Week"
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 text-sm bg-cream-200"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-charcoal-600">Payout Breakdown</label>
                    <div className="space-y-2">
                      {templateForm.payouts.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={p.label}
                            onChange={(e) => {
                              const updated = [...templateForm.payouts];
                              updated[idx] = { ...updated[idx], label: e.target.value };
                              setTemplateForm({ ...templateForm, payouts: updated });
                            }}
                            placeholder="Label (e.g., 1st Place)"
                            className="flex-1 border border-charcoal-800/20 rounded-input px-2 py-1.5 text-sm bg-cream-200"
                          />
                          <select
                            value={p.category}
                            onChange={(e) => {
                              const updated = [...templateForm.payouts];
                              updated[idx] = { ...updated[idx], category: e.target.value };
                              setTemplateForm({ ...templateForm, payouts: updated });
                            }}
                            className="border border-charcoal-800/20 rounded-input px-2 py-1.5 text-sm w-28 bg-cream-200"
                          >
                            {moneyCategories.filter(c => !c.id.startsWith('ctp')).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                          <div className="flex items-center">
                            <span className="text-charcoal-400 text-sm">$</span>
                            <input
                              type="number"
                              value={p.amount}
                              onChange={(e) => {
                                const updated = [...templateForm.payouts];
                                updated[idx] = { ...updated[idx], amount: e.target.value };
                                setTemplateForm({ ...templateForm, payouts: updated });
                              }}
                              placeholder="0"
                              className="w-20 border border-charcoal-800/20 rounded-input px-2 py-1.5 text-sm bg-cream-200"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const updated = templateForm.payouts.filter((_, i) => i !== idx);
                              setTemplateForm({ ...templateForm, payouts: updated });
                            }}
                            className="text-red-500 hover:text-red-700 text-lg"
                          >×</button>
                        </div>
                      ))}
                      <button
                        onClick={() => setTemplateForm({
                          ...templateForm,
                          payouts: [...templateForm.payouts, { label: '', category: '1st', amount: '' }]
                        })}
                        className="text-forest-900 hover:text-forest-800 text-sm font-medium"
                      >+ Add Payout Row</button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-charcoal-600">Side Game Name</label>
                    <input
                      type="text"
                      value={templateForm.sideGameName}
                      onChange={(e) => setTemplateForm({ ...templateForm, sideGameName: e.target.value })}
                      placeholder="e.g., Greenies"
                      className="w-full border border-charcoal-800/20 rounded-input px-2 py-1.5 text-sm bg-cream-200"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-charcoal-600">Side Game Description</label>
                    <input
                      type="text"
                      value={templateForm.sideGameDescription}
                      onChange={(e) => setTemplateForm({ ...templateForm, sideGameDescription: e.target.value })}
                      placeholder="e.g., $10 per greenie (3 holes = $30 total)"
                      className="w-full border border-charcoal-800/20 rounded-input px-2 py-1.5 text-sm bg-cream-200"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-charcoal-600">Side Game Total</label>
                    <div className="flex items-center gap-1">
                      <span className="text-charcoal-400">$</span>
                      <input
                        type="number"
                        value={templateForm.sideGameTotal}
                        onChange={(e) => setTemplateForm({ ...templateForm, sideGameTotal: e.target.value })}
                        className="w-24 border border-charcoal-800/20 rounded-input px-2 py-1.5 text-sm bg-cream-200"
                      />
                    </div>
                  </div>

                  <div className="text-sm text-charcoal-600">
                    Template Total: <strong className="text-charcoal-950">${(
                      templateForm.payouts.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0) +
                      (parseFloat(templateForm.sideGameTotal) || 0)
                    ).toLocaleString()}</strong>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!templateForm.name.trim()) { alert('Template name is required.'); return; }
                        // Give every payout a stable, dash-free entry key. Existing
                        // keys are preserved; duplicate categories get a numeric
                        // suffix so their money entries don't overwrite each other.
                        const usedKeys = new Set();
                        const payouts = templateForm.payouts.filter(p => p.label && p.amount).map(p => {
                          let key = (p.key || p.category || '').replace(/-/g, '');
                          if (usedKeys.has(key)) {
                            let n = 2;
                            while (usedKeys.has(`${key}${n}`)) n++;
                            key = `${key}${n}`;
                          }
                          usedKeys.add(key);
                          return { label: p.label, category: p.category, amount: parseFloat(p.amount) || 0, key };
                        });
                        const template = {
                          id: templateForm.id || templateForm.name.toLowerCase().replace(/\s+/g, '-'),
                          name: templateForm.name,
                          payouts,
                          sideGameTotal: parseFloat(templateForm.sideGameTotal) || 0,
                          sideGameName: templateForm.sideGameName || '',
                          sideGameDescription: templateForm.sideGameDescription || '',
                          isDefault: templateForm.isDefault || false
                        };
                        handleSavePayoutTemplate(template);
                        setTemplateForm(null);
                      }}
                      className="bg-forest-900 text-cream-200 px-4 py-2 rounded-pill hover:bg-forest-800 text-sm font-medium"
                    >Save Template</button>
                    <button
                      onClick={() => setTemplateForm(null)}
                      className="px-4 py-2 border border-charcoal-800/20 rounded-pill hover:bg-cream-300 text-sm text-charcoal-950"
                    >Cancel</button>
                  </div>
                </div>
              )}

              {/* Existing Templates List */}
              {payoutTemplates.map(t => {
                const mainTotal = t.payouts.reduce((s, p) => s + p.amount, 0);
                const total = mainTotal + (t.sideGameTotal || 0);
                const weeksUsingThis = Object.entries(weekTemplateAssignments).filter(([, tid]) => tid === t.id).length;
                return (
                  <div key={t.id} className="border border-charcoal-800/10 rounded-card p-3 bg-cream-100">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-charcoal-950">{t.name}</span>
                        {t.isDefault && <span className="ml-2 bg-forest-900/10 text-forest-900 text-xs px-2 py-0.5 rounded-pill">Default</span>}
                        <span className="ml-2 text-xs text-charcoal-400">{weeksUsingThis} week{weeksUsingThis !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-forest-900">${total}</span>
                        <button
                          onClick={() => {
                            setTemplateForm({
                              ...t,
                              payouts: t.payouts.map(p => ({ ...p, amount: String(p.amount) })),
                              sideGameTotal: String(t.sideGameTotal || 0),
                              sideGameName: t.sideGameName || '',
                              sideGameDescription: t.sideGameDescription || ''
                            });
                          }}
                          className="text-forest-900 hover:text-forest-800 text-sm"
                        >Edit</button>
                        <button
                          onClick={() => handleDeletePayoutTemplate(t.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >Delete</button>
                      </div>
                    </div>
                    {t.payouts.length > 0 && (
                      <div className="text-xs text-charcoal-600 space-y-0.5">
                        {t.payouts.map((p, i) => (
                          <div key={i}>{p.label}: ${p.amount}</div>
                        ))}
                        {t.sideGameTotal > 0 && <div>Side Game: ${t.sideGameTotal}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* END Payout Templates */}

          {/* Giant Skins Manager */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 py-3">
              <h3 className="font-display font-semibold text-charcoal-950">🏆 Giant Skins Manager</h3>
            </div>
            <div className="p-4 space-y-4">

              {/* Add Player to Hole */}
              <div className="bg-cream-100 rounded-card p-4">
                <h4 className="font-medium text-charcoal-950 mb-3">Add Player to Hole</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-charcoal-600 mb-1">Hole</label>
                    <select
                      value={giantSkinsAddForm.holeNumber}
                      onChange={(e) => setGiantSkinsAddForm(prev => ({ ...prev, holeNumber: e.target.value }))}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 text-sm bg-cream-200"
                    >
                      <option value="">Select hole...</option>
                      {courseHoles.map(h => (
                        <option key={h.number} value={h.number}>Hole {h.number} (Par {h.par})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-charcoal-600 mb-1">Player</label>
                    <select
                      value={giantSkinsAddForm.playerId}
                      onChange={(e) => setGiantSkinsAddForm(prev => ({ ...prev, playerId: e.target.value }))}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 text-sm bg-cream-200"
                    >
                      <option value="">Select player...</option>
                      {players.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-charcoal-600 mb-1">Type</label>
                    <div className="flex gap-2 items-center h-[38px]">
                      <label className="flex items-center gap-1 text-sm text-charcoal-800">
                        <input
                          type="radio"
                          name="skinType"
                          value="birdie"
                          checked={giantSkinsAddForm.type === 'birdie'}
                          onChange={() => setGiantSkinsAddForm(prev => ({ ...prev, type: 'birdie' }))}
                        />
                        Birdie
                      </label>
                      {(() => {
                        const selectedHole = courseHoles.find(h => h.number === parseInt(giantSkinsAddForm.holeNumber));
                        if (selectedHole && selectedHole.par >= 4) {
                          return (
                            <label className="flex items-center gap-1 text-sm text-charcoal-800">
                              <input
                                type="radio"
                                name="skinType"
                                value="eagle"
                                checked={giantSkinsAddForm.type === 'eagle'}
                                onChange={() => setGiantSkinsAddForm(prev => ({ ...prev, type: 'eagle' }))}
                              />
                              Eagle
                            </label>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!giantSkinsAddForm.holeNumber || !giantSkinsAddForm.playerId) {
                      alert('Please select a hole and a player');
                      return;
                    }
                    addPlayerToGiantSkin(
                      parseInt(giantSkinsAddForm.holeNumber),
                      parseInt(giantSkinsAddForm.playerId),
                      giantSkinsAddForm.type
                    );
                    setGiantSkinsAddForm({ holeNumber: '', playerId: '', type: 'birdie' });
                  }}
                  disabled={!giantSkinsAddForm.holeNumber || !giantSkinsAddForm.playerId}
                  className={`mt-3 px-4 py-2 rounded-pill text-sm font-medium ${
                    giantSkinsAddForm.holeNumber && giantSkinsAddForm.playerId
                      ? 'bg-forest-900 text-cream-200 hover:bg-forest-800'
                      : 'bg-cream-300 text-charcoal-400 cursor-not-allowed'
                  }`}
                >
                  Add to Hole
                </button>
              </div>

              {/* Front 9 */}
              <div>
                <h4 className="font-medium text-charcoal-800 mb-2">Front 9</h4>
                <div className="space-y-1">
                  {giantSkins.slice(0, 9).map(hole => {
                    const hasPlayers = hole.players && hole.players.length > 0;
                    return (
                      <div key={hole.number} className="flex items-center justify-between bg-cream-100 rounded-card px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-cream-300 rounded-full flex items-center justify-center text-sm font-bold text-charcoal-950">{hole.number}</span>
                          <span className="text-sm text-charcoal-400">Par {hole.par}</span>
                          {hasPlayers && (
                            <span className="text-sm font-bold text-gold-600">Low: {hole.lowScore}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {hasPlayers ? (
                            hole.players.map((p, idx) => {
                              const player = getPlayerById(p.playerId);
                              const scoreType = hole.lowScore === hole.par - 2 ? 'Eagle' : 'Birdie';
                              return (
                                <div key={`${p.playerId}-${idx}`} className="flex items-center gap-1 bg-cream-200 rounded-card px-2 py-1 border border-charcoal-800/10 text-sm">
                                  <span className="text-charcoal-950">{player?.name || 'Unknown'}</span>
                                  <span className={`text-xs px-1 rounded ${scoreType === 'Eagle' ? 'bg-gold-300/40 text-charcoal-950' : 'bg-forest-900/10 text-forest-900'}`}>
                                    {scoreType}
                                  </span>
                                  {hole.par >= 4 && (
                                    <button
                                      onClick={() => editGiantSkinType(hole.number, p.playerId, scoreType === 'Birdie' ? 'eagle' : 'birdie')}
                                      className="text-forest-900 hover:text-forest-800 text-xs ml-1"
                                      title={`Switch to ${scoreType === 'Birdie' ? 'Eagle' : 'Birdie'}`}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm(`Remove ${player?.name || 'this player'} from Hole ${hole.number}?`)) {
                                        removePlayerFromGiantSkin(hole.number, p.playerId);
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs ml-1"
                                    title="Remove from hole"
                                  >
                                    X
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-sm text-charcoal-400">No score yet</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Back 9 */}
              <div>
                <h4 className="font-medium text-charcoal-800 mb-2">Back 9</h4>
                <div className="space-y-1">
                  {giantSkins.slice(9, 18).map(hole => {
                    const hasPlayers = hole.players && hole.players.length > 0;
                    return (
                      <div key={hole.number} className="flex items-center justify-between bg-cream-100 rounded-card px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 bg-cream-300 rounded-full flex items-center justify-center text-sm font-bold text-charcoal-950">{hole.number}</span>
                          <span className="text-sm text-charcoal-400">Par {hole.par}</span>
                          {hasPlayers && (
                            <span className="text-sm font-bold text-gold-600">Low: {hole.lowScore}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {hasPlayers ? (
                            hole.players.map((p, idx) => {
                              const player = getPlayerById(p.playerId);
                              const scoreType = hole.lowScore === hole.par - 2 ? 'Eagle' : 'Birdie';
                              return (
                                <div key={`${p.playerId}-${idx}`} className="flex items-center gap-1 bg-cream-200 rounded-card px-2 py-1 border border-charcoal-800/10 text-sm">
                                  <span className="text-charcoal-950">{player?.name || 'Unknown'}</span>
                                  <span className={`text-xs px-1 rounded ${scoreType === 'Eagle' ? 'bg-gold-300/40 text-charcoal-950' : 'bg-forest-900/10 text-forest-900'}`}>
                                    {scoreType}
                                  </span>
                                  {hole.par >= 4 && (
                                    <button
                                      onClick={() => editGiantSkinType(hole.number, p.playerId, scoreType === 'Birdie' ? 'eagle' : 'birdie')}
                                      className="text-forest-900 hover:text-forest-800 text-xs ml-1"
                                      title={`Switch to ${scoreType === 'Birdie' ? 'Eagle' : 'Birdie'}`}
                                    >
                                      Edit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => {
                                      if (confirm(`Remove ${player?.name || 'this player'} from Hole ${hole.number}?`)) {
                                        removePlayerFromGiantSkin(hole.number, p.playerId);
                                      }
                                    }}
                                    className="text-red-500 hover:text-red-700 text-xs ml-1"
                                    title="Remove from hole"
                                  >
                                    X
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-sm text-charcoal-400">No score yet</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {/* END Giant Skins */}

          {/* Reset Data */}
          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-red-900 px-4 py-3">
              <h3 className="text-white font-display font-semibold">🗑️ Reset Data</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Reset Single Week */}
              <div className="bg-cream-100 rounded-card p-4">
                <h4 className="font-medium text-charcoal-950 mb-2">Reset Single Week</h4>
                <p className="text-sm text-charcoal-600 mb-3">
                  Clear all data (schedule, scores, money, giant skins) for a specific week only.
                </p>
                <div className="flex gap-2">
                  <select
                    value={resetWeekId || ''}
                    onChange={(e) => setResetWeekId(e.target.value ? parseInt(e.target.value) : null)}
                    className="flex-1 border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-200"
                  >
                    <option value="">Select a week...</option>
                    {weeks.filter(w => w.teeSheet.length > 0 || w.scoresEntered || w.moneyEntered).map(w => (
                      <option key={w.id} value={w.id}>
                        Week {w.id} - {formatShortDate(w.date)}
                        {w.teeSheet.length > 0 ? ' (has schedule)' : ''}
                        {w.moneyEntered ? ' (has money)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => resetWeekId && setShowResetConfirm('week')}
                    disabled={!resetWeekId}
                    className={`px-4 py-2 rounded-pill font-medium text-sm ${
                      resetWeekId
                        ? 'bg-red-700 text-white hover:bg-red-800'
                        : 'bg-cream-300 text-charcoal-400 cursor-not-allowed'
                    }`}
                  >
                    Reset Week
                  </button>
                </div>
              </div>

              {/* Reset All Options */}
              <div>
                <h4 className="font-medium text-charcoal-950 mb-2">Reset All Season Data</h4>
                <p className="text-sm text-charcoal-600 mb-3">
                  Clear data across the entire season. This cannot be undone.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <button
                    onClick={() => setShowResetConfirm('money')}
                    className="bg-orange-100 text-orange-700 px-4 py-3 rounded-card hover:bg-orange-200 font-medium text-sm"
                  >
                    💰 All Money
                  </button>
                  <button
                    onClick={() => setShowResetConfirm('scores')}
                    className="bg-cyan-100 text-cyan-700 px-4 py-3 rounded-card hover:bg-cyan-200 font-medium text-sm"
                  >
                    📊 All Scores
                  </button>
                  <button
                    onClick={() => setShowResetConfirm('teeSheets')}
                    className="bg-blue-100 text-blue-700 px-4 py-3 rounded-card hover:bg-blue-200 font-medium text-sm"
                  >
                    📅 All Schedules
                  </button>
                  <button
                    onClick={() => setShowResetConfirm('giantSkins')}
                    className="bg-purple-100 text-purple-700 px-4 py-3 rounded-card hover:bg-purple-200 font-medium text-sm"
                  >
                    🏆 All Giant Skins
                  </button>
                  <button
                    onClick={() => setShowResetConfirm('all')}
                    className="bg-red-100 text-red-700 px-4 py-3 rounded-card hover:bg-red-200 font-medium text-sm"
                  >
                    ⚠️ Everything
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* END Reset Data */}

        </div>
      )}
      {/* END SEASON TAB */}

      {/* ─── PLAYERS TAB ─── */}
      {activeTab === 'players' && (
        <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
          <div className="bg-cream-300 px-4 py-3 flex items-center justify-between">
            <h3 className="font-display font-semibold text-charcoal-950">👤 Player Management</h3>
            {!showPlayerEditor && !showAddPlayer && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const csvPlayers = players.filter(p => p.type === 'full-time');
                    const rows = [
                      ['Full Name', 'Email', 'Phone'],
                      ...csvPlayers.map(p => [p.name, p.email, p.phone])
                    ];
                    const csv = rows.map(r => r.map(v => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'full-time-players.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="bg-forest-800 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-700 text-sm font-medium"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportPlayersPdf}
                  className="bg-gold-500 text-forest-950 px-3 py-1 rounded-pill hover:bg-gold-400 text-sm font-medium"
                >
                  Export PDF
                </button>
                <button
                  onClick={() => setShowAddPlayer(true)}
                  className="bg-forest-900 text-cream-200 px-3 py-1 rounded-pill hover:bg-forest-800 text-sm font-medium"
                >
                  + Add Player
                </button>
              </div>
            )}
          </div>

          <div className="p-4">
            {showAddPlayer ? (
              <div className="space-y-4">
                <h4 className="font-semibold text-charcoal-950">Add New Player</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Name *</label>
                    <input
                      type="text"
                      value={newPlayer.name}
                      onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                      placeholder="Full name"
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">18-Hole Handicap</label>
                    <input
                      type="number"
                      step="0.1"
                      value={newPlayer.handicap}
                      onChange={(e) => setNewPlayer({ ...newPlayer, handicap: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">9-Hole Handicap</label>
                  <div className="w-full border border-charcoal-800/10 rounded-input px-3 py-2 bg-cream-300 text-charcoal-800 font-bold">
                    {calc9HoleHandicap(newPlayer.handicap)}
                    <span className="text-xs font-normal text-charcoal-400 ml-2">(auto-calculated)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Phone</label>
                    <input
                      type="text"
                      value={newPlayer.phone}
                      onChange={(e) => setNewPlayer({ ...newPlayer, phone: e.target.value })}
                      placeholder="e.g., 847-555-1234"
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={newPlayer.email}
                      onChange={(e) => setNewPlayer({ ...newPlayer, email: e.target.value })}
                      placeholder="email@example.com"
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">CDGA ID</label>
                    <input
                      type="text"
                      value={newPlayer.cdgaId}
                      onChange={(e) => setNewPlayer({ ...newPlayer, cdgaId: e.target.value })}
                      placeholder="e.g., 12345678 or N/A"
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Player Type</label>
                    <select
                      value={newPlayer.type}
                      onChange={(e) => setNewPlayer({ ...newPlayer, type: e.target.value })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    >
                      <option value="full-time">Full-Time Member</option>
                      <option value="substitute">Substitute</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-2">Available Tee Times</label>
                  <div className="flex flex-wrap gap-2">
                    {teeTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => toggleNewPlayerAvailability(time)}
                        className={`px-3 py-1 rounded-pill text-sm font-medium transition-colors ${
                          newPlayer.availability.includes(time)
                            ? 'bg-forest-900 text-cream-200'
                            : 'bg-cream-300 text-charcoal-600 hover:bg-cream-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-charcoal-400 mt-2">
                    {newPlayer.availability.length} tee time{newPlayer.availability.length !== 1 ? 's' : ''} selected
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleAddPlayer}
                    disabled={!newPlayer.name.trim()}
                    className={`flex-1 py-2 rounded-pill font-medium ${
                      newPlayer.name.trim()
                        ? 'bg-forest-900 text-cream-200 hover:bg-forest-800'
                        : 'bg-cream-300 text-charcoal-400 cursor-not-allowed'
                    }`}
                  >
                    Add Player
                  </button>
                  <button
                    onClick={() => {
                      setShowAddPlayer(false);
                      setNewPlayer({ name: '', phone: '', email: '', handicap: 0, cdgaId: '', availability: [], type: 'full-time' });
                    }}
                    className="px-4 py-2 border border-charcoal-800/20 rounded-pill hover:bg-cream-300 text-charcoal-950"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : !showPlayerEditor ? (
              <>
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Search players by name..."
                    value={playerSearchTerm}
                    onChange={(e) => setPlayerSearchTerm(e.target.value)}
                    className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredPlayersForAdmin.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-cream-100 rounded-card hover:bg-cream-300 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          player.type === 'substitute' ? 'bg-gold-300/40' : 'bg-forest-900/10'
                        }`}>
                          👤
                        </div>
                        <div>
                          <div className="font-medium text-charcoal-950">{player.name}</div>
                          <div className="text-xs text-charcoal-400">
                            9-HCP: {calc9HoleHandicap(player.handicap)} (18: {player.handicap}) • {player.availability.length} tee times •{' '}
                            <span className={player.type === 'substitute' ? 'text-gold-600' : 'text-forest-900'}>{player.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadPlayerForEdit(player.id)}
                          className="bg-forest-900/10 text-forest-900 px-3 py-1 rounded-pill text-sm hover:bg-forest-900/20"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowRemoveConfirm(player.id)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded-pill text-sm hover:bg-red-200"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-sm text-charcoal-400 text-center">
                  {filteredPlayersForAdmin.length} player{filteredPlayersForAdmin.length !== 1 ? 's' : ''} found
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-charcoal-950">
                    Editing: {players.find(p => p.id === editingPlayerId)?.name}
                  </h4>
                  <span className={`px-2 py-1 rounded-pill text-xs font-medium ${
                    playerEdit.type === 'full-time' ? 'bg-forest-900/10 text-forest-900' : 'bg-gold-300/40 text-charcoal-950'
                  }`}>
                    {playerEdit.type}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Name</label>
                    <input
                      type="text"
                      value={playerEdit.name}
                      onChange={(e) => setPlayerEdit({ ...playerEdit, name: e.target.value })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">18-Hole Handicap</label>
                    <input
                      type="number"
                      step="0.1"
                      value={playerEdit.handicap}
                      onChange={(e) => setPlayerEdit({ ...playerEdit, handicap: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-1">9-Hole Handicap</label>
                  <div className="w-full border border-charcoal-800/10 rounded-input px-3 py-2 bg-cream-300 text-charcoal-800 font-bold">
                    {calc9HoleHandicap(playerEdit.handicap)}
                    <span className="text-xs font-normal text-charcoal-400 ml-2">(auto-calculated)</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Phone</label>
                    <input
                      type="text"
                      value={playerEdit.phone}
                      onChange={(e) => setPlayerEdit({ ...playerEdit, phone: e.target.value })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={playerEdit.email}
                      onChange={(e) => setPlayerEdit({ ...playerEdit, email: e.target.value })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">CDGA ID</label>
                    <input
                      type="text"
                      value={playerEdit.cdgaId}
                      onChange={(e) => setPlayerEdit({ ...playerEdit, cdgaId: e.target.value })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-600 mb-1">Player Type</label>
                    <select
                      value={playerEdit.type}
                      onChange={(e) => setPlayerEdit({ ...playerEdit, type: e.target.value })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2 bg-cream-100"
                    >
                      <option value="full-time">Full-Time Member</option>
                      <option value="substitute">Substitute</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-600 mb-2">Available Tee Times</label>
                  <div className="flex flex-wrap gap-2">
                    {teeTimes.map(time => (
                      <button
                        key={time}
                        onClick={() => toggleAvailability(time)}
                        className={`px-3 py-1 rounded-pill text-sm font-medium transition-colors ${
                          playerEdit.availability.includes(time)
                            ? 'bg-forest-900 text-cream-200'
                            : 'bg-cream-300 text-charcoal-600 hover:bg-cream-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-charcoal-400 mt-2">
                    {playerEdit.availability.length} tee time{playerEdit.availability.length !== 1 ? 's' : ''} selected
                  </p>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={handleSavePlayer}
                    className="flex-1 bg-forest-900 text-cream-200 py-2 rounded-pill hover:bg-forest-800 font-medium"
                  >
                    Save Player
                  </button>
                  <button
                    onClick={() => { setShowPlayerEditor(false); setEditingPlayerId(null); }}
                    className="px-4 py-2 border border-charcoal-800/20 rounded-pill hover:bg-cream-300 text-charcoal-950"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* END PLAYERS TAB */}

      {/* ─── MODALS ─── */}

      {/* Remove Player Confirmation Modal */}
      {showRemoveConfirm && (() => {
        const playerToRemove = players.find(p => p.id === showRemoveConfirm);
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-cream-200 rounded-panel shadow-card-hover max-w-md w-full mx-4 overflow-hidden">
              <div className="bg-red-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">Remove Player</h3>
              </div>
              <div className="p-6">
                <p className="text-charcoal-800 mb-2">
                  Are you sure you want to remove <strong>{playerToRemove?.name}</strong> from the league?
                </p>
                <p className="text-sm text-charcoal-400 mb-4">
                  This will remove them from the player roster. Any existing scores, money, and schedule data will remain in the system.
                </p>
                <p className="text-red-600 font-medium text-sm mb-6">This action cannot be undone!</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRemovePlayer(showRemoveConfirm)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-pill hover:bg-red-700 font-medium"
                  >
                    Yes, Remove Player
                  </button>
                  <button
                    onClick={() => setShowRemoveConfirm(null)}
                    className="flex-1 border border-charcoal-800/20 py-2 rounded-pill hover:bg-cream-300 font-medium text-charcoal-950"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-cream-200 rounded-panel shadow-card-hover max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-700 px-6 py-4">
              <h3 className="text-xl font-bold text-white">⚠️ Confirm Reset</h3>
            </div>
            <div className="p-6">
              <p className="text-charcoal-800 mb-4">
                {showResetConfirm === 'week' && `This will delete all data for Week ${resetWeekId} (schedule, scores, money, and any giant skins set that week).`}
                {showResetConfirm === 'money' && 'This will delete all money entries and reset player totals to $0.'}
                {showResetConfirm === 'scores' && 'This will delete all player scores and reset the Score Leaderboard.'}
                {showResetConfirm === 'teeSheets' && 'This will delete all tee sheets, scores, and schedule data.'}
                {showResetConfirm === 'giantSkins' && 'This will reset all Giant Skins standings.'}
                {showResetConfirm === 'all' && 'This will delete ALL data: money, schedules, scores, and giant skins.'}
              </p>
              <p className="text-red-600 font-medium text-sm mb-6">This action cannot be undone!</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    if (showResetConfirm === 'week') resetSingleWeek(resetWeekId);
                    else if (showResetConfirm === 'money') resetMoneyData();
                    else if (showResetConfirm === 'scores') resetPlayerScores();
                    else if (showResetConfirm === 'teeSheets') resetTeeSheets();
                    else if (showResetConfirm === 'giantSkins') resetGiantSkins();
                    else if (showResetConfirm === 'all') resetAllData();
                  }}
                  className="flex-1 bg-red-600 text-white py-2 rounded-pill hover:bg-red-700 font-medium"
                >
                  Yes, Reset
                </button>
                <button
                  onClick={() => { setShowResetConfirm(null); setResetWeekId(null); }}
                  className="flex-1 border border-charcoal-800/20 py-2 rounded-pill hover:bg-cream-300 font-medium text-charcoal-950"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
