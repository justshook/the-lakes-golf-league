import React from 'react';
import { useLeague } from '../LeagueContext';
import { moneyCategories } from '../constants';

export default function LeaderboardPage() {
  const {
    players, weeks, selectedWeek, setSelectedWeek,
    leaderboardView, setLeaderboardView,
    sortedByMoney, playerScores, getTeamTypeForWeek, getTeammatesForWeek,
    getWeeklyMoneyTotal, getPlayerById, formatShortDate,
    getWeekPayouts, payoutEntryKey,
  } = useLeague();

  return (
    <div className="space-y-4">
      {/* Toggle tabs — no page title */}
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

      {leaderboardView === 'season' ? (
        /* Unified season table — money + score columns merged */
        <div className="bg-cream-200 rounded-card shadow-card">
          <div className="bg-cream-300 px-4 sm:px-6 py-4 border-b border-charcoal-800/10">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-bold text-charcoal-950">Season Leaderboard</h3>
              <div className="font-display text-gold-600 font-bold text-sm">
                Total Pot: ${sortedByMoney.reduce((sum, p) => sum + p.totalMoney, 0).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-cream-300/60">
                <tr>
                  <th className="th-label text-left w-16 sticky left-0 z-10 bg-cream-300/60">Rank</th>
                  <th className="th-label text-left sticky left-16 z-10 bg-cream-300/60">Player</th>
                  <th className="th-label text-right">Total Won</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const scoreMap = {};
                  players.forEach(player => {
                    const scores = playerScores.filter(
                      s => s.player_id === player.id && !getTeamTypeForWeek(s.week_id)
                    );
                    scoreMap[player.id] = {
                      rounds: scores.length,
                      avgNet: scores.length > 0
                        ? (scores.reduce((sum, s) => sum + s.net_score, 0) / scores.length).toFixed(1)
                        : null,
                    };
                  });

                  const sorted = players
                    .map(p => ({ ...p, ...scoreMap[p.id] }))
                    .sort((a, b) => {
                      if (b.totalMoney !== a.totalMoney) return b.totalMoney - a.totalMoney;
                      if (a.avgNet === null) return 1;
                      if (b.avgNet === null) return -1;
                      return parseFloat(a.avgNet) - parseFloat(b.avgNet);
                    });

                  let lastMoney = null;
                  let lastRank = 0;
                  const unified = sorted.map((p, i) => {
                    const rank = p.totalMoney === lastMoney ? lastRank : i + 1;
                    lastMoney = p.totalMoney;
                    lastRank = rank;
                    return { ...p, rank };
                  });

                  if (unified.length === 0) {
                    return (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-charcoal-500">
                          No data yet. Scores and winnings will appear here as the season progresses.
                        </td>
                      </tr>
                    );
                  }

                  return unified.map((player) => (
                    <tr
                      key={player.id}
                      className={`group border-b border-charcoal-800/10 transition-colors ${
                        player.rank === 1 ? 'bg-gold-500/10' : ''
                      }`}
                    >
                      <td className={`px-2 sm:px-4 py-4 w-16 sticky left-0 z-10 transition-colors ${
                        player.rank === 1 ? 'bg-gold-500/10 group-hover:bg-gold-500/20' : 'bg-cream-200 group-hover:bg-cream-300/40'
                      }`}>
                        <div className="flex items-center gap-1 sm:gap-2">
                          {player.rank === 1 && <span>🥇</span>}
                          {player.rank === 2 && <span>🥈</span>}
                          {player.rank === 3 && <span>🥉</span>}
                          <span className="font-bold text-charcoal-600">{player.rank}</span>
                        </div>
                      </td>
                      <td className={`px-2 sm:px-4 py-4 sticky left-16 z-10 font-display font-semibold text-charcoal-950 text-[0.9375rem] sm:text-base transition-colors ${
                        player.rank === 1 ? 'bg-gold-500/10 group-hover:bg-gold-500/20' : 'bg-cream-200 group-hover:bg-cream-300/40'
                      }`}>
                        {player.name}
                      </td>
                      <td className="px-2 sm:px-4 py-4 text-right">
                        {player.totalMoney > 0 ? (
                          <span className="bg-gold-500/20 text-gold-600 px-2 sm:px-4 py-1 rounded-pill font-bold text-[0.9375rem] sm:text-base">
                            ${player.totalMoney.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-charcoal-400">—</span>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Prev/Next week navigator */}
          <div className="flex items-center gap-4 justify-center sm:justify-start">
            <button
              onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
              disabled={selectedWeek === 1}
              className="px-5 py-2.5 bg-forest-800 text-cream-200 rounded-pill disabled:opacity-50 hover:bg-forest-700 text-[0.9375rem] transition-colors"
            >
              ← Prev
            </button>
            <span className="font-medium text-cream-200 text-[0.9375rem]">
              Week {selectedWeek}{weeks.find(w => w.id === selectedWeek) ? ` – ${formatShortDate(weeks.find(w => w.id === selectedWeek).date)}` : ''}
            </span>
            <button
              onClick={() => setSelectedWeek(Math.min(weeks.length, selectedWeek + 1))}
              disabled={selectedWeek === weeks.length}
              className="px-5 py-2.5 bg-forest-800 text-cream-200 rounded-pill disabled:opacity-50 hover:bg-forest-700 text-[0.9375rem] transition-colors"
            >
              Next →
            </button>
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
                      {(() => {
                        const templatePayouts = getWeekPayouts(selectedWeek);
                        // Drive the display from the week's payout template when
                        // there is one; otherwise fall back to the classic places.
                        const rows = templatePayouts.length
                          ? templatePayouts.map(p => ({ place: payoutEntryKey(p), label: p.label, category: p.category }))
                          : ['1st', '2nd', '3rd', 'gross'].map(id => {
                              const c = moneyCategories.find(mc => mc.id === id);
                              return { place: id, label: c?.name || id, category: id };
                            });
                        return rows.map(({ place, label, category }, idx) => {
                          const cat = moneyCategories.find(c => c.id === category);
                          const winners = players.filter(p => p.weeklyMoney[selectedWeek]?.[place]);
                          if (winners.length === 0) return null;
                          return (
                            <div key={`${place}-${idx}`} className="flex items-center justify-between p-3 bg-cream-300 rounded-card border border-charcoal-800/10">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{cat?.icon || '🏆'}</span>
                                <span className="font-display font-semibold text-charcoal-950 text-[0.9375rem] sm:text-base">{label}: {winners.map(w => w.name).join(' & ')}</span>
                              </div>
                              <span className="bg-gold-500/20 text-gold-600 px-2 sm:px-4 py-1 rounded-pill font-bold text-[0.9375rem] sm:text-base">${winners[0].weeklyMoney[selectedWeek][place]}{winners.length > 1 ? ' ea' : ''}</span>
                            </div>
                          );
                        });
                      })()}
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
                              <span className="font-display font-semibold text-charcoal-950 text-[0.9375rem] sm:text-base">{winners.map(w => w.name).join(' & ')}</span>
                            </div>
                            <span className="bg-gold-500/20 text-gold-600 px-2 sm:px-4 py-1 rounded-pill font-bold text-[0.9375rem] sm:text-base">${winners[0].weeklyMoney[selectedWeek][ctp]}{winners.length > 1 ? ' ea' : ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Weekly scores table */}
          {(() => {
            const weekScores = playerScores.filter(s => s.week_id === selectedWeek);
            if (weekScores.length === 0) return null;

            const teamType = getTeamTypeForWeek(selectedWeek);
            let rows;

            if (teamType) {
              // Team week: deduplicate by team, show one row per team
              const seen = new Set();
              rows = [];
              weekScores.forEach(score => {
                const { teammates, isSolo } = getTeammatesForWeek(score.player_id, selectedWeek);
                const teamIds = isSolo
                  ? [score.player_id]
                  : [score.player_id, ...teammates].sort((a, b) => a - b);
                const key = teamIds.join('-');
                if (!seen.has(key)) {
                  seen.add(key);
                  rows.push({
                    key,
                    players: teamIds.map(id => getPlayerById(id)).filter(Boolean),
                    gross_score: score.gross_score,
                    net_score: score.net_score,
                  });
                }
              });
              rows.sort((a, b) => a.net_score - b.net_score);
            } else {
              // Individual week: one row per player
              rows = weekScores
                .map(score => ({
                  key: String(score.player_id),
                  players: [getPlayerById(score.player_id)].filter(Boolean),
                  gross_score: score.gross_score,
                  net_score: score.net_score,
                }))
                .filter(row => row.players.length > 0)
                .sort((a, b) => a.net_score - b.net_score);
            }

            if (rows.length === 0) return null;

            return (
              <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
                <div className="bg-cream-300 px-4 sm:px-6 py-4 border-b border-charcoal-800/10">
                  <h3 className="text-base font-display font-bold text-charcoal-950">Week {selectedWeek} Scores</h3>
                </div>
                <table className="w-full">
                  <thead className="bg-cream-300/60">
                    <tr>
                      <th className="th-label text-left">{teamType ? 'Team' : 'Player'}</th>
                      <th className="th-label text-center">Gross</th>
                      <th className="th-label text-center">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => (
                      <tr key={row.key} className="border-b border-charcoal-800/10">
                        <td className="px-2 sm:px-4 py-4 font-display font-semibold text-charcoal-950 text-[0.9375rem] sm:text-base">
                          {row.players.map(p => p.name).join(' & ')}
                        </td>
                        <td className="px-2 sm:px-4 py-4 text-center">
                          <span className="bg-charcoal-800/10 text-charcoal-600 px-3 py-1 rounded-pill font-bold text-[0.9375rem] sm:text-base">
                            {row.gross_score}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-4 text-center">
                          <span className="bg-forest-800/10 text-forest-900 px-3 py-1 rounded-pill font-bold text-[0.9375rem] sm:text-base">
                            {row.net_score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
