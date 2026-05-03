import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useLeague } from '../LeagueContext';
import { calc9HoleHandicap, moneyCategories } from '../constants';

export default function PlayersPage() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const {
    players, selectedPlayer, setSelectedPlayer,
    playerFilter, setPlayerFilter, filteredPlayers,
    playerScores, getPlayerById, getTeamTypeForWeek,
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

  const exportPlayersPdf = () => {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    let y = 18;

    const filterLabel = playerFilter === 'all'
      ? 'All Players'
      : playerFilter === 'full-time' ? 'Members' : 'Substitutes';

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('The Lakes Golf League', pageW / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.text(`Player Roster — ${filterLabel}`, pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • ${filteredPlayers.length} players`,
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

    const sorted = [...filteredPlayers].sort((a, b) =>
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

    const filename = `lakes-players-${playerFilter}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="space-y-4">
      {selectedPlayer ? (
        <div className="space-y-4">
          <button
            onClick={() => navigate('/players')}
            className="text-cream-200/80 hover:text-cream-200 transition-colors flex items-center gap-2"
          >
            ← Back to All Players
          </button>

          <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
            <div className="bg-forest-800 p-4 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl sm:text-2xl font-display font-bold text-cream-200">{selectedPlayer.name}</h3>
                  <div className="text-cream-200/80 text-sm mt-1 space-y-0.5">
                    <div>9-Hole HCP: {calc9HoleHandicap(selectedPlayer.handicap)}</div>
                    <div className="text-cream-200/70 text-sm">18-Hole HCP: {selectedPlayer.handicap}</div>
                    {selectedPlayer.cdgaId && selectedPlayer.cdgaId !== 'N/A' && (
                      <div className="text-cream-200/70 text-sm">CDGA ID: {selectedPlayer.cdgaId}</div>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-pill text-xs font-medium shrink-0 ${
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
                  <div className="text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">Weeks Played</div>
                </div>
                <div className="bg-charcoal-900 border border-white/[0.06] rounded-card p-4 text-center">
                  <div className="font-display text-3xl font-bold text-gold-500">${selectedPlayer.totalMoney}</div>
                  <div className="text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">Total Won</div>
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

                const individualScores = playerScoreData.filter(s => !getTeamTypeForWeek(s.week_id));
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
                        <div className="text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">Avg Gross</div>
                      </div>
                      <div className="bg-charcoal-900 border border-white/[0.06] rounded-card p-3 text-center">
                        <div className="font-display text-2xl font-bold text-gold-500">{avgNet}</div>
                        <div className="text-xs font-semibold tracking-[1.5px] uppercase text-charcoal-600">Avg Net</div>
                      </div>
                    </div>

                    <h4 className="font-semibold text-charcoal-600 mb-2">Weekly Scores</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-cream-300">
                          <tr>
                            <th className="th-label text-left rounded-tl-lg">Week</th>
                            <th className="th-label text-center">Gross</th>
                            <th className="th-label text-center">HCP</th>
                            <th className="th-label text-center rounded-tr-lg">Net</th>
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
                              <td className="p-2 text-center text-charcoal-600">-{score.handicap_used}</td>
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-3xl font-display font-black text-cream-200 leading-none">League Players ({filteredPlayers.length})</h2>
            <div className="flex flex-wrap gap-2">
              {['all', 'full-time', 'substitute'].map(filter => (
                <button
                  key={filter}
                  onClick={() => setPlayerFilter(filter)}
                  className={`px-5 py-2.5 rounded-pill text-sm font-medium transition-all ${
                    playerFilter === filter
                      ? 'bg-cta-500 text-forest-950'
                      : 'bg-forest-800 text-cream-200 hover:bg-forest-700'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter === 'full-time' ? `Members (${players.filter(p => p.type === 'full-time').length})` : `Subs (${players.filter(p => p.type === 'substitute').length})`}
                </button>
              ))}
              <button
                onClick={exportPlayersPdf}
                className="px-5 py-2.5 rounded-pill text-sm font-medium bg-gold-500 text-forest-950 hover:bg-gold-400 transition-all"
              >
                Export PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPlayers.sort((a, b) => calc9HoleHandicap(a.handicap) - calc9HoleHandicap(b.handicap)).map(player => (
              <div
                key={player.id}
                onClick={() => navigate(`/players/${player.id}`)}
                className="bg-cream-200 rounded-card shadow-card p-4 cursor-pointer hover:shadow-card-hover hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-charcoal-950 text-[0.9375rem] truncate">{player.name}</div>
                    <div className="text-sm text-charcoal-600">HCP {calc9HoleHandicap(player.handicap)} • {player.availability.length} times</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-gold-500 font-bold text-[0.9375rem]">${player.totalMoney}</div>
                    <div className="text-sm text-charcoal-600">{player.weeksPlayed}w</div>
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
