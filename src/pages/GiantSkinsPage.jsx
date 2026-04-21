import React from 'react';
import { useLeague } from '../LeagueContext';

export default function GiantSkinsPage() {
  const { giantSkins, getPlayerById } = useLeague();

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-display font-black leading-none">
          <span className="text-cream-200">Giant</span>{' '}
          <span className="text-gold-500">Skins</span>
        </h2>
        <p className="text-cream-200/80 text-[0.9375rem] mt-1">Lowest score on each hole for the entire season wins</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Front 9 */}
        <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
          <div className="bg-cream-300 px-4 py-3 border-b border-charcoal-800/10">
            <h3 className="text-charcoal-950 font-display font-bold">Front 9 (Holes 1–9)</h3>
          </div>
          <div className="divide-y divide-charcoal-800/10">
            {giantSkins.slice(0, 9).map(hole => {
              const hasPlayers = hole.players && hole.players.length > 0;
              return (
                <div key={hole.number} className="flex items-center justify-between p-3 sm:p-4 hover:bg-cream-300/40 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-charcoal-800/10 rounded-full flex items-center justify-center font-bold text-charcoal-950 text-sm sm:text-base">
                      {hole.number}
                    </div>
                    <div>
                      <div className="font-display font-medium text-charcoal-950 text-sm sm:text-base">Hole {hole.number}</div>
                      <div className="text-xs sm:text-sm uppercase tracking-[1.5px] text-charcoal-500">Par {hole.par}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasPlayers ? (
                      <>
                        <div className="font-display text-xl sm:text-2xl font-bold text-gold-600">{hole.lowScore}</div>
                        <div className="text-sm text-charcoal-600">
                          {hole.players.map((p, idx) => {
                            const player = getPlayerById(p.playerId);
                            return (
                              <span key={p.playerId}>
                                {player?.name || 'Unknown'}
                                {idx < hole.players.length - 1 && ', '}
                              </span>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-charcoal-600 text-sm">No score yet</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back 9 */}
        <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
          <div className="bg-cream-300 px-4 py-3 border-b border-charcoal-800/10">
            <h3 className="text-charcoal-950 font-display font-bold">Back 9 (Holes 10–18)</h3>
          </div>
          <div className="divide-y divide-charcoal-800/10">
            {giantSkins.slice(9, 18).map(hole => {
              const hasPlayers = hole.players && hole.players.length > 0;
              return (
                <div key={hole.number} className="flex items-center justify-between p-3 sm:p-4 hover:bg-cream-300/40 transition-colors">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-charcoal-800/10 rounded-full flex items-center justify-center font-bold text-charcoal-950 text-sm sm:text-base">
                      {hole.number}
                    </div>
                    <div>
                      <div className="font-display font-medium text-charcoal-950 text-sm sm:text-base">Hole {hole.number}</div>
                      <div className="text-xs sm:text-sm uppercase tracking-[1.5px] text-charcoal-500">Par {hole.par}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasPlayers ? (
                      <>
                        <div className="font-display text-xl sm:text-2xl font-bold text-gold-600">{hole.lowScore}</div>
                        <div className="text-sm text-charcoal-600">
                          {hole.players.map((p, idx) => {
                            const player = getPlayerById(p.playerId);
                            return (
                              <span key={p.playerId}>
                                {player?.name || 'Unknown'}
                                {idx < hole.players.length - 1 && ', '}
                              </span>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="text-charcoal-600 text-sm">No score yet</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-forest-700 rounded-card p-4 text-white text-[0.9375rem]">
        <strong>How it works:</strong> The player with the lowest score on each hole across the entire season wins a giant skin. At the end of the season the players with a giant skin split the giant skin pot.
      </div>
    </div>
  );
}
