import React from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useLeague } from '../LeagueContext';

export default function Layout() {
  const { isAdminAuthenticated, isLoading } = useLeague();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-forest-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cream-200 text-lg">Loading league data...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/', label: 'Schedule', shortLabel: 'Sched', icon: '📅' },
    { to: '/leaderboard', label: 'Leaderboard', shortLabel: 'Money', icon: '💰' },
    { to: '/players', label: 'Players', shortLabel: 'Players', icon: '👥' },
    { to: '/skins', label: 'Giant Skins', shortLabel: 'Skins', icon: '🏆' },
    ...(isAdminAuthenticated ? [{ to: '/admin', label: 'Admin', shortLabel: 'Admin', icon: '⚙️' }] : []),
  ];

  return (
    <div className="min-h-screen bg-forest-950">
      {/* Header */}
      <header className="bg-forest-950 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div>
            <h1 className="font-serif text-5xl font-semibold text-cream-200 leading-none">The Lakes</h1>
            <p className="font-sans text-xs font-semibold tracking-[3px] uppercase text-gold-500 mt-1.5">Monday Golf League</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-forest-950 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex w-full">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex-1 px-1 sm:px-4 py-3 font-medium transition-colors text-xs sm:text-sm text-center ${
                    isActive
                      ? 'text-cream-200 border-b-2 border-gold-500'
                      : 'text-cream-200/60 hover:text-cream-200'
                  }`
                }
              >
                <span className="sm:mr-1">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                <span className="sm:hidden">{item.shortLabel}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-forest-950 border-t border-white/[0.06] mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-charcoal-400 text-sm">
          Arlington Lakes Golf League • 2026 Season
          <span className="mx-2">•</span>
          <Link to="/admin" className="text-gold-500 hover:text-gold-400 transition-colors">
            {isAdminAuthenticated ? 'Admin' : 'Admin Login'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
