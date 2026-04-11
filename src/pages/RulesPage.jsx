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
      </div>

      <div className="bg-cream-200 rounded-card shadow-card overflow-hidden">
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
                  The maximum score you can take on any hole is <span className="font-semibold">4 over par</span>.
                  For example, a 9 on a par 5, an 8 on a par 4, and a 7 on a par 3.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-forest-800 text-cream-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  There will be no gimmes or putts given this season. All holes must be finished out.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-forest-800 text-cream-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  A ball hit over the fence and into the army base or onto the road is considered out of bounds.
                  In this situation you can take your ball and place it in the fairway nearest where your ball
                  went out and give yourself <span className="font-semibold">2 club lengths</span> to take a drop
                  plus a <span className="font-semibold">2 stroke penalty</span>. There will be no
                  re-teeing or provisional shots.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-forest-800 text-cream-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">4</span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  Out-of-bounds fences are being played as{' '}
                  <span className="font-semibold">temporary immovable obstructions</span> this season.
                  If your ball comes to rest near an OB fence, you are entitled to{' '}
                  <span className="font-semibold">free relief</span> — drop within{' '}
                  <span className="font-semibold">2 club lengths</span> of the nearest point of relief,
                  no closer to the hole. No penalty stroke.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-forest-800 text-cream-200 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">5</span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  All rounds must be completed in <span className="font-semibold">2 hours and 10 minutes</span> or
                  less. If your pace of play is slower than this you will be assigned a tee time after 5pm.
                </p>
              </li>
            </ol>
          </div>

          {/* General Policies & Etiquette */}
          <div>
            <h4 className="font-display font-bold text-charcoal-950 text-lg mb-3">General Policies &amp; Etiquette</h4>

            <ul className="space-y-4 list-none">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-forest-800 rounded-full mt-2"></span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  Don't be the asshole that doesn't repair your ball marks or rake bunkers after your shot. This is our Monday night sanctuary, treat it like one.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-forest-800 rounded-full mt-2"></span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  <span className="font-semibold">Fees (2026):</span> 9 holes — $19 resident / $23 non-resident. Cart — $13. Residents of Arlington Heights and Rolling Meadows qualify for resident rate.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-forest-800 rounded-full mt-2"></span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  <span className="font-semibold">Carts:</span> Max 2 gas carts per foursome. Single riders pay an extra $12. Keep carts 30' from tee boxes and greens — follow the new exit signs back to cart path.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-forest-800 rounded-full mt-2"></span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  No outside alcohol. No personal coolers. Illinois law.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-forest-800 rounded-full mt-2"></span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  Weather/cancellations are at the league rep's discretion. Call the golf shop if canceling. Rain checks issued at a prorated rate if play is cut short.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-forest-800 rounded-full mt-2"></span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  No play on Memorial Day, Independence Day, or Labor Day — league is not scheduled those days.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-2 h-2 bg-forest-800 rounded-full mt-2"></span>
                <p className="text-charcoal-800 text-[0.9375rem] leading-relaxed">
                  <span className="font-semibold">Behavior:</span> respect everyone, no foul language, no fighting. Violations can result in loss of privileges.
                </p>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
