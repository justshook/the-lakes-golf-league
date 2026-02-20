import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLeague } from '../LeagueContext';
import { calc9HoleHandicap, courseHoles } from '../constants';

export default function HomePage() {
  const navigate = useNavigate();
  const {
    weeks, selectedWeek, setSelectedWeek, currentWeek, currentGame,
    showPlayerScoreEntry, setShowPlayerScoreEntry,
    playerScoreForm, setPlayerScoreForm,
    handlePlayerScoreSubmit, toggleHoleSelection,
    getPlayerById, getTeamTypeForWeek, getTeammatesForWeek,
    formatDate, formatShortDate,
    showSubSignup, setShowSubSignup, subSignupSlot, setSubSignupSlot,
    selectedSubId, setSelectedSubId, handleSubSignup,
    players,
  } = useLeague();

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif text-white">Weekly Schedule</h2>
          {(() => {
            const today = new Date().toLocaleDateString('en-CA');
            const isGameDay = weeks.some(w => w.date === today && w.teeSheet.length > 0);
            return (
              <button
                onClick={() => setShowPlayerScoreEntry(true)}
                disabled={!isGameDay}
                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-sm sm:text-base ${
                  isGameDay
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                }`}
                title={!isGameDay ? 'Score entry is only available on game day' : ''}
              >
                <span>📝</span> Submit My Score
              </button>
            );
          })()}
        </div>
        <div className="flex items-center gap-2 justify-center sm:justify-end">
          <button
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek === 1}
            className="px-3 py-2 bg-green-800 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm"
          >
            ← Prev
          </button>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
            className="px-3 sm:px-4 py-2 rounded-lg bg-white border-0 font-medium text-sm sm:text-base"
          >
            {weeks.map(w => (
              <option key={w.id} value={w.id}>Week {w.id} - {formatShortDate(w.date)}</option>
            ))}
          </select>
          <button
            onClick={() => setSelectedWeek(Math.min(weeks.length, selectedWeek + 1))}
            disabled={selectedWeek === weeks.length}
            className="px-3 py-2 bg-green-800 text-white rounded-lg disabled:opacity-50 hover:bg-green-700 text-sm"
          >
            Next →
          </button>
        </div>
      </div>

      {currentWeek && (
        <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-green-800 px-4 sm:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-xl font-serif text-white">Week {currentWeek.id}</h3>
                <p className="text-green-200 text-sm">{formatDate(currentWeek.date)}</p>
              </div>
              <div className={`inline-block px-4 py-2 rounded-full font-bold text-sm self-start sm:self-auto ${
                currentWeek.nineHoles === 'front'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {currentWeek.nineHoles === 'front' ? 'Front 9 (Holes 1-9)' : 'Back 9 (Holes 10-18)'}
              </div>
            </div>
          </div>

          {/* Game Info Section */}
          {currentGame && (
            <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-yellow-50 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xl sm:text-2xl">🎯</span>
                    <h4 className="font-bold text-base sm:text-lg text-green-800">{currentGame.gameName}</h4>
                    {currentGame.teamType && (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        currentGame.teamType === '2-person'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        {currentGame.teamType === '2-person' ? '2-Person Teams' : '4-Person Teams'}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm whitespace-pre-line">{currentGame.gameDescription}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl sm:text-2xl">⭐</span>
                    <h4 className="font-bold text-base sm:text-lg text-yellow-700">Side Game: {currentGame.sideGame}</h4>
                  </div>
                  <p className="text-gray-700 text-xs sm:text-sm">{currentGame.sideGameDescription}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-2 sm:p-6">
            {currentWeek.teeSheet.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-lg">No tee sheet created yet</p>
                <p className="text-sm mt-2">Go to Admin to build or auto-generate the schedule for this week</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4 px-1">
                  <span>{currentWeek.teeSheet.reduce((sum, t) => sum + t.players.length, 0)} players scheduled</span>
                  {currentWeek.moneyEntered && (
                    <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-medium">✓ Money Entered</span>
                  )}
                </div>

                {currentWeek.teeSheet.map((slot, idx) => (
                  <div key={idx} className="p-2 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="font-bold text-green-800 text-lg mb-2 sm:mb-0 sm:float-left sm:w-24 sm:mr-4">{slot.time}</div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                      {slot.players.map((playerId, pIdx) => {
                        const player = getPlayerById(playerId);
                        return (
                          <div
                            key={pIdx}
                            className="bg-white px-2 sm:px-3 py-2 rounded border border-gray-200 flex items-center justify-between"
                          >
                            <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">{player?.name}</div>
                            <div className="text-xs text-gray-500 whitespace-nowrap ml-1">HCP {calc9HoleHandicap(player?.handicap)}</div>
                          </div>
                        );
                      })}
                      {[...Array(4 - slot.players.length)].map((_, i) => (
                        <div
                          key={`empty-${i}`}
                          onClick={() => {
                            setSubSignupSlot({ weekId: selectedWeek, slotIndex: idx, time: slot.time });
                            setSelectedSubId('');
                            setShowSubSignup(true);
                          }}
                          className="bg-green-50 px-2 sm:px-3 py-2 rounded border border-dashed border-green-400 text-green-600 text-xs sm:text-sm text-center cursor-pointer hover:bg-green-100 hover:border-green-500 transition-colors"
                        >
                          + Sign Up
                        </div>
                      ))}
                    </div>
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
            <div className="bg-green-800 px-6 py-4 sticky top-0">
              <h3 className="text-xl font-bold text-white">
                {playerScoreForm.weekId && getTeamTypeForWeek(parseInt(playerScoreForm.weekId))
                  ? '👥 Submit Team Score'
                  : '📝 Submit My Score'}
              </h3>
              <p className="text-green-200 text-sm">
                {playerScoreForm.weekId && getTeamTypeForWeek(parseInt(playerScoreForm.weekId))
                  ? 'Enter your team score and mark any birdies or eagles'
                  : 'Enter your score and mark any birdies or eagles'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Player Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <select
                  value={playerScoreForm.playerId}
                  onChange={(e) => setPlayerScoreForm({ ...playerScoreForm, playerId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select your name...</option>
                  {players.filter(p => p.type === 'full-time').sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Week Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
                {(() => {
                  const today = new Date().toLocaleDateString('en-CA');
                  const todayWeeks = weeks.filter(w => w.teeSheet.length > 0 && w.date === today);

                  if (todayWeeks.length === 0) {
                    return (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
                        Score entry is only available on game day (Mondays). No game is scheduled for today.
                      </div>
                    );
                  }

                  return (
                    <select
                      value={playerScoreForm.weekId}
                      onChange={(e) => setPlayerScoreForm({ ...playerScoreForm, weekId: e.target.value, birdieHoles: [], eagleHoles: [] })}
                      className="w-full border rounded-lg px-3 py-2"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {playerScoreForm.weekId && getTeamTypeForWeek(parseInt(playerScoreForm.weekId))
                    ? 'Team Score (9 holes)'
                    : 'Total Score (9 holes)'}
                </label>
                <input
                  type="number"
                  value={playerScoreForm.totalScore}
                  onChange={(e) => setPlayerScoreForm({ ...playerScoreForm, totalScore: e.target.value })}
                  placeholder="e.g., 42"
                  className="w-full border rounded-lg px-3 py-2"
                  min="20"
                  max="80"
                />
              </div>

              {/* Birdie/Eagle Selection */}
              {playerScoreForm.weekId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mark Birdies & Eagles (tap to select)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
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
                        <div key={hole.number} className="border rounded-lg p-2 text-center">
                          <div className="text-xs text-gray-500 mb-1">Hole {hole.number} (Par {hole.par})</div>
                          <div className="flex gap-1 justify-center">
                            <button
                              type="button"
                              onClick={() => toggleHoleSelection(hole.number, 'birdie')}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                isBirdie
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-600 hover:bg-green-100'
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
                                    : 'bg-gray-100 text-gray-600 hover:bg-yellow-100'
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
                    <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                      {playerScoreForm.birdieHoles.length > 0 && (
                        <p className="text-green-700">
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
                  className="flex-1 bg-green-700 text-white py-3 rounded-lg hover:bg-green-800 font-medium"
                >
                  Submit Score
                </button>
                <button
                  onClick={() => {
                    setShowPlayerScoreEntry(false);
                    setPlayerScoreForm({ playerId: '', weekId: '', totalScore: '', birdieHoles: [], eagleHoles: [] });
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Signup Modal */}
      {showSubSignup && subSignupSlot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-green-800 px-6 py-4">
              <h3 className="text-xl font-bold text-white">Sign Up for Tee Time</h3>
              <p className="text-green-200 text-sm">Week {subSignupSlot.weekId} • {subSignupSlot.time}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-600 text-sm">
                Select your name to sign up for this open tee time slot.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Substitute Name</label>
                <select
                  value={selectedSubId}
                  onChange={(e) => setSelectedSubId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select your name...</option>
                  {players
                    .filter(p => p.type === 'substitute')
                    .filter(p => {
                      const week = weeks.find(w => w.id === subSignupSlot.weekId);
                      if (!week) return true;
                      const playersInWeek = week.teeSheet.flatMap(s => s.players);
                      return !playersInWeek.includes(p.id);
                    })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} (HCP: {calc9HoleHandicap(p.handicap)})</option>
                    ))}
                </select>
              </div>

              {selectedSubId && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm">
                    You'll be added to the <strong>{subSignupSlot.time}</strong> tee time for Week {subSignupSlot.weekId}.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubSignup}
                  disabled={!selectedSubId}
                  className={`flex-1 py-3 rounded-lg font-medium ${
                    selectedSubId
                      ? 'bg-green-700 text-white hover:bg-green-800'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  Confirm Sign Up
                </button>
                <button
                  onClick={() => {
                    setShowSubSignup(false);
                    setSubSignupSlot(null);
                    setSelectedSubId('');
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
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
