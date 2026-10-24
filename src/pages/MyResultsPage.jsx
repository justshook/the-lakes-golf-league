import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Flag, Trophy, ArrowUpRight } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import PlayerAccountGate from '../components/PlayerAccountGate';
import HistoryPeriodFilter from '../components/HistoryPeriodFilter';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { summarizePlayerResults, formatRoundDate, historyPeriods, normalizeHistoryPeriod } from '../lib/player-summary';

const scoreText = value => value == null ? '—' : value;

export default function MyResultsPage() {
  const session = usePlayerSession();
  return <PlayerAccountGate>{session.user && session.playerId != null ? <ResultsContent playerId={session.playerId} /> : null}</PlayerAccountGate>;
}

function ResultsContent({ playerId }) {
  const { playerScores = [], weeks = [], weeklyGames = [], isLoading, dataError } = useLeague();
  const [searchParams, setSearchParams] = useSearchParams();
  const period = normalizeHistoryPeriod(searchParams.get('year'));
  const fullHistory = summarizePlayerResults({ playerId, scores: playerScores, weeks, games: weeklyGames });
  const periods = historyPeriods(fullHistory.rounds);
  const summary = period === 'all' ? fullHistory : summarizePlayerResults({ playerId, scores: playerScores, weeks, games: weeklyGames, period });
  const changePeriod = value => { const next = new URLSearchParams(searchParams); if (value === 'all') next.delete('year'); else next.set('year', value); setSearchParams(next); };
  const metrics = [
    { label: 'Rounds', value: summary.roundCount },
    { label: 'Avg. gross', value: summary.averageGross?.toFixed(1) ?? '—' },
    { label: 'Best gross', value: summary.bestGross ?? '—' },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-600">Your history</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-forest-950">My results</h1>
          <p className="mt-2 text-sm text-charcoal-600">Every round, all in one place.</p>
        </div>
        <Button asChild variant="outline" className="h-11 shrink-0 rounded-full px-3 text-xs sm:px-4 sm:text-sm">
          <Link to="/leaderboard">Standings <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link>
        </Button>
      </header>

      {isLoading ? <Card><CardContent className="p-6 text-sm text-charcoal-600" role="status">Loading your rounds…</CardContent></Card> : dataError ? <Card><CardContent className="p-6 text-sm leading-relaxed text-charcoal-600">Your results are temporarily unavailable. Reload the league to see your complete history.</CardContent></Card> : <>
        <HistoryPeriodFilter value={period} periods={periods} onChange={changePeriod} label="Results year" />
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {metrics.map(metric => <Card key={metric.label} className="rounded-2xl border-border shadow-sm">
            <CardContent className="p-3 sm:p-5">
              <p className="text-xs font-medium text-charcoal-600">{metric.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-forest-950">{metric.value}</p>
            </CardContent>
          </Card>)}
        </div>
        <p className="!mt-3 text-xs leading-relaxed text-charcoal-600">Gross averages and personal bests use individual rounds only. Team scores are shown separately below.</p>

        {summary.rounds.length === 0 ? <Card className="rounded-2xl border-dashed shadow-none">
          <CardContent className="flex flex-col items-center px-5 py-10 text-center">
            <div className="mb-4 rounded-full bg-forest-900/10 p-3"><Flag className="h-6 w-6 text-forest-900" aria-hidden="true" /></div>
            <h2 className="font-display text-xl font-semibold text-forest-950">{period === 'all' ? 'Your history starts here' : period === 'undated' ? 'No undated rounds' : `No recorded rounds for ${period}`}</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-charcoal-600">{period === 'all' ? 'Your scores will appear after your first round is recorded.' : 'There are no scores linked to this year in your available history. Your commissioner can check or import earlier records.'}</p>
            <Button asChild className="mt-5 min-h-11 rounded-full"><Link to="/">View my week</Link></Button>
          </CardContent>
        </Card> : <section aria-labelledby="round-history-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="round-history-heading" className="font-display text-xl font-semibold text-forest-950">{period === 'all' ? 'Round history' : period === 'undated' ? 'Undated rounds' : `${period} rounds`}</h2>
            <span className="text-xs text-charcoal-600">Latest first</span>
          </div>
          {summary.rounds.map(round => <Card key={round.id} className="overflow-hidden rounded-2xl border-border shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-charcoal-600">{round.label}{round.date && !round.dateBasedId ? ` · ${formatRoundDate(round.date)}${period === 'all' ? `, ${round.date.slice(0, 4)}` : ''}` : ''}{!round.date ? ' · Undated' : ''}{round.nineHoles ? ` · ${round.nineHoles === 'back' ? 'Back' : 'Front'} nine` : ''}</p>
                  <h3 className="mt-1 text-sm font-semibold leading-snug text-forest-950 sm:text-base">{round.gameName}</h3>
                </div>
                <Badge variant="secondary" className="shrink-0 whitespace-nowrap rounded-full text-[10px]">{round.isTeam ? 'Team score' : 'Individual'}</Badge>
              </div>
              <dl className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl bg-cream-100 py-3">
                {[
                  { label: round.isTeam ? 'Team gross' : 'Gross', value: round.gross },
                  { label: 'Handicap used', value: round.handicapUsed },
                  { label: round.isTeam ? 'Team net' : 'Net', value: round.net },
                ].map(metric => <div key={metric.label} className="px-2 text-center">
                  <dt className="text-[10px] font-medium text-charcoal-600 sm:text-xs">{metric.label}</dt>
                  <dd className="mt-1 text-xl font-semibold tabular-nums text-forest-950">{scoreText(metric.value)}</dd>
                </div>)}
              </dl>
              {round.isTeam && <p className="mt-3 text-[11px] leading-relaxed text-charcoal-600">Team result · excluded from your individual average.</p>}
            </CardContent>
          </Card>)}
        </section>}

        {summary.individualCount > 0 && <div className="flex items-start gap-3 rounded-2xl bg-forest-900/[0.06] p-4 text-sm text-forest-950">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="leading-relaxed">{summary.individualCount} individual {summary.individualCount === 1 ? 'round' : 'rounds'}{summary.averageNet != null ? ` · ${summary.averageNet.toFixed(1)} average net` : ''}{summary.teamCount > 0 ? ` · ${summary.teamCount} team ${summary.teamCount === 1 ? 'round' : 'rounds'}` : ''}.</p>
        </div>}
      </>}
    </div>
  );
}
