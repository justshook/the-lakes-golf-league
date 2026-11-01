import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Search, Users } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { summarizePlayerResults, formatRoundDate } from '../lib/player-summary';

const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value) || 0);

/** Public sporting profiles intentionally exclude contact and account information. */
export default function PlayersPage() {
  const { playerId } = useParams();
  const { players = [], weeks = [], weeklyGames = [], playerScores = [], isLoading } = useLeague();
  const [query, setQuery] = useState('');
  const player = playerId == null ? null : players.find(item => String(item.id) === String(playerId));
  if (isLoading) return <p role="status" className="py-8 text-sm text-charcoal-600">Loading players…</p>;
  if (playerId != null && !player) return <div className="mx-auto max-w-5xl space-y-4"><Button asChild variant="ghost"><Link to="/players"><ArrowLeft aria-hidden="true" />All players</Link></Button><Card className="content-card"><CardContent className="p-6"><h1 className="text-xl font-semibold">Player unavailable</h1><p className="mt-2 text-sm text-charcoal-600">This player is no longer in the current roster.</p></CardContent></Card></div>;
  if (player) {
    const summary = summarizePlayerResults({ playerId: player.id, scores: playerScores, weeks, games: weeklyGames });
    return <div className="mx-auto max-w-5xl space-y-5">
      <Button asChild variant="ghost" className="px-0"><Link to="/players"><ArrowLeft aria-hidden="true" />All players</Link></Button>
      <header><p className="page-eyebrow">Player profile</p><h1 className="page-heading mt-1 break-words">{player.name}</h1><Badge variant="secondary" className="mt-3 rounded-full">{player.type === 'full-time' ? 'League member' : 'Substitute'}</Badge></header>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">{[{ label: 'Rounds', value: summary.roundCount }, { label: 'Winnings', value: money(player.totalMoney) }, { label: 'Avg. gross', value: summary.averageGross?.toFixed(1) ?? '—' }].map(item => <Card key={item.label} className="content-card"><CardContent className="p-3 sm:p-5"><p className="text-[11px] text-charcoal-600 sm:text-xs">{item.label}</p><p className="mt-2 break-words font-display text-2xl font-semibold tabular-nums text-forest-950 sm:text-3xl">{item.value}</p></CardContent></Card>)}</div>
      <p className="text-xs leading-5 text-charcoal-600">Averages include individual rounds only. Winnings show awards earned.</p>
      <section aria-labelledby="player-rounds" className="space-y-3"><h2 id="player-rounds" className="font-display text-xl font-semibold text-forest-950">Round history</h2>{summary.rounds.length === 0 ? <Card className="content-card border-dashed"><CardContent className="p-6 text-sm text-charcoal-600">No scores recorded yet.</CardContent></Card> : summary.rounds.map(round => <Card key={round.id} className="content-card"><CardContent className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs text-charcoal-600">{String(round.weekId).length > 4 ? 'Round' : `Week ${round.weekId}`}{round.date ? ` · ${formatRoundDate(round.date)}` : ''}</p><h3 className="mt-1 text-sm font-semibold text-forest-950">{round.gameName}</h3></div><Badge variant="secondary" className="rounded-full text-[10px]">{round.isTeam ? 'Team score' : 'Individual'}</Badge></div><dl className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-secondary/50 py-3">{[{ label: 'Gross', value: round.gross }, { label: 'Handicap used', value: round.handicapUsed }, { label: 'Net', value: round.net }].map(item => <div key={item.label} className="px-2 text-center"><dt className="text-[10px] text-charcoal-600 sm:text-xs">{item.label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{item.value ?? '—'}</dd></div>)}</dl></CardContent></Card>)}</section>
    </div>;
  }
  const filtered = players.filter(item => item.name?.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  return <div className="mx-auto max-w-5xl space-y-5">
    <header><p className="page-eyebrow">Good company</p><h1 className="page-heading mt-1">Our players</h1><p className="mt-2 text-sm text-charcoal-600">{players.length} players in the league.</p></header>
    <div className="relative"><label htmlFor="player-search" className="sr-only">Search players</label><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-charcoal-600" aria-hidden="true" /><Input id="player-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a player" className="pl-10" /></div>
    <div className="grid gap-3 sm:grid-cols-2">{filtered.map(item => <Link key={item.id} to={`/players/${encodeURIComponent(item.id)}`} className="flex min-h-20 items-center gap-3 rounded-2xl border bg-card p-4 transition-colors hover:bg-secondary"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-forest-900/10 text-sm font-semibold text-forest-950">{item.name.split(/\s+/).map(part => part[0]).slice(0, 2).join('')}</span><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-semibold text-forest-950">{item.name}</h2><p className="mt-1 text-xs text-charcoal-600">{item.type === 'full-time' ? 'League member' : 'Substitute'}</p></div><ArrowRight className="size-4 shrink-0 text-charcoal-400" aria-hidden="true" /></Link>)}</div>
    {filtered.length === 0 && <Card className="content-card border-dashed"><CardContent className="p-8 text-center"><Users className="mx-auto size-6 text-forest-800" aria-hidden="true" /><h2 className="mt-3 font-semibold">{query ? 'No matching players' : 'The roster is on its way'}</h2><p className="mt-2 text-sm text-charcoal-600">{query ? 'Try a different name.' : 'Player profiles will appear when the roster is available.'}</p></CardContent></Card>}
  </div>;
}
