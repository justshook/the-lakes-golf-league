import React from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useLeague } from '../LeagueContext';

export default function Layout() {
  const { isAdminAuthenticated, isLoading } = useLeague();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading league data...</p>
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
    <div className="min-h-screen bg-gradient-to-b from-green-900 via-green-800 to-green-900">
      {/* Header */}
      <header className="bg-green-950 border-b-4 border-yellow-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md">
                <span className="text-3xl">⛳</span>
              </div>
              <div>
                <h1 className="text-2xl font-serif font-bold text-white tracking-wide">Arlington Lakes Golf League</h1>
                <p className="text-green-300 text-sm">2026 Season</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-green-950/80 border-b border-green-700">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex w-full">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex-1 px-1 sm:px-4 py-3 font-medium transition-all text-xs sm:text-sm text-center ${
                    isActive
                      ? 'bg-green-700 text-white border-b-2 border-yellow-500'
                      : 'text-green-300 hover:bg-green-800 hover:text-white'
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
      <footer className="bg-green-950 border-t border-green-800 mt-8 py-4">
        <div className="max-w-7xl mx-auto px-4 text-center text-green-400 text-sm">
          Arlington Lakes Golf League • 2026 Season
          <span className="mx-2">•</span>
          <Link to="/admin" className="text-green-500 hover:text-green-300 transition-colors">
            {isAdminAuthenticated ? 'Admin' : 'Admin Login'}
          </Link>
        </div>
      </footer>
    </div>
  );
}
