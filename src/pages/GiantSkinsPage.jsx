import React from 'react';
import { useLeague } from '../LeagueContext';

export default function GiantSkinsPage() {
  const { giantSkins, getPlayerById } = useLeague();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-serif text-white">Giant Skins</h2>
          <p className="text-green-300 text-sm">Lowest score on each hole for the entire season wins</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-green-800 px-4 py-3">
            <h3 className="text-white font-medium">Front 9 (Holes 1-9)</h3>
          </div>
          <div className="divide-y">
            {giantSkins.slice(0, 9).map(hole => {
              const hasPlayers = hole.players && hole.players.length > 0;
              return (
                <div key={hole.number} className="flex items-center justify-between p-3 sm:p-4 hover:bg-green-50">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-800 text-sm sm:text-base">
                      {hole.number}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-sm sm:text-base">Hole {hole.number}</div>
                      <div className="text-xs sm:text-sm text-gray-500">Par {hole.par}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasPlayers ? (
                      <>
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">{hole.lowScore}</div>
                        <div className="text-xs sm:text-sm text-gray-600">
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
                      <div className="text-gray-400 text-xs sm:text-sm">No score yet</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white/95 rounded-lg shadow-lg overflow-hidden">
          <div className="bg-green-800 px-4 py-3">
            <h3 className="text-white font-medium">Back 9 (Holes 10-18)</h3>
          </div>
          <div className="divide-y">
            {giantSkins.slice(9, 18).map(hole => {
              const hasPlayers = hole.players && hole.players.length > 0;
              return (
                <div key={hole.number} className="flex items-center justify-between p-3 sm:p-4 hover:bg-green-50">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-800 text-sm sm:text-base">
                      {hole.number}
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-sm sm:text-base">Hole {hole.number}</div>
                      <div className="text-xs sm:text-sm text-gray-500">Par {hole.par}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {hasPlayers ? (
                      <>
                        <div className="text-xl sm:text-2xl font-bold text-yellow-600">{hole.lowScore}</div>
                        <div className="text-xs sm:text-sm text-gray-600">
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
                      <div className="text-gray-400 text-xs sm:text-sm">No score yet</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-green-800/50 rounded-lg p-4 text-green-100 text-sm">
        <strong>How it works:</strong> The player with the lowest score on each hole across the entire season wins that hole's pot.
        Ties at season end split the money.
      </div>
    </div>
  );
}
