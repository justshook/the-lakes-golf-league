import React from 'react';

export default function RulesPage() {
  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-display font-black leading-none">
          <span className="text-cream-200">League</span>{' '}
          <span className="text-gold-500">Rules</span>
        </h2>
        <p className="text-cream-200/80 text-[0.9375rem] mt-1">Monday Night Golf League — 2026 Season</p>
      </div>

      <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
        <div className="bg-cream-300 px-4 py-3 border-b border-charcoal-800/10">
          <h3 className="text-charcoal-950 font-display font-bold">Monday Night League Rules</h3>
        </div>
        <div className="p-5 space-y-5">
          {/* Handicap note */}
          <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
            The maximum handicap has been raised to <span className="font-semibold">13</span>. This gives the most
            league members the opportunity to win a low net game each week.
          </p>

          {/* League-Specific Rules */}
          <div>
            <h4 className="font-display font-bold text-charcoal-950 text-lg mb-3">League-Specific Rules</h4>
            <ol className="space-y-4 list-none">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-forest-800 text-cream-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  There will be no gimmes or putts given this season. All holes must be finished out.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-forest-800 text-cream-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  A ball hit over the fence and into the army base or onto the road is considered out of bounds.
                  In this situation you must take a drop in a spot where you can take a full swing where the ball
                  went out plus a <span className="font-semibold">2 stroke penalty</span>. There will be no
                  re-teeing or provisional shots.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-forest-800 text-cream-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  All rounds must be completed in <span className="font-semibold">2 hours and 10 minutes</span> or
                  less. If your pace of play is slower than this you will be assigned a tee time after 5pm.
                </p>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
