import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLeague } from '../LeagueContext';
import { calc9HoleHandicap, moneyCategories } from '../constants';

export default function PlayersPage() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const {
    players, selectedPlayer, setSelectedPlayer,
    playerFilter, setPlayerFilter, filteredPlayers,
    playerScores, getPlayerById,
  } = useLeague();

  // Sync URL param with selectedPlayer state
  useEffect(() => {
    if (playerId) {
      const player = players.find(p => p.id === parseInt(playerId));
      if (player) {
        setSelectedPlayer(player);
      }
    } else {
      setSelectedPlayer(null);
    }
  }, [playerId, players]);

  return (
    <div className="space-y-4">
      {selectedPlayer ? (
        <div className="space-y-4">
          <button
            onClick={() => navigate('/players')}
            className="text-green-300 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to All Players
          </button>

          <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
            <div className="bg-green-800 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">{selectedPlayer.name}</h3>
                  <div className="text-green-200 text-sm mt-1 space-y-0.5">
                    <div>9-Hole HCP: {calc9HoleHandicap(selectedPlayer.handicap)}</div>
                    <div className="text-green-300 text-xs">18-Hole HCP: {selectedPlayer.handicap}</div>
                    {selectedPlayer.cdgaId && selectedPlayer.cdgaId !== 'N/A' && (
                      <div className="text-green-300 text-xs">CDGA ID: {selectedPlayer.cdgaId}</div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                  selectedPlayer.type === 'full-time' ? 'bg-green-600' : 'bg-yellow-600'
                } text-white`}>
                  {selectedPlayer.type === 'full-time' ? 'Member' : 'Substitute'}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-700">{selectedPlayer.weeksPlayed}</div>
                  <div className="text-sm text-gray-600">Weeks Played</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-700">${selectedPlayer.totalMoney}</div>
                  <div className="text-sm text-gray-600">Total Won</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Available Tee Times</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedPlayer.availability.map(time => (
                      <span key={time} className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                        {time}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Contact Information</h4>
                  <div className="text-gray-600 space-y-1">
                    <div>{selectedPlayer.email}</div>
                    <div>{selectedPlayer.phone}</div>
                  </div>
                </div>
              </div>

              {/* Score Statistics */}
              {(() => {
                const playerScoreData = playerScores.filter(s => s.player_id === selectedPlayer.id);
                if (playerScoreData.length === 0) return null;

                const individualScores = playerScoreData.filter(s => !s.is_team_score);
                const avgGross = individualScores.length > 0
                  ? (individualScores.reduce((sum, s) => sum + s.gross_score, 0) / individualScores.length).toFixed(1)
                  : '-';
                const avgNet = individualScores.length > 0
                  ? (individualScores.reduce((sum, s) => sum + s.net_score, 0) / individualScores.length).toFixed(1)
                  : '-';

                return (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-700 mb-3">Score Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-700">{avgGross}</div>
                        <div className="text-sm text-gray-600">Avg Gross</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-700">{avgNet}</div>
                        <div className="text-sm text-gray-600">Avg Net</div>
                      </div>
                    </div>

                    <h4 className="font-semibold text-gray-700 mb-2">Weekly Scores</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="text-left p-2 rounded-tl-lg">Week</th>
                            <th className="text-center p-2">Gross</th>
                            <th className="text-center p-2">HCP</th>
                            <th className="text-center p-2 rounded-tr-lg">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerScoreData.sort((a, b) => a.week_id - b.week_id).map(score => (
                            <tr key={score.week_id} className="border-b">
                              <td className="p-2 text-gray-600">
                                Week {score.week_id}
                                {score.is_team_score && <span className="ml-1 text-xs text-blue-600">(team)</span>}
                              </td>
                              <td className="p-2 text-center font-medium">{score.gross_score}</td>
                              <td className="p-2 text-center text-gray-500">-{score.handicap_used}</td>
                              <td className="p-2 text-center font-bold text-purple-700">{score.net_score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {Object.keys(selectedPlayer.weeklyMoney).length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-semibold text-gray-700 mb-3">Weekly Winnings</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedPlayer.weeklyMoney).map(([weekId, categories]) => (
                      <div key={weekId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-gray-600">Week {weekId}</span>
                        <div className="flex items-center gap-2">
                          {Object.entries(categories).map(([cat, amount]) => (
                            <span key={cat} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {moneyCategories.find(c => c.id === cat)?.name}: ${amount}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif text-white">League Players ({filteredPlayers.length})</h2>
            <div className="flex gap-2">
              {['all', 'full-time', 'substitute'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setPlayerFilter(filter)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    playerFilter === filter
                      ? 'bg-yellow-600 text-white'
                      : 'bg-green-800 text-green-200 hover:bg-green-700'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'full-time' ? `Members (${players.filter(p => p.type === 'full-time').length})` : `Subs (${players.filter(p => p.type === 'substitute').length})`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlayers.sort((a, b) => calc9HoleHandicap(a.handicap) - calc9HoleHandicap(b.handicap)).map(player => (
              <div
                key={player.id}
                onClick={() => navigate(`/players/${player.id}`)}
                className="bg-white/95 rounded-lg shadow p-3 cursor-pointer hover:shadow-lg hover:scale-[1.01] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm truncate">{player.name}</div>
                    <div className="text-xs text-gray-500">HCP {calc9HoleHandicap(player.handicap)} • {player.availability.length} times</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-bold text-sm">${player.totalMoney}</div>
                    <div className="text-xs text-gray-500">{player.weeksPlayed}w</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
