import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../LeagueContext';
import { calc9HoleHandicap, calcTeamHandicap, courseHoles } from '../constants';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    weeks, selectedWeek, setSelectedWeek, currentWeek, currentGame, getTemplateMoneyEntries,
    showPlayerScoreEntry, setShowPlayerScoreEntry,
    playerScoreForm, setPlayerScoreForm,
    handlePlayerScoreSubmit, handleConfirmedScoreOverwrite, toggleHoleSelection,
    getPlayerById, getTeamTypeForWeek, getTeammatesForWeek,
    showSubSignup, setShowSubSignup, subSignupSlot, setSubSignupSlot,
    selectedSubId, setSelectedSubId, handleSubSignup,
    signupPhoneInput, setSignupPhoneInput,
    showRemoveFromTeeTime, setShowRemoveFromTeeTime,
    removeFromTeeTimeInfo, setRemoveFromTeeTimeInfo,
    removePhoneInput, setRemovePhoneInput,
    handleRemoveFromTeeTime,
    players, isSubmitting,
    scoreOverwriteConfirm, setScoreOverwriteConfirm,
    formatShortDate,
  } = useLeague();

  const today = new Date().toLocaleDateString('en-CA');
  const isGameDay = weeks.some(w => w.date === today && w.teeSheet.length > 0);

  const currentDate = currentWeek ? new Date(currentWeek.date + 'T00:00:00') : null;
  const currentMonth = currentDate ? currentDate.toLocaleDateString('en-US', { month: 'long' }) : '';
  const currentDay = currentDate ? currentDate.getDate() : '';

  return (
    <div className="space-y-4">
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-4xl font-display font-black text-cream-200 leading-none">
            <span className="font-display font-black">{currentMonth}</span>{' '}
            <span className="italic text-gold-500">{currentDay}</span>
          </h2>
        </div>
        <div className="flex items-center gap-4 justify-center sm:justify-end">
          <button
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek === 1}
            className="px-5 py-2.5 bg-forest-800 text-cream-200 rounded-pill disabled:opacity-50 hover:bg-forest-700 text-[0.9375rem] transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => setSelectedWeek(Math.min(weeks.length, selectedWeek + 1))}
            disabled={selectedWeek === weeks.length}
            className="px-5 py-2.5 bg-forest-800 text-cream-200 rounded-pill disabled:opacity-50 hover:bg-forest-700 text-[0.9375rem] transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {currentWeek && (
        <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">

          {/* Game Info Section */}
          {currentGame && (
            <div className="border-b border-charcoal-800/10 bg-cream-300 p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h4 className="font-display font-bold text-2xl sm:text-3xl text-charcoal-950">{currentGame.gameName}</h4>
                {currentGame.teamType && (
                  <span className={`px-2 py-0.5 rounded-pill text-xs font-bold tracking-wide ${
                    currentGame.teamType === '2-person'
                      ? 'bg-forest-900/[0.08] text-forest-900'
                      : 'bg-gold-300 text-forest-950'
                  }`}>
                    {currentGame.teamType === '2-person' ? '2-Person Teams' : '4-Person Teams'}
                  </span>
                )}
              </div>
              <p className="text-charcoal-600 text-sm whitespace-pre-line">{currentGame.gameDescription}</p>
              {(() => {
                const template = getTemplateMoneyEntries(selectedWeek);
                if (!template || template.payouts.length === 0) return null;
                const mainTotal = template.payouts.reduce((sum, p) => sum + p.amount, 0);
                const total = mainTotal + (template.sideGameTotal || 0);
                return (
                  <div className="mt-3">
                    <p className="text-charcoal-600 text-sm mb-1">
                      Payouts (${total} total):
                    </p>
                    <ul className="divide-y divide-charcoal-800/10">
                      {template.payouts.map((p, i) => (
                        <li key={i} className="flex justify-between text-sm text-charcoal-600 py-1">
                          <span>• {p.label}</span>
                          <span>${p.amount}</span>
                        </li>
                      ))}
                      {template.sideGameTotal > 0 && (
                        <li className="flex justify-between text-sm text-charcoal-600 py-1 italic">
                          <span>• {template.sideGameName || 'Side Game'}{template.sideGameDescription ? ` — ${template.sideGameDescription}` : ''}</span>
                          <span>${template.sideGameTotal}</span>
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="p-2 sm:p-6">
            {currentWeek.teeSheet.length === 0 ? (
              <div className="text-center py-12 text-charcoal-600">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg">No tee sheet created yet</p>
                <p className="text-sm mt-2">Go to Admin to build or auto-generate the schedule for this week</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-charcoal-600 mb-4 px-1">
                  <span>{currentWeek.teeSheet.reduce((sum, t) => sum + t.players.length, 0)} players scheduled</span>
                  {currentWeek.moneyEntered && (
                    <span className="bg-gold-300 text-forest-900 px-3 py-1 rounded-pill text-xs font-bold">✓ Money Entered</span>
                  )}
                </div>

                <div className="mb-4 px-1">
                  <span className={`inline-block px-4 py-1.5 rounded-pill font-bold text-xs tracking-wide ${
                    currentWeek.nineHoles === 'front'
                      ? 'bg-gold-300 text-forest-950'
                      : 'bg-cream-300 text-forest-900 border border-charcoal-800/20'
                  }`}>
                    {currentWeek.nineHoles === 'front' ? 'Front 9 (Holes 1-9)' : 'Back 9 (Holes 10-18)'}
                  </span>
                </div>

                {currentWeek.teeSheet.map((slot, idx) => (
                  <div key={idx} className="p-2 sm:p-4 bg-cream-300 rounded-card">
                    <div className="font-display font-bold text-forest-800 text-lg mb-2 sm:mb-0 sm:float-left sm:w-24 sm:mr-4">{slot.time}</div>
                    {currentGame?.teamType === '2-person' ? (
                      (() => {
                        const teamA = [slot.players[0] ?? null, slot.players[1] ?? null];
                        const teamB = [slot.players[2] ?? null, slot.players[3] ?? null];

                        const renderPlayerCard = (playerId) => {
                          const player = getPlayerById(playerId);
                          return (
                            <div className="bg-cream-100 px-2 sm:px-3 py-2 rounded-card border border-charcoal-800/10 flex items-center justify-between">
                              <div className="font-medium text-charcoal-950 text-[0.9375rem] truncate min-w-0">{player?.name}</div>
                              <div className="flex items-center gap-1">
                                <div className="text-sm text-charcoal-600 whitespace-nowrap">HCP {calc9HoleHandicap(player?.handicap)}</div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRemoveFromTeeTimeInfo({ weekId: selectedWeek, slotIndex: idx, playerId, playerName: player?.name, time: slot.time });
                                    setRemovePhoneInput('');
                                    setShowRemoveFromTeeTime(true);
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded-full text-charcoal-400 hover:bg-red-100 hover:text-red-600 transition-colors text-lg leading-none"
                                  title="Remove from tee time"
                                >
                                  −
                                </button>
                              </div>
                            </div>
                          );
                        };

                        const renderEmptySlot = () => (
                          <div
                            onClick={() => {
                              setSubSignupSlot({ weekId: selectedWeek, slotIndex: idx, time: slot.time });
                              setSelectedSubId('');
                              setSignupPhoneInput('');
                              setShowSubSignup(true);
                            }}
                            className="bg-forest-800/10 px-2 sm:px-3 py-2 rounded-card border border-dashed border-forest-700 text-forest-700 text-sm sm:text-[0.9375rem] text-center cursor-pointer hover:bg-forest-800/20 hover:border-forest-600 transition-colors"
                          >
                            + Sign Up
                          </div>
                        );

                        const renderTeamSlot = (playerId) =>
                          playerId !== null ? renderPlayerCard(playerId) : renderEmptySlot();

                        const getTeamHcp = (playerIds) => {
                          const hcps = playerIds.filter(id => id != null).map(id => calc9HoleHandicap(getPlayerById(id)?.handicap));
                          return calcTeamHandicap(hcps, currentGame.handicapFormat || 'scramble');
                        };

                        return (
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 flex flex-col gap-2 p-2 rounded-card border-2 border-forest-800/20">
                              {renderTeamSlot(teamA[0])}
                              {renderTeamSlot(teamA[1])}
                              {currentGame.showTeamHandicap && teamA.some(id => id != null) && (
                                <div className="text-center bg-forest-900/10 rounded-card py-1 px-2">
                                  <span className="text-xs font-bold text-forest-800 tracking-wide">TEAM HCP {getTeamHcp(teamA)}</span>
                                </div>
                              )}
                            </div>
                            <div className="hidden sm:block w-px bg-charcoal-800/10 self-stretch" />
                            <div className="flex-1 flex flex-col gap-2 p-2 rounded-card border-2 border-forest-800/20">
                              {renderTeamSlot(teamB[0])}
                              {renderTeamSlot(teamB[1])}
                              {currentGame.showTeamHandicap && teamB.some(id => id != null) && (
                                <div className="text-center bg-forest-900/10 rounded-card py-1 px-2">
                                  <span className="text-xs font-bold text-forest-800 tracking-wide">TEAM HCP {getTeamHcp(teamB)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3">
                          {slot.players.map((playerId, pIdx) => {
                            const player = getPlayerById(playerId);
                            return (
                              <div
                                key={pIdx}
                                className="bg-cream-100 px-2 sm:px-3 py-2 rounded-card border border-charcoal-800/10 flex items-center justify-between"
                              >
                                <div className="font-medium text-charcoal-950 text-[0.9375rem] truncate min-w-0">{player?.name}</div>
                                <div className="flex items-center gap-1">
                                  <div className="text-sm text-charcoal-600 whitespace-nowrap">HCP {calc9HoleHandicap(player?.handicap)}</div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRemoveFromTeeTimeInfo({ weekId: selectedWeek, slotIndex: idx, playerId, playerName: player?.name, time: slot.time });
                                      setRemovePhoneInput('');
                                      setShowRemoveFromTeeTime(true);
                                    }}
                                    className="w-6 h-6 flex items-center justify-center rounded-full text-charcoal-400 hover:bg-red-100 hover:text-red-600 transition-colors text-lg leading-none"
                                    title="Remove from tee time"
                                  >
                                    −
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {[...Array(4 - slot.players.length)].map((_, i) => (
                            <div
                              key={`empty-${i}`}
                              onClick={() => {
                                setSubSignupSlot({ weekId: selectedWeek, slotIndex: idx, time: slot.time });
                                setSelectedSubId('');
                                setSignupPhoneInput('');
                                setShowSubSignup(true);
                              }}
                              className="bg-forest-800/10 px-2 sm:px-3 py-2 rounded-card border border-dashed border-forest-700 text-forest-700 text-sm sm:text-[0.9375rem] text-center cursor-pointer hover:bg-forest-800/20 hover:border-forest-600 transition-colors"
                            >
                              + Sign Up
                            </div>
                          ))}
                        </div>
                        {currentGame?.showTeamHandicap && currentGame?.teamType === '4-person' && slot.players.length > 0 && (
                          <div className="mt-2 text-center bg-forest-900/10 rounded-card py-1 px-2">
                            <span className="text-xs font-bold text-forest-800 tracking-wide">
                              TEAM HCP {calcTeamHandicap(slot.players.map(id => calc9HoleHandicap(getPlayerById(id)?.handicap)), currentGame.handicapFormat || 'scramble')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player Score Entry Modal */}
      {showPlayerScoreEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-forest-900 px-6 py-4 sticky top-0">
              <h3 className="text-xl font-bold text-white">
                {playerScoreForm.weekId && getTeamTypeForWeek(parseInt(playerScoreForm.weekId))
                  ? '👥 Submit Team Score'
                  : '📝 Submit My Score'}
              </h3>
              <p className="text-cream-200/80 text-sm">
                {playerScoreForm.weekId && getTeamTypeForWeek(parseInt(playerScoreForm.weekId))
                  ? 'Enter your team score and mark any birdies or eagles'
                  : 'Enter your score and mark any birdies or eagles'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Player Selection */}
              <div>
                <label className="block text-sm font-medium text-charcoal-950 mb-1">Your Name</label>
                <select
                  value={playerScoreForm.playerId}
                  onChange={(e) => setPlayerScoreForm({ ...playerScoreForm, playerId: e.target.value, phoneInput: '' })}
                  className="w-full border border-charcoal-800/20 rounded-input px-3 py-2"
                >
                  <option value="">Select your name...</option>
                  {(() => {
                    const today = new Date().toLocaleDateString('en-CA');
                    const yesterdayDate = new Date();
                    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                    const yesterday = yesterdayDate.toLocaleDateString('en-CA');
                    const eligibleWeeks = weeks.filter(w => w.date === today || w.date === yesterday);
                    const playersOnTeeSheet = new Set(eligibleWeeks.flatMap(w => w.teeSheet.flatMap(slot => slot.players)));
                    return players
                      .filter(p => p.type === 'full-time' || playersOnTeeSheet.has(p.id))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ));
                  })()}
                </select>
              </div>

              {/* Phone Verification */}
              {playerScoreForm.playerId && (
                <div>
                  <label className="block text-sm font-medium text-charcoal-950 mb-1">Verify Your Identity</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    value={playerScoreForm.phoneInput}
                    onChange={(e) => setPlayerScoreForm({ ...playerScoreForm, phoneInput: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    placeholder="Last 4 digits of your phone"
                    className="w-full border border-charcoal-800/20 rounded-input px-3 py-2"
                  />
                  <p className="text-sm text-charcoal-600 mt-1">Enter the last 4 digits of your phone number to confirm your identity</p>
                </div>
              )}

              {/* Week Selection */}
              <div>
                <label className="block text-sm font-medium text-charcoal-950 mb-1">Week</label>
                {(() => {
                  const today = new Date().toLocaleDateString('en-CA');
                  const yesterdayDate = new Date();
                  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
                  const yesterday = yesterdayDate.toLocaleDateString('en-CA');
                  const todayWeeks = weeks.filter(w => w.date === today || w.date === yesterday);

                  if (todayWeeks.length === 0) {
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
                        Score entry is only available on game day (Mondays) and the following day. No game is scheduled for today or yesterday.
                      </div>
                    );
                  }

                  return (
                    <select
                      value={playerScoreForm.weekId}
                      onChange={(e) => setPlayerScoreForm({ ...playerScoreForm, weekId: e.target.value, birdieHoles: [], eagleHoles: [] })}
                      className="w-full border border-charcoal-800/20 rounded-input px-3 py-2"
                    >
                      <option value="">Select week...</option>
                      {todayWeeks.map(w => (
                        <option key={w.id} value={w.id}>
                          Week {w.id} - {formatShortDate(w.date)} ({w.nineHoles === 'front' ? 'Front 9' : 'Back 9'})
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* Team Info */}
              {playerScoreForm.playerId && playerScoreForm.weekId && (() => {
                const weekId = parseInt(playerScoreForm.weekId);
                const playerId = parseInt(playerScoreForm.playerId);
                const teamType = getTeamTypeForWeek(weekId);

                if (!teamType) return null;

                const { teammates, isThreesome, isSolo } = getTeammatesForWeek(playerId, weekId);

                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="font-bold text-blue-800 mb-2">
                      {teamType === '2-person' ? '2-Person Team Game' : '4-Person Team Game'}
                    </div>
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Your team:</p>
                      <ul className="list-disc ml-4">
                        <li>{getPlayerById(playerId)?.name} (You)</li>
                        {teammates.map(id => (
                          <li key={id}>{getPlayerById(id)?.name}</li>
                        ))}
                      </ul>
                      {teammates.length > 0 && (
                        <p className="mt-2 text-xs text-blue-600">
                          Your score will be submitted for {teamType === '2-person' ? 'both' : 'all'} team members.
                        </p>
                      )}
                    </div>
                    {isThreesome && (
                      <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded p-2 text-yellow-800 text-xs">
                        Your group is a threesome.
                        {isSolo && ' You are playing as an individual this week.'}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Total Score */}
              <div>
                <label className="block text-sm font-medium text-charcoal-950 mb-1">
                  {playerScoreForm.weekId && getTeamTypeForWeek(parseInt(playerScoreForm.weekId))
                    ? 'Team Score (9 holes)'
                    : 'Total Score (9 holes)'}
                </label>
                <input
                  type="number"
                  value={playerScoreForm.totalScore}
                  onChange={(e) => setPlayerScoreForm({ ...playerScoreForm, totalScore: e.target.value })}
                  placeholder="e.g., 42"
                  className="w-full border border-charcoal-800/20 rounded-input px-3 py-2"
                  min="20"
                  max="80"
                />
              </div>

              {/* Birdie/Eagle Selection - hidden for team game weeks */}
              {playerScoreForm.weekId && !getTeamTypeForWeek(parseInt(playerScoreForm.weekId)) && (
                <div>
                  <label className="block text-sm font-medium text-charcoal-950 mb-2">
                    Mark Birdies & Eagles (tap to select)
                  </label>
                  <p className="text-sm text-charcoal-600 mb-3">
                    These will automatically update Giant Skins if they beat the current low score.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {(weeks.find(w => w.id === parseInt(playerScoreForm.weekId))?.nineHoles === 'front'
                      ? courseHoles.slice(0, 9)
                      : courseHoles.slice(9, 18)
                    ).map(hole => {
                      const isBirdie = playerScoreForm.birdieHoles.includes(hole.number);
                      const isEagle = playerScoreForm.eagleHoles.includes(hole.number);
                      return (
                        <div key={hole.number} className="border border-charcoal-800/20 rounded-lg p-2 text-center">
                          <div className="text-sm text-charcoal-600 mb-1">Hole {hole.number} (Par {hole.par})</div>
                          <div className="flex gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => toggleHoleSelection(hole.number, 'birdie')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                isBirdie
                                  ? 'bg-forest-800 text-cream-200'
                                  : 'bg-cream-300 text-charcoal-600 hover:bg-forest-900/10'
                              }`}
                            >
                              🐦 Birdie
                            </button>
                            {hole.par >= 4 && (
                              <button
                                type="button"
                                onClick={() => toggleHoleSelection(hole.number, 'eagle')}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  isEagle
                                    ? 'bg-yellow-500 text-white'
                                    : 'bg-cream-300 text-charcoal-600 hover:bg-gold-300/50'
                                }`}
                              >
                                🦅 Eagle
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {(playerScoreForm.birdieHoles.length > 0 || playerScoreForm.eagleHoles.length > 0) && (
                    <div className="mt-3 p-3 bg-forest-900/10 rounded-lg text-sm">
                      {playerScoreForm.birdieHoles.length > 0 && (
                        <p className="text-forest-900">
                          🐦 Birdies on: Hole {playerScoreForm.birdieHoles.sort((a,b) => a-b).join(', Hole ')}
                        </p>
                      )}
                      {playerScoreForm.eagleHoles.length > 0 && (
                        <p className="text-yellow-700">
                          🦅 Eagles on: Hole {playerScoreForm.eagleHoles.sort((a,b) => a-b).join(', Hole ')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handlePlayerScoreSubmit}
                  disabled={isSubmitting}
                  className={`flex-1 bg-forest-900 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-forest-800'}`}
                >
                  {isSubmitting && (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {isSubmitting ? 'Submitting…' : 'Submit Score'}
                </button>
                <button
                  onClick={() => {
                    setShowPlayerScoreEntry(false);
                    setPlayerScoreForm({ playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: [], phoneInput: '' });
                  }}
                  className="px-6 py-3 border border-charcoal-800/20 rounded-lg hover:bg-cream-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tee Time Signup Modal */}
      {showSubSignup && subSignupSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-forest-900 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Sign Up for Tee Time</h3>
              <p className="text-cream-200/80 text-sm">Week {subSignupSlot.weekId} • {subSignupSlot.time}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-charcoal-600 text-sm">
                Select your name to sign up for this open tee time slot.
              </p>

              <div>
                <label className="block text-sm font-medium text-charcoal-950 mb-1">Your Name</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => { setSelectedSubId(e.target.value); setSignupPhoneInput(''); }}
                  className="w-full border border-charcoal-800/20 rounded-input px-3 py-2"
                >
                  <option value="">Select your name...</option>
                  {players
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} (HCP: {calc9HoleHandicap(p.handicap)})</option>
                    ))}
                </select>
              </div>

              {selectedSubId && (
                <div>
                  <label className="block text-sm font-medium text-charcoal-950 mb-1">Verify Your Identity</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={4}
                    value={signupPhoneInput}
                    onChange={(e) => setSignupPhoneInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Last 4 digits of your phone"
                    className="w-full border border-charcoal-800/20 rounded-input px-3 py-2"
                  />
                  <p className="text-sm text-charcoal-600 mt-1">Enter the last 4 digits of your phone number to confirm</p>
                </div>
              )}

              {selectedSubId && (() => {
                const week = weeks.find(w => w.id === subSignupSlot.weekId);
                if (!week) return null;
                const existingSlot = week.teeSheet.find(s => s.players.includes(parseInt(selectedSubId)));
                if (existingSlot) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                      <p className="text-yellow-800 text-sm">
                        You're currently in the <strong>{existingSlot.time}</strong> tee time. Signing up here will move you to <strong>{subSignupSlot.time}</strong>.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="bg-forest-900/10 border border-forest-700/30 rounded-lg p-3">
                    <p className="text-forest-900 text-sm">
                      You'll be added to the <strong>{subSignupSlot.time}</strong> tee time for Week {subSignupSlot.weekId}.
                    </p>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubSignup}
                  disabled={!selectedSubId || !signupPhoneInput}
                  className={`flex-1 py-3 rounded-lg font-medium ${
                    selectedSubId && signupPhoneInput
                      ? 'bg-forest-900 text-white hover:bg-forest-800'
                      : 'bg-charcoal-800/20 text-charcoal-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Sign Up
                </button>
                <button
                  onClick={() => {
                    setShowSubSignup(false);
                    setSubSignupSlot(null);
                    setSelectedSubId('');
                    setSignupPhoneInput('');
                  }}
                  className="px-6 py-3 border border-charcoal-800/20 rounded-lg hover:bg-cream-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove from Tee Time Modal */}
      {showRemoveFromTeeTime && removeFromTeeTimeInfo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Remove from Tee Time</h3>
              <p className="text-red-100 text-sm">Week {removeFromTeeTimeInfo.weekId} • {removeFromTeeTimeInfo.time}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-charcoal-950">
                Remove <strong>{removeFromTeeTimeInfo.playerName}</strong> from the <strong>{removeFromTeeTimeInfo.time}</strong> tee time?
              </p>
              <div>
                <label className="block text-sm font-medium text-charcoal-950 mb-1">Verify Your Identity</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  value={removePhoneInput}
                  onChange={(e) => setRemovePhoneInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Last 4 digits of your phone"
                  className="w-full border border-charcoal-800/20 rounded-input px-3 py-2"
                />
                <p className="text-sm text-charcoal-600 mt-1">Enter the last 4 digits of your phone number to confirm</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleRemoveFromTeeTime}
                  disabled={!removePhoneInput}
                  className={`flex-1 py-3 rounded-lg font-medium ${
                    removePhoneInput
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-charcoal-800/20 text-charcoal-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Removal
                </button>
                <button
                  onClick={() => {
                    setShowRemoveFromTeeTime(false);
                    setRemoveFromTeeTimeInfo(null);
                    setRemovePhoneInput('');
                  }}
                  className="px-6 py-3 border border-charcoal-800/20 rounded-lg hover:bg-cream-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score Overwrite Confirmation Dialog */}
      {scoreOverwriteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden">
            <div className="bg-yellow-600 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Score Already Submitted</h3>
            </div>
            <div className="p-6">
              <p className="text-charcoal-950 mb-2">
                You already submitted a score of <strong>{scoreOverwriteConfirm.existingGrossScore}</strong> for this week.
              </p>
              <p className="text-charcoal-950 mb-6">Overwrite it with your new score?</p>
              <div className="flex gap-3">
                <button
                  onClick={handleConfirmedScoreOverwrite}
                  className="flex-1 bg-yellow-600 text-white py-2 rounded-lg hover:bg-yellow-700 font-medium"
                >
                  Yes, Overwrite
                </button>
                <button
                  onClick={() => setScoreOverwriteConfirm(null)}
                  className="flex-1 border border-charcoal-800/20 py-2 rounded-lg hover:bg-cream-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Submit Score Button */}
      <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <button
          onClick={() => setShowPlayerScoreEntry(true)}
          className="pointer-events-auto px-8 py-3.5 font-bold flex items-center gap-2 text-base rounded-pill transition-all shadow-xl bg-cta-500 hover:bg-cta-400 text-forest-950 hover:-translate-y-0.5 hover:shadow-cta-glow"
        >
          <span>📝</span> Submit My Score
        </button>
      </div>
    </div>
  );
}
