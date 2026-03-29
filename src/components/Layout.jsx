import React from 'react';
import { NavLink, Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useLeague } from '../LeagueContext';

export default function Layout() {
  const { isAdminAuthenticated, setIsAdminAuthenticated, isLoading } = useLeague();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdminRoute = location.pathname === '/admin';
  const isAdminMode = isAdminRoute && isAdminAuthenticated;
  const activeTab = searchParams.get('tab') || 'week';

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

  const adminNavItems = [
    { tab: 'week', label: 'Week Management', shortLabel: 'Week' },
    { tab: 'season', label: 'Season Management', shortLabel: 'Season' },
    { tab: 'players', label: 'Player Management', shortLabel: 'Players' },
  ];

  const navItems = [
    { to: '/', label: 'Schedule', shortLabel: 'Schedule' },
    { to: '/leaderboard', label: 'Leaderboard', shortLabel: 'Leaderboard' },
    { to: '/skins', label: 'Skins', shortLabel: 'Skins' },
    { to: '/rules', label: 'Rules', shortLabel: 'Rules' },
    ...(isAdminAuthenticated ? [{ to: '/admin', label: 'Admin', shortLabel: 'Admin' }] : []),
  ];

  return (
    <div className="min-h-screen bg-forest-950">
      {/* Header */}
      <header className="bg-forest-950 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="text-center">
            <h1 className="font-serif text-[2.4rem] font-semibold italic text-cream-200 leading-none">The Lakes</h1>
            <p className="font-sans text-[0.65rem] font-semibold tracking-[3px] uppercase text-gold-500 mt-1.5">
              {isAdminMode ? 'Admin Dashboard' : 'Monday Golf League'}
            </p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-forest-950 border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          {isAdminMode ? (
            <div className="flex items-center justify-between">
              <div className="flex gap-0 sm:gap-1">
                {adminNavItems.map(item => (
                  <button
                    key={item.tab}
                    onClick={() => setSearchParams({ tab: item.tab })}
                    className={`px-3 sm:px-5 py-3 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
                      activeTab === item.tab
                        ? 'text-cream-200 border-b-2 border-gold-500'
                        : 'text-cream-200/80 hover:text-cream-200'
                    }`}
                  >
                    <span className="hidden sm:inline">{item.label}</span>
                    <span className="sm:hidden">{item.shortLabel}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                <Link
                  to="/"
                  className="px-2 sm:px-3 py-3 text-cream-200/70 hover:text-cream-200 text-xs sm:text-sm whitespace-nowrap transition-colors"
                >
                  ← Site
                </Link>
                <button
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="px-2 sm:px-3 py-3 text-cream-200/70 hover:text-cream-200 text-xs sm:text-sm whitespace-nowrap transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-1 sm:gap-2">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `px-3 sm:px-5 py-3 font-medium transition-colors text-sm sm:text-base whitespace-nowrap ${
                      isActive
                        ? 'text-cream-200 border-b-2 border-gold-500'
                        : 'text-cream-200/80 hover:text-cream-200'
                    }`
                  }
                >
                  <span className="hidden sm:inline">{item.label}</span>
                  <span className="sm:hidden">{item.shortLabel}</span>
                </NavLink>
              ))}
            </div>
          )}
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
