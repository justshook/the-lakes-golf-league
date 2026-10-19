import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Trophy } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { CHAMPIONSHIP_ROUNDS_COUNTED } from '../constants';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { getPlayerTeam } from '../lib/teams';
import { formatRoundDate } from '../lib/player-summary';

const sameId = (a, b) => String(a) === String(b);
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value) || 0);
const scoreValue = value => value == null || !Number.isFinite(Number(value)) ? null : Number(value);

function EmptyState({ children }) {
  return <Card className="content-card border-dashed"><CardContent className="p-8 text-center text-sm leading-6 text-charcoal-600">{children}</CardContent></Card>;
}

/** Recorded sporting results only; this page never calculates or initiates payouts. */
export default function LeaderboardPage() {
  const {
    players = [], weeks = [], weeklyGames = [], playerScores = [], selectedWeek, setSelectedWeek,
    leaderboardView = 'season', setLeaderboardView, championshipStandings = [], getPlayerFlight, getPayoutLabel,
  } = useLeague();
  const orderedWeeks = [...weeks].sort((a, b) => (a.date || '').localeCompare(b.date || '') || Number(a.id) - Number(b.id));
  const week = orderedWeeks.find(item => sameId(item.id, selectedWeek)) || orderedWeeks[0];
  const game = weeklyGames.find(item => sameId(item.weekId, week?.id));
  const sortedPlayers = [...players].sort((a, b) => Number(b.totalMoney || 0) - Number(a.totalMoney || 0) || a.name.localeCompare(b.name));
  const totalAwards = sortedPlayers.reduce((sum, item) => sum + Number(item.totalMoney || 0), 0);
  const weeklyAwards = players.flatMap(player => Object.entries(player.weeklyMoney?.[week?.id] || {}).filter(([, amount]) => Number.isFinite(Number(amount)) && Number(amount) > 0).map(([category, amount]) => ({ player, category, amount: Number(amount) })));
  const weeklyScores = playerScores.filter(score => sameId(score.week_id, week?.id));
  const scoreGroups = new Map();
  for (const score of weeklyScores) {
    const player = players.find(item => sameId(item.id, score.player_id));
    if (!player) continue;
    const assignment = game?.teamType ? getPlayerTeam({ playerId: player.id, weekId: week.id, teeSheet: week.teeSheet || [], game }) : null;
    const memberIds = assignment?.team?.memberIds || [player.id];
    const key = assignment?.teamId || `player:${player.id}`;
    const gross = scoreValue(score.gross_score), net = scoreValue(score.net_score);
    const existing = scoreGroups.get(key);
    if (existing) {
      if (existing.gross !== gross || existing.net !== net) existing.conflicting = true;
    } else scoreGroups.set(key, { key, names: memberIds.map(id => players.find(item => sameId(item.id, id))?.name).filter(Boolean), gross, net, conflicting: false });
  }
  const rows = [...scoreGroups.values()].sort((a, b) => (a.net ?? Infinity) - (b.net ?? Infinity));
  let lastAward = null, lastRank = 0;

  return <div className="mx-auto max-w-5xl space-y-5">
    <header><p className="page-eyebrow">Recorded league history</p><h1 className="page-heading mt-1">Standings</h1><p className="mt-2 text-sm text-charcoal-600">Recorded scores, winnings, and the 2026 championship archive.</p></header>
    <Tabs value={leaderboardView} onValueChange={setLeaderboardView} className="space-y-5">
      <TabsList className="grid h-auto w-full grid-cols-3 rounded-full bg-cream-200 p-1"><TabsTrigger value="season" className="min-h-11 rounded-full px-1 text-xs sm:text-sm">Winnings</TabsTrigger><TabsTrigger value="weekly" className="min-h-11 rounded-full px-1 text-xs sm:text-sm">By week</TabsTrigger><TabsTrigger value="championship" className="min-h-11 rounded-full px-1 text-xs sm:text-sm">Championship</TabsTrigger></TabsList>
      <TabsContent value="season" className="space-y-4">
        <Card className="overflow-hidden rounded-2xl border-0 bg-forest-950 text-cream-100 shadow-none"><CardContent className="flex items-center gap-4 p-5"><span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10"><Trophy className="size-5 text-gold-300" aria-hidden="true" /></span><div><p className="text-xs text-cream-200/80">Recorded winnings awarded</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums">{money(totalAwards)}</p></div></CardContent></Card>
        <p className="text-xs leading-5 text-charcoal-600">Awards earned, independent of whether a payout has been completed. Equal winnings share a rank.</p>
        {sortedPlayers.length === 0 ? <EmptyState>Players and standings will appear once the roster is available.</EmptyState> : <Card className="content-card overflow-hidden"><CardContent className="divide-y p-0">{sortedPlayers.map((player, index) => {
          const total = Number(player.totalMoney || 0);
          const rank = total === lastAward ? lastRank : index + 1;
          lastAward = total; lastRank = rank;
          const flight = getPlayerFlight?.(player.id)?.flight;
          return <Link key={player.id} to={`/players/${encodeURIComponent(player.id)}`} className="flex min-h-[76px] items-center gap-3 px-4 py-3 hover:bg-secondary sm:px-5"><span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${rank === 1 && total > 0 ? 'bg-gold-300 text-forest-950' : 'bg-secondary text-charcoal-600'}`}>{rank}</span><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-semibold text-forest-950">{player.name}</h2>{flight && <p className="mt-1 text-[11px] text-charcoal-600">2026 {flight.name}</p>}</div><span className="shrink-0 text-sm font-semibold tabular-nums text-forest-950">{money(total)}</span><ArrowRight className="hidden size-4 shrink-0 text-charcoal-400 sm:block" aria-hidden="true" /></Link>;
        })}</CardContent></Card>}
      </TabsContent>
      <TabsContent value="weekly" className="space-y-5">
        <div className="space-y-2"><label htmlFor="standings-week" className="text-sm font-semibold">Round</label><select id="standings-week" className="min-h-12 w-full rounded-xl border bg-card px-3 text-base" value={week?.id ?? ''} disabled={!weeks.length} onChange={event => { const target = weeks.find(item => sameId(item.id, event.target.value)); if (target) setSelectedWeek(target.id); }}>{orderedWeeks.map(item => <option key={item.id} value={item.id}>{item.label || (String(item.id).length > 4 ? 'Round' : `Week ${item.id}`)}{item.date ? ` · ${formatRoundDate(item.date)}` : ''}</option>)}</select></div>
        <div><p className="page-eyebrow">{week?.label || (String(week?.id || '').length > 4 ? formatRoundDate(week?.date) : `Week ${week?.id ?? '—'}`)}</p><h2 className="mt-1 font-display text-xl font-semibold text-forest-950">{game?.gameName || 'Round results'}</h2></div>
        <section aria-labelledby="weekly-scores-heading" className="space-y-3"><h3 id="weekly-scores-heading" className="text-sm font-semibold">Recorded scores</h3>{rows.length === 0 ? <EmptyState>No scores have been recorded for this round.</EmptyState> : rows.map(row => <Card key={row.key} className="content-card"><CardContent className="p-4"><div className="flex items-start justify-between gap-3"><h4 className="min-w-0 break-words text-sm font-semibold text-forest-950">{row.names.join(' & ')}</h4><Badge variant="secondary" className="shrink-0 rounded-full text-[10px]">{game?.teamType ? 'Team' : 'Individual'}</Badge></div>{row.conflicting ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Team score records differ. The commissioner needs to review this result.</p> : <dl className="mt-3 grid grid-cols-2 divide-x rounded-xl bg-secondary/50 py-3">{[{ label: 'Gross', value: row.gross }, { label: 'Net', value: row.net }].map(metric => <div key={metric.label} className="text-center"><dt className="text-xs text-charcoal-600">{metric.label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{metric.value ?? '—'}</dd></div>)}</dl>}</CardContent></Card>)}</section>
        <section aria-labelledby="weekly-awards-heading" className="space-y-3"><div className="flex items-center justify-between gap-2"><h3 id="weekly-awards-heading" className="text-sm font-semibold">Winnings awarded</h3><span className="text-sm font-semibold tabular-nums text-forest-950">{money(weeklyAwards.reduce((sum, item) => sum + item.amount, 0))}</span></div>{weeklyAwards.length === 0 ? <EmptyState>No awards have been recorded for this round.</EmptyState> : <Card className="content-card"><CardContent className="divide-y p-0">{weeklyAwards.map(item => <div key={`${item.player.id}:${item.category}`} className="flex items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="break-words text-sm font-semibold">{item.player.name}</p><p className="mt-1 break-words text-xs text-charcoal-600">{getPayoutLabel?.(week.id, item.category) || item.category}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums">{money(item.amount)}</span></div>)}</CardContent></Card>}</section>
      </TabsContent>
      <TabsContent value="championship" className="space-y-4">
        <Card className="content-card bg-secondary/50"><CardContent className="p-5"><h2 className="font-display text-xl font-semibold text-forest-950">2026 league championship</h2><p className="mt-2 text-sm leading-6 text-charcoal-600">The first {CHAMPIONSHIP_ROUNDS_COUNTED} recorded rounds from the 2026 championship weeks count toward an 18-hole net total. Each flight has its own standings. A partial total stays marked until both rounds are recorded.</p></CardContent></Card>
        {championshipStandings.length === 0 ? <EmptyState>No archived championship results are available.</EmptyState> : championshipStandings.map(flight => <section key={flight.id} className="space-y-3"><div><h3 className="font-display text-xl font-semibold text-forest-950">{flight.name}</h3><p className="mt-1 text-xs text-charcoal-600">{flight.description}</p></div>{!flight.players?.length ? <EmptyState>No players in this flight yet.</EmptyState> : <Card className="content-card overflow-hidden"><CardContent className="divide-y p-0">{flight.players.map(entry => <div key={entry.id} className="flex items-center gap-3 p-4"><span className="w-7 shrink-0 text-center text-xs font-semibold text-charcoal-600">{entry.rank ? `${entry.tied ? 'T' : ''}${entry.rank}` : '—'}</span><div className="min-w-0 flex-1"><h4 className="break-words text-sm font-semibold text-forest-950">{entry.name}</h4><p className="mt-1 text-[11px] text-charcoal-600">{entry.rounds?.length ? entry.rounds.map(round => `R${round.roundNumber}: ${round.net}`).join(' · ') : 'No rounds recorded'}</p></div><div className="shrink-0 text-right"><p className="text-lg font-semibold tabular-nums">{entry.roundsPlayed ? entry.netTotal : '—'}</p><p className="text-[10px] text-charcoal-600">{entry.complete ? '18-hole net' : `${entry.roundsPlayed || 0}/${CHAMPIONSHIP_ROUNDS_COUNTED} rounds`}</p></div></div>)}</CardContent></Card>}</section>)}
      </TabsContent>
    </Tabs>
  </div>;
}
