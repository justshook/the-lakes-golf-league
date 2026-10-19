import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, Flag, Trophy, Users } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { getTeamsForSlot } from '../lib/teams';

const sameId = (a, b) => String(a) === String(b);
function roundDate(value) {
  if (!value) return 'Date to be confirmed';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'Date to be confirmed' : date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** Public league information. All actions are navigation or local filtering. */
export default function LeagueOverviewPage() {
  const { weeks = [], selectedWeek, setSelectedWeek, players = [], weeklyGames = [], isLoading } = useLeague();
  const orderedWeeks = [...weeks].sort((a, b) => (a.date || '').localeCompare(b.date || '') || Number(a.id) - Number(b.id));
  const weekIndex = orderedWeeks.findIndex(week => sameId(week.id, selectedWeek));
  const week = orderedWeeks[weekIndex] || orderedWeeks[0];
  const activeIndex = weekIndex < 0 ? 0 : weekIndex;
  const game = weeklyGames.find(item => sameId(item.weekId, week?.id));
  const slots = (week?.teeSheet || []).filter(slot => slot.players?.length);
  const playerCount = new Set(slots.flatMap(slot => slot.players).map(String)).size;
  const playerName = id => players.find(player => sameId(player.id, id))?.name || 'Player unavailable';
  const year = week?.date?.slice(0, 4);

  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="page-eyebrow">Monday golf, good company</p><h1 className="page-heading mt-1">The league</h1><p className="mt-2 text-sm text-charcoal-600">Arlington Lakes{year ? ` · ${year} season` : ''}</p></div>
      <Button variant="outline" asChild><Link to="/">My week<ArrowRight aria-hidden="true" /></Link></Button>
    </header>
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {[{ to: '/leaderboard', label: 'Standings', icon: Trophy }, { to: '/players', label: 'Players', icon: Users }, { to: '/rules', label: 'League rules', icon: Flag }].map(({ to, label, icon: Icon }) => <Link key={to} to={to} className="flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-2xl border bg-card px-2 py-3 text-center text-xs font-semibold text-forest-950 transition-colors hover:bg-secondary sm:flex-row sm:gap-2 sm:text-sm"><Icon className="size-4" aria-hidden="true" />{label}</Link>)}
    </div>
    {isLoading ? <Card className="content-card"><CardContent className="p-6 text-sm text-charcoal-600" role="status">Loading the league schedule…</CardContent></Card> : !week ? <Card className="content-card"><CardContent className="space-y-2 p-6"><CalendarDays className="size-6 text-forest-800" aria-hidden="true" /><h2 className="text-lg font-semibold">The schedule is on its way</h2><p className="text-sm leading-6 text-charcoal-600">Published rounds will appear here when your commissioner adds the season.</p></CardContent></Card> : <>
      <section aria-label="Round selector" className="flex items-center gap-2 rounded-2xl border bg-card p-2">
        <Button variant="ghost" size="icon" aria-label="Previous round" disabled={activeIndex === 0} onClick={() => setSelectedWeek(orderedWeeks[activeIndex - 1].id)}><ChevronLeft aria-hidden="true" /></Button>
        <div className="min-w-0 flex-1"><label htmlFor="league-week" className="sr-only">Choose a round</label><select id="league-week" value={week.id} onChange={event => { const target = orderedWeeks.find(item => sameId(item.id, event.target.value)); if (target) setSelectedWeek(target.id); }} className="w-full min-w-0 rounded-lg border-0 bg-transparent px-1 text-center text-sm font-semibold text-forest-950">{orderedWeeks.map(item => <option key={item.id} value={item.id}>{item.label || (String(item.id).length > 4 ? 'Round' : `Week ${item.id}`)} · {roundDate(item.date)}</option>)}</select></div>
        <Button variant="ghost" size="icon" aria-label="Next round" disabled={activeIndex === orderedWeeks.length - 1} onClick={() => setSelectedWeek(orderedWeeks[activeIndex + 1].id)}><ChevronRight aria-hidden="true" /></Button>
      </section>
      <Card className="overflow-hidden rounded-2xl border-0 bg-forest-950 text-cream-100 shadow-none"><CardContent className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2"><Badge className="rounded-full border-white/20 bg-white/10 text-cream-100">{week.nineHoles === 'back' ? 'Back nine · Holes 10–18' : 'Front nine · Holes 1–9'}</Badge>{week.weatherCancelled && <Badge variant="destructive" className="rounded-full">Round cancelled</Badge>}</div>
        <p className="mt-5 text-xs font-medium text-cream-200/80">{roundDate(week.date)}</p><h2 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">{game?.gameName || 'Game to be announced'}</h2>
        {game?.gameDescription && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-cream-200/90">{game.gameDescription}</p>}
        {game?.sideGame && <div className="mt-5 border-t border-white/15 pt-4"><p className="text-xs font-semibold text-gold-300">Also this week</p><p className="mt-1 text-sm font-medium">{game.sideGame}</p>{game.sideGameDescription && <p className="mt-1 whitespace-pre-line text-xs leading-5 text-cream-200/80">{game.sideGameDescription}</p>}</div>}
      </CardContent></Card>
      <section aria-labelledby="tee-sheet-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="tee-sheet-heading" className="font-display text-xl font-semibold text-forest-950">Tee sheet</h2><span className="text-xs text-charcoal-600">{playerCount} {playerCount === 1 ? 'player' : 'players'} · {slots.length} {slots.length === 1 ? 'group' : 'groups'}</span></div>
        {week.weatherCancelled ? <Card className="content-card"><CardContent className="p-5 text-sm leading-6 text-charcoal-600">This round has been cancelled. Check your personal schedule for the next league night.</CardContent></Card> : slots.length === 0 ? <Card className="content-card border-dashed"><CardContent className="flex gap-3 p-5"><Clock3 className="mt-0.5 size-5 shrink-0 text-forest-800" aria-hidden="true" /><div><h3 className="text-sm font-semibold">Tee times haven’t been published yet</h3><p className="mt-1 text-sm leading-6 text-charcoal-600">Your group and start time will appear here once the schedule is ready.</p></div></CardContent></Card> : <div className="grid gap-3 md:grid-cols-2">{slots.map((slot, slotIndex) => {
          const teams = getTeamsForSlot({ weekId: week.id, slot, game });
          const groups = teams.length ? teams.map(team => ({ key: team.teamId, ids: team.memberIds, incomplete: team.status === 'incomplete' })) : [{ key: 'group', ids: slot.players }];
          return <Card key={`${slot.time}:${slotIndex}`} className="content-card overflow-hidden"><CardContent className="p-0"><div className="flex items-center justify-between border-b bg-secondary/60 px-4 py-3"><h3 className="flex items-center gap-2 font-semibold text-forest-950"><Clock3 className="size-4" aria-hidden="true" />{slot.time}</h3><span className="text-xs text-charcoal-600">{slot.players.length} players</span></div><div className="divide-y">{groups.map((group, groupIndex) => <div key={group.key} className="px-4 py-3">{teams.length > 0 && <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-charcoal-600">Team {groupIndex + 1}{group.incomplete ? ' · Incomplete' : ''}</p>}<div className="space-y-0.5">{group.ids.map(id => <Link key={id} to={`/players/${encodeURIComponent(id)}`} className="flex min-h-11 items-center justify-between gap-2 rounded-lg py-2 text-sm font-medium text-forest-950 hover:bg-secondary"><span className="min-w-0 break-words">{playerName(id)}</span><ArrowRight className="size-3.5 shrink-0 text-charcoal-400" aria-hidden="true" /></Link>)}</div></div>)}</div></CardContent></Card>;
        })}</div>}
      </section>
      <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/leaderboard"><Trophy aria-hidden="true" />View results</Link></Button><Button asChild variant="ghost"><Link to="/skins">Season skins<ArrowRight aria-hidden="true" /></Link></Button></div>
    </>}
  </div>;
}
