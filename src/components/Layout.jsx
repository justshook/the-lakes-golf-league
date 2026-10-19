import React from 'react';
import { NavLink, Link, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { CalendarDays, Flag, Trophy, Wallet, UsersRound, LogOut, Settings2, LoaderCircle } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { cn } from '../lib/utils';

const navigation = [
  { to: '/', label: 'My Week', icon: Flag },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/results', label: 'Results', icon: Trophy },
  { to: '/money', label: 'Money', icon: Wallet },
  { to: '/league', label: 'League', icon: UsersRound },
];

export default function Layout() {
  const { isLoading, dataError, refreshData } = useLeague();
  const { user, profile, isAdmin, isDemo, signOut } = usePlayerSession();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [signOutError, setSignOutError] = React.useState('');
  const [accountOpen, setAccountOpen] = React.useState(false);
  const legacyPage = ['/rules', '/admin/manage'].some(path => location.pathname === path || location.pathname.startsWith(`${path}/`));
  const activeTab = searchParams.get('tab') || 'week';
  const name = profile?.name || profile?.display_name || user?.email?.split('@')[0] || 'Player';
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  const handleSignOut = async () => {
    setSignOutError('');
    try { await signOut(); setAccountOpen(false); } catch { setSignOutError('We couldn’t sign you out. Please try again.'); }
  };

  return (
    <div className={cn('min-h-dvh pb-24 lg:pb-0', legacyPage ? 'bg-forest-950' : 'bg-background')}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-cream-100 focus:p-4">Skip to content</a>
      {isDemo && <div className="bg-cream-300 px-4 py-2 text-center text-[11px] font-medium text-forest-950">Preview with sample players · Changes stay in this browser</div>}
      <header className="border-b border-white/10 bg-forest-950 text-cream-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 md:py-5">
          <Link to="/" aria-label="The Lakes — My Week" className="flex shrink-0 items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full border border-gold-500/50 text-gold-400"><Flag className="size-5" strokeWidth={1.5} aria-hidden="true" /></span>
            <span><span className="block font-serif text-[29px] font-semibold leading-7">The Lakes</span><span className="block text-[9px] font-medium uppercase tracking-[0.24em] text-cream-200/70">Monday golf league</span></span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {navigation.map(({ to, label }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('rounded-full px-4 py-3 text-sm font-medium transition-colors', isActive ? 'bg-white/10 text-white' : 'text-cream-200/70 hover:bg-white/5 hover:text-white')}>{label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-2">
            {isAdmin && <Button asChild variant="ghost" size="icon" className="rounded-full text-cream-100 hover:bg-white/10 hover:text-white"><Link to="/admin" aria-label="Commissioner dashboard"><Settings2 className="size-5" /></Link></Button>}
            {user ? <>
              <button aria-label={`Open account for ${name}`} onClick={() => setAccountOpen(true)} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cream-200 text-xs font-bold text-forest-950">{initials}</button>
              <Button variant="ghost" size="icon" className="hidden rounded-full text-cream-200 hover:bg-white/10 hover:text-white sm:inline-flex" onClick={handleSignOut} aria-label="Sign out"><LogOut className="size-4" /></Button>
            </> : <Button asChild variant="secondary" className="rounded-full px-5 text-xs"><Link to="/login">Sign in</Link></Button>}
          </div>
        </div>
      </header>
      <Dialog open={accountOpen} onOpenChange={setAccountOpen}><DialogContent><DialogHeader className="pr-6 text-left"><DialogTitle>Your account</DialogTitle><DialogDescription className="break-words pt-2 leading-6">{name}<br />{user?.email}</DialogDescription></DialogHeader><Button onClick={handleSignOut} variant="outline" className="w-full"><LogOut className="size-4" />Sign out</Button>{signOutError && <p role="alert" className="text-sm text-destructive">{signOutError}</p>}</DialogContent></Dialog>
      {signOutError && <p role="alert" className="bg-red-50 px-5 py-3 text-center text-sm text-red-800">{signOutError}</p>}
      {location.pathname === '/admin/manage' && isAdmin && <nav aria-label="Administration sections" className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-5 py-3">
        {[['week', 'Week'], ['season', 'Season'], ['players', 'Players']].map(([tab, label]) => <Button key={tab} variant={activeTab === tab ? 'secondary' : 'ghost'} className={cn('rounded-full', activeTab !== tab && 'text-cream-200')} onClick={() => setSearchParams({ tab })}>{label}</Button>)}
        <Button asChild variant="ghost" className="ml-auto text-cream-200"><Link to="/admin">Overview</Link></Button>
      </nav>}
      {dataError && <div role="alert" className="mx-auto mt-4 flex max-w-5xl flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><div><p className="font-semibold">Some league information couldn’t load.</p><p className="mt-1 text-xs leading-5">Schedules and totals may be incomplete. Please reload before making changes.</p></div><Button variant="outline" size="sm" onClick={() => refreshData?.()} disabled={isLoading}>Try again</Button></div>}
      <main id="main-content" className="mx-auto min-h-[65vh] max-w-6xl px-4 py-6 sm:px-6 md:py-9">
        {isLoading ? <div role="status" className={cn('flex min-h-[45vh] flex-col items-center justify-center gap-3 text-sm', legacyPage ? 'text-cream-200' : 'text-charcoal-600')}><LoaderCircle className="size-7 animate-spin" aria-hidden="true" />Loading your league…</div> : <React.Suspense fallback={<div role="status" className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-charcoal-600"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" />Loading page…</div>}><Outlet /></React.Suspense>}
      </main>
      <footer className={cn('mx-auto hidden max-w-6xl items-center justify-between border-t px-6 py-6 text-xs md:flex', legacyPage ? 'border-white/10 text-cream-200/60' : 'text-charcoal-600')}>
        <p>Arlington Lakes · A better Monday.</p>
        <div className="flex items-center gap-5"><Link to="/rules" className="py-3 hover:underline">League rules</Link><Link to="/admin" className="py-3 hover:underline">Commissioner</Link>{user && <button onClick={handleSignOut} className="py-3 hover:underline">Sign out</button>}</div>
      </footer>
      <nav aria-label="Mobile navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-cream-100/95 px-2 pt-2 backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          {navigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn('flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors sm:text-xs', isActive ? 'bg-forest-900/[0.08] text-forest-950' : 'text-charcoal-600 hover:bg-cream-200')}><Icon className="size-[20px]" strokeWidth={1.8} aria-hidden="true" />{label}</NavLink>)}
        </div>
      </nav>
    </div>
  );
}
