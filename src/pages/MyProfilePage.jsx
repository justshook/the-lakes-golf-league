import StripePayments from '../components/StripePayments';
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Flag, UserRound } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import PlayerAccountGate from '../components/PlayerAccountGate';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { historyPeriods, summarizePlayerAwards, summarizePlayerResults } from '../lib/player-summary';
import { formatMoney } from '../lib/ledger';

export default function MyProfilePage() {
  const session = usePlayerSession();
  return <PlayerAccountGate>{session.user && session.playerId != null ? <ProfileContent /> : null}</PlayerAccountGate>;
}

function ProfileContent() {
  const { playerId, profile, user } = usePlayerSession();
  const { players = [], playerScores = [], weeks = [], weeklyGames = [], isLoading, dataError, getPayoutLabel } = useLeague();
  const player = players.find(item => String(item.id) === String(playerId));
  const name = player?.name || profile?.name || 'My profile';
  const results = summarizePlayerResults({ playerId, scores: playerScores, weeks, games: weeklyGames });
  const awards = summarizePlayerAwards(player, weeks, getPayoutLabel);
  const awardPeriods = Object.keys(player?.weeklyMoney ?? {}).map(weekId => ({ date: weeks.find(week => String(week.id) === weekId)?.date }));
  const periods = historyPeriods([...results.rounds, ...awardPeriods]);
  const rawHandicap = player?.handicap;
  const handicap = ['number', 'string'].includes(typeof rawHandicap) && String(rawHandicap).trim() && Number.isFinite(Number(rawHandicap)) ? Number(rawHandicap) : null;
  const seasonRows = periods.map(period => ({
    period,
    results: summarizePlayerResults({ playerId, scores: playerScores, weeks, games: weeklyGames, period }),
    awards: summarizePlayerAwards(player, weeks, getPayoutLabel, { period }),
  }));

  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="flex items-start justify-between gap-3"><div><p className="page-eyebrow">Your player account</p><h1 className="page-heading mt-1">My profile</h1><p className="mt-2 text-sm text-charcoal-600">Your handicap and playing history, together.</p></div><Button asChild variant="outline" className="h-11 shrink-0 rounded-full px-3 text-xs sm:px-4"><Link to="/"><ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />My week</Link></Button></header>
    {isLoading ? <Card><CardContent className="p-6 text-sm text-charcoal-600" role="status">Loading your profile…</CardContent></Card> : dataError || !player ? <Card><CardContent className="p-6 text-sm leading-relaxed text-charcoal-600">Your player records are temporarily unavailable. Reload the league to see your complete profile.</CardContent></Card> : <>
      <Card className="overflow-hidden rounded-2xl border-forest-950 bg-forest-950 text-cream-100 shadow-sm"><CardContent className="p-5 sm:p-6">
        <div className="flex items-start gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20"><UserRound className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h2 className="font-display text-2xl font-semibold leading-tight">{name}</h2><p className="mt-1 break-all text-xs leading-relaxed text-cream-100/75">{profile?.email || user?.email}</p></div></div>
        <div className="mt-5 flex items-end justify-between gap-4 border-t border-white/15 pt-5"><div><p className="text-sm text-cream-100/80">Current handicap index</p><p className="mt-1 text-xs text-cream-100/65">18-hole index recorded by the league</p></div><p className="shrink-0 font-display text-4xl font-semibold tabular-nums">{handicap == null ? '—' : handicap.toFixed(1)}</p></div>
        <p className="mt-3 text-xs leading-relaxed text-cream-100/70">{handicap == null ? 'Your commissioner hasn’t recorded a handicap yet.' : 'Round results keep the handicap used on the day. This current index doesn’t change past scores.'}</p>
      </CardContent></Card>

      <div className="grid grid-cols-2 gap-3"><Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><p className="text-xs text-charcoal-600">Rounds recorded</p><p className="mt-1 font-display text-3xl font-semibold text-forest-950">{results.roundCount}</p><p className="mt-2 text-[11px] leading-relaxed text-charcoal-600">{results.individualCount} individual · {results.teamCount} team</p></CardContent></Card><Card className="rounded-2xl shadow-sm"><CardContent className="p-4"><p className="text-xs text-charcoal-600">Historical winnings</p><p className="mt-1 font-display text-3xl font-semibold tabular-nums text-forest-950">{awards.invalidCount ? '—' : formatMoney(awards.totalCents)}</p><p className="mt-2 text-[11px] leading-relaxed text-charcoal-600">Prize awards · payment status separate</p></CardContent></Card></div>
      <div className="grid grid-cols-2 gap-3"><Button asChild variant="outline" className="h-11 rounded-full"><Link to="/results">All results <ArrowUpRight className="ml-1 size-4" aria-hidden="true" /></Link></Button><Button asChild variant="outline" className="h-11 rounded-full"><Link to="/money">All money <ArrowUpRight className="ml-1 size-4" aria-hidden="true" /></Link></Button></div>

      <StripePayments playerId={playerId} />
      <section aria-labelledby="profile-history-heading" className="space-y-3"><div><h2 id="profile-history-heading" className="font-display text-xl font-semibold text-forest-950">Your recorded seasons</h2><p className="mt-1 text-xs leading-relaxed text-charcoal-600">Only years with records linked to your player profile appear here.</p></div>
        {seasonRows.length === 0 ? <Card className="rounded-2xl border-dashed"><CardContent className="px-5 py-8 text-center"><Flag className="mx-auto mb-3 size-6 text-forest-900" aria-hidden="true" /><p className="text-sm font-semibold">No history linked yet</p><p className="mt-2 text-sm leading-relaxed text-charcoal-600">If you played in an earlier season, ask the commissioner to check that those records are linked to your player profile.</p></CardContent></Card> : seasonRows.map(season => <Card key={season.period} className="rounded-2xl shadow-sm"><CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl font-semibold text-forest-950">{season.period === 'undated' ? 'Undated records' : `${season.period} season`}</h3><Badge variant="secondary" className="rounded-full text-[10px]">{season.results.roundCount} {season.results.roundCount === 1 ? 'round' : 'rounds'}</Badge></div>
          <dl className="mt-4 grid grid-cols-2 gap-4"><div><dt className="text-xs text-charcoal-600">Avg. individual gross</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-forest-950">{season.results.averageGross?.toFixed(1) ?? '—'}</dd></div><div><dt className="text-xs text-charcoal-600">Winnings awarded</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-forest-950">{season.awards.invalidCount ? '—' : formatMoney(season.awards.totalCents)}</dd></div></dl>
          {season.period === 'undated' && <p className="mt-3 text-xs leading-relaxed text-charcoal-600">These records are retained, but the round dates haven’t been matched to a season.</p>}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3"><Button asChild variant="ghost" className="h-11 justify-start px-0 text-xs text-forest-900"><Link to={`/results?year=${season.period}`}>View scores <ArrowUpRight className="ml-1 size-3.5" aria-hidden="true" /></Link></Button><Button asChild variant="ghost" className="h-11 justify-start px-0 text-xs text-forest-900"><Link to={`/money?year=${season.period}`}>View winnings <ArrowUpRight className="ml-1 size-3.5" aria-hidden="true" /></Link></Button></div>
        </CardContent></Card>)}
      </section>
      <p className="text-xs leading-relaxed text-charcoal-600">Missing an earlier year? Your commissioner can connect existing records or import an old score sheet. Seasons without source records aren’t estimated.</p>
    </>}
  </div>;
}
