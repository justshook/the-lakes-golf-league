import React from 'react';
import { useLeague } from '../LeagueContext';
import { moneyCategories } from '../constants';

export default function LeaderboardPage() {
  const {
    players, weeks, selectedWeek, setSelectedWeek,
    leaderboardView, setLeaderboardView,
    sortedByMoney, playerScores, getTeamTypeForWeek,
    getWeeklyMoneyTotal, getPlayerById, formatShortDate,
  } = useLeague();

  return (
    <div className="space-y-4">
      {/* Page Header — always visible */}
      <div className="space-y-3">
        <h2 className="text-3xl font-display font-black leading-none">
          <span className="text-cream-200">Money</span>{' '}
          <span className="text-gold-500">Leaderboard</span>
        </h2>

        {/* Tabs below header */}
        <div className="flex gap-2">
          <button
            onClick={() => setLeaderboardView('season')}
            className={`px-5 py-2.5 rounded-pill font-medium text-sm transition-all ${
              leaderboardView === 'season'
                ? 'bg-cta-500 text-forest-950'
                : 'bg-forest-800 text-cream-200 hover:bg-forest-700'
            }`}
          >
            Season Total
          </button>
          <button
            onClick={() => setLeaderboardView('weekly')}
            className={`px-5 py-2.5 rounded-pill font-medium text-sm transition-all ${
              leaderboardView === 'weekly'
                ? 'bg-cta-500 text-forest-950'
                : 'bg-forest-800 text-cream-200 hover:bg-forest-700'
            }`}
          >
            By Week
          </button>
        </div>
      </div>

      {leaderboardView === 'season' ? (
        <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
          <div className="bg-cream-300 px-4 sm:px-6 py-4 border-b border-charcoal-800/10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-charcoal-950">Season Money Leaders</h3>
              <div className="font-display text-gold-600 font-bold text-sm">
                Total Pot: ${sortedByMoney.reduce((sum, p) => sum + p.totalMoney, 0).toLocaleString()}
              </div>
            </div>
          </div>
          <table className="w-full">
            <thead className="bg-cream-300/60">
              <tr>
                <th className="th-label text-left">Rank</th>
                <th className="th-label text-left">Player</th>
                <th className="th-label text-right">Total Won</th>
              </tr>
            </thead>
            <tbody>
              {sortedByMoney.filter(p => p.totalMoney > 0).map((player, index) => (
                <tr
                  key={player.id}
                  className={`border-b border-charcoal-800/10 hover:bg-cream-300/40 transition-colors ${
                    index === 0 ? 'bg-gold-500/10' : ''
                  }`}
                >
                  <td className="px-2 sm:px-4 py-4">
                    <div className="flex items-center gap-1 sm:gap-2">
                      {index === 0 && <span>🥇</span>}
                      {index === 1 && <span>🥈</span>}
                      {index === 2 && <span>🥉</span>}
                      <span className="font-bold text-charcoal-600">{index + 1}</span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-4 font-display font-semibold text-charcoal-950 text-[0.9375rem] sm:text-base">{player.name}</td>
                  <td className="px-2 sm:px-4 py-4 text-right">
                    <span className="bg-gold-500/20 text-gold-600 px-2 sm:px-4 py-1 rounded-pill font-bold text-[0.9375rem] sm:text-base">
                      ${player.totalMoney.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
              {sortedByMoney.filter(p => p.totalMoney > 0).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-12 text-center text-charcoal-500">
                    No money entered yet. Use Admin to enter weekly winnings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="px-4 py-2 rounded-lg bg-cream-100 border border-charcoal-800/20 font-medium text-charcoal-950"
            >
              {weeks.map(w => (
                <option key={w.id} value={w.id}>Week {w.id} - {formatShortDate(w.date)}</option>
              ))}
            </select>
          </div>

          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-cream-300 px-4 sm:px-6 py-4 border-b border-charcoal-800/10">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-display font-bold text-charcoal-950">Week {selectedWeek} Winnings</h3>
                <div className="font-display text-gold-600 font-bold text-sm">
                  Week Total: ${getWeeklyMoneyTotal(selectedWeek).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {getWeeklyMoneyTotal(selectedWeek) === 0 ? (
                <div className="text-center py-8 text-charcoal-500">
                  No money entered for this week yet
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-display font-semibold text-charcoal-950 mb-3 text-base">Main Game</h4>
                    <div className="space-y-2">
                      {['1st', '2nd', '3rd'].map(place => {
                        const cat = moneyCategories.find(c => c.id === place);
                        const winners = players.filter(p => p.weeklyMoney[selectedWeek]?.[place]);
                        if (winners.length === 0) return null;
                        return (
                          <div key={place} className="flex items-center justify-between p-3 bg-cream-300 rounded-card border border-charcoal-800/10">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{cat.icon}</span>
                              <span className="font-medium text-charcoal-950">{winners.map(w => w.name).join(' & ')}</span>
                            </div>
                            <span className="font-display font-bold text-gold-600">${winners[0].weeklyMoney[selectedWeek][place]}{winners.length > 1 ? ' ea' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-display font-semibold text-charcoal-950 mb-3 text-base">🎯 Closest to Pin</h4>
                    <div className="space-y-2">
                      {['ctp1', 'ctp2', 'ctp3'].map((ctp, idx) => {
                        const winners = players.filter(p => p.weeklyMoney[selectedWeek]?.[ctp]);
                        if (winners.length === 0) return null;
                        return (
                          <div key={ctp} className="flex items-center justify-between p-3 bg-cream-300 rounded-card border border-charcoal-800/10">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-charcoal-500">CTP #{idx + 1}</span>
                              <span className="font-medium text-charcoal-950">{winners.map(w => w.name).join(' & ')}</span>
                            </div>
                            <span className="font-bold text-gold-600">${winners[0].weeklyMoney[selectedWeek][ctp]}{winners.length > 1 ? ' ea' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Score Leaderboard */}
      <div className="mt-8">
        <h2 className="text-3xl font-display font-black leading-none mb-4">
          <span className="text-cream-200">Season</span>{' '}
          <span className="text-gold-500">Leaderboard</span>
        </h2>
        <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
          <div className="bg-cream-300 px-4 sm:px-6 py-4 border-b border-charcoal-800/10">
            <h3 className="text-base font-display font-bold text-charcoal-950">Season Score Leaders (by Avg Net)</h3>
          </div>
          <table className="w-full">
            <thead className="bg-cream-300/60">
              <tr>
                <th className="th-label text-left">Rank</th>
                <th className="th-label text-left">Player</th>
                <th className="th-label text-center">Rounds</th>
                <th className="th-label text-center">Avg Gross</th>
                <th className="th-label text-center">Avg Net</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const playerAverages = players.map(player => {
                  const scores = playerScores.filter(s => s.player_id === player.id && !getTeamTypeForWeek(s.week_id));
                  if (scores.length === 0) return null;
                  return {
                    ...player,
                    rounds: scores.length,
                    avgGross: (scores.reduce((sum, s) => sum + s.gross_score, 0) / scores.length).toFixed(1),
                    avgNet: (scores.reduce((sum, s) => sum + s.net_score, 0) / scores.length).toFixed(1)
                  };
                }).filter(p => p !== null).sort((a, b) => parseFloat(a.avgNet) - parseFloat(b.avgNet));

                if (playerAverages.length === 0) {
                  return (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-charcoal-500">
                        No scores entered yet. Players can submit their scores on the Schedule page.
                      </td>
                    </tr>
                  );
                }

                return playerAverages.map((player, index) => (
                  <tr
                    key={player.id}
                    className={`border-b border-charcoal-800/10 hover:bg-cream-300/40 transition-colors ${
                      index === 0 ? 'bg-gold-500/10' : ''
                    }`}
                  >
                    <td className="px-2 sm:px-4 py-4">
                      <div className="flex items-center gap-1 sm:gap-2">
                        {index === 0 && <span>🥇</span>}
                        {index === 1 && <span>🥈</span>}
                        {index === 2 && <span>🥉</span>}
                        <span className="font-bold text-charcoal-600">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-2 sm:px-4 py-4 font-display font-semibold text-charcoal-950 text-[0.9375rem] sm:text-base">{player.name}</td>
                    <td className="px-2 sm:px-4 py-4 text-center text-charcoal-600">{player.rounds}</td>
                    <td className="px-2 sm:px-4 py-4 text-center">
                      <span className="bg-charcoal-800/10 text-charcoal-600 px-2 py-1 rounded font-medium text-sm">
                        {player.avgGross}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-4 text-center">
                      <span className="bg-forest-800/10 text-forest-900 px-3 py-1 rounded-pill font-bold text-sm">
                        {player.avgNet}
                      </span>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
