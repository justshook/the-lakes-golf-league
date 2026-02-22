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
            className="text-cream-200/60 hover:text-cream-200 transition-colors flex items-center gap-2"
          >
            ← Back to All Players
          </button>

          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-forest-800 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-cream-200">{selectedPlayer.name}</h3>
                  <div className="text-cream-200/60 text-sm mt-1 space-y-0.5">
                    <div>9-Hole HCP: {calc9HoleHandicap(selectedPlayer.handicap)}</div>
                    <div className="text-cream-200/40 text-xs">18-Hole HCP: {selectedPlayer.handicap}</div>
                    {selectedPlayer.cdgaId && selectedPlayer.cdgaId !== 'N/A' && (
                      <div className="text-cream-200/40 text-xs">CDGA ID: {selectedPlayer.cdgaId}</div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-pill text-xs font-medium shrink-0 ${
                  selectedPlayer.type === 'full-time' ? 'bg-forest-700' : 'bg-gold-600'
                } text-cream-200`}>
                  {selectedPlayer.type === 'full-time' ? 'Member' : 'Substitute'}
                </span>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-charcoal-900 border border-white/[0.06] rounded-card p-4 text-center">
                  <div className="font-display text-3xl font-bold text-cream-200">{selectedPlayer.weeksPlayed}</div>
                  <div className="text-[11px] font-semibold tracking-[1.5px] uppercase text-charcoal-400">Weeks Played</div>
                </div>
                <div className="bg-charcoal-900 border border-white/[0.06] rounded-card p-4 text-center">
                  <div className="font-display text-3xl font-bold text-gold-500">${selectedPlayer.totalMoney}</div>
                  <div className="text-[11px] font-semibold tracking-[1.5px] uppercase text-charcoal-400">Total Won</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-charcoal-600 mb-2">Available Tee Times</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedPlayer.availability.map(time => (
                      <span key={time} className="bg-forest-900/[0.08] text-forest-800 px-2 py-1 rounded-pill text-xs font-medium">
                        {time}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold text-charcoal-600 mb-2">Contact Information</h4>
                  <div className="text-charcoal-600 space-y-1">
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
                    <h4 className="font-semibold text-charcoal-600 mb-3">Score Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-charcoal-900 border border-white/[0.06] rounded-card p-3 text-center">
                        <div className="font-display text-2xl font-bold text-cream-200">{avgGross}</div>
                        <div className="text-[11px] font-semibold tracking-[1.5px] uppercase text-charcoal-400">Avg Gross</div>
                      </div>
                      <div className="bg-charcoal-900 border border-white/[0.06] rounded-card p-3 text-center">
                        <div className="font-display text-2xl font-bold text-gold-500">{avgNet}</div>
                        <div className="text-[11px] font-semibold tracking-[1.5px] uppercase text-charcoal-400">Avg Net</div>
                      </div>
                    </div>

                    <h4 className="font-semibold text-charcoal-600 mb-2">Weekly Scores</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-cream-300">
                          <tr>
                            <th className="text-left p-2 rounded-tl-lg text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">Week</th>
                            <th className="text-center p-2 text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">Gross</th>
                            <th className="text-center p-2 text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">HCP</th>
                            <th className="text-center p-2 rounded-tr-lg text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {playerScoreData.sort((a, b) => a.week_id - b.week_id).map(score => (
                            <tr key={score.week_id} className="border-b border-charcoal-800/10">
                              <td className="p-2 text-charcoal-600">
                                Week {score.week_id}
                                {score.is_team_score && <span className="ml-1 text-xs text-gold-600">(team)</span>}
                              </td>
                              <td className="p-2 text-center font-medium">{score.gross_score}</td>
                              <td className="p-2 text-center text-charcoal-400">-{score.handicap_used}</td>
                              <td className="p-2 text-center font-display font-bold text-gold-500">{score.net_score}</td>
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
                  <h4 className="font-semibold text-charcoal-600 mb-3">Weekly Winnings</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedPlayer.weeklyMoney).map(([weekId, categories]) => (
                      <div key={weekId} className="flex items-center justify-between p-3 bg-cream-300 rounded-card">
                        <span className="text-charcoal-600">Week {weekId}</span>
                        <div className="flex items-center gap-2">
                          {Object.entries(categories).map(([cat, amount]) => (
                            <span key={cat} className="text-xs bg-forest-900/[0.08] text-forest-800 px-2 py-1 rounded-pill">
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
            <h2 className="text-3xl font-display font-black text-cream-200 leading-none">League Players ({filteredPlayers.length})</h2>
            <div className="flex gap-2">
              {['all', 'full-time', 'substitute'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setPlayerFilter(filter)}
                  className={`px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                    playerFilter === filter
                      ? 'bg-cta-500 text-forest-950'
                      : 'bg-forest-800 text-cream-200 hover:bg-forest-700'
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
                className="bg-cream-200 rounded-card shadow-card p-3 cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-charcoal-950 text-sm truncate">{player.name}</div>
                    <div className="text-xs text-charcoal-400">HCP {calc9HoleHandicap(player.handicap)} • {player.availability.length} times</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-gold-500 font-bold text-sm">${player.totalMoney}</div>
                    <div className="text-xs text-charcoal-400">{player.weeksPlayed}w</div>
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
