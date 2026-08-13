import React from 'react';

// Championship flight pill. `variant` picks the palette: 'light' sits on cream
// cards, 'dark' sits on the forest/charcoal panels.
const LIGHT_STYLES = {
  A: 'bg-gold-500/20 text-gold-600 border-gold-500/40',
  B: 'bg-forest-900/10 text-forest-800 border-forest-800/30',
  C: 'bg-charcoal-800/10 text-charcoal-600 border-charcoal-800/20'
};

const DARK_STYLES = {
  A: 'bg-gold-500 text-forest-950 border-gold-400',
  B: 'bg-forest-700 text-cream-200 border-forest-700',
  C: 'bg-charcoal-800 text-cream-200 border-charcoal-800'
};

export default function FlightBadge({ flight, variant = 'light', full = false, className = '' }) {
  if (!flight) return null;
  const styles = variant === 'dark' ? DARK_STYLES : LIGHT_STYLES;
  return (
    <span
      title={`${flight.name} — ${flight.description}`}
      className={`inline-flex items-center border rounded-pill px-2 py-0.5 text-xs font-semibold tracking-wide whitespace-nowrap ${styles[flight.id]} ${className}`}
    >
      {full ? flight.name : flight.id}
    </span>
  );
}
