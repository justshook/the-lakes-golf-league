import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, CircleDollarSign, Info, Check } from 'lucide-react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import PlayerAccountGate from '../components/PlayerAccountGate';
import HistoryPeriodFilter from '../components/HistoryPeriodFilter';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { reconcileLedger, formatMoney } from '../lib/ledger';
import { summarizePlayerAwards, formatRoundDate, historyPeriods, normalizeHistoryPeriod } from '../lib/player-summary';

export default function MyMoneyPage() {
  const session = usePlayerSession();
  return <PlayerAccountGate>{session.user && session.playerId != null ? <MoneyContent playerId={session.playerId} /> : null}</PlayerAccountGate>;
}

function MoneyContent({ playerId }) {
  const { players = [], weeks = [], getPayoutLabel, ledgerEntries = [], ledgerTrackingComplete = false, isLoading, dataError } = useLeague();
  const player = players.find(item => String(item.id) === String(playerId));
  const legacy = summarizePlayerAwards(player, weeks, getPayoutLabel);
  const [searchParams, setSearchParams] = useSearchParams();
  const period = normalizeHistoryPeriod(searchParams.get('year'));
  const periods = historyPeriods(Object.keys(player?.weeklyMoney ?? {}).map(weekId => ({ date: weeks.find(week => String(week.id) === weekId)?.date })));
  const selectedLegacy = period === 'all' ? legacy : summarizePlayerAwards(player, weeks, getPayoutLabel, { period });
  const changePeriod = value => { const next = new URLSearchParams(searchParams); if (value === 'all') next.delete('year'); else next.set('year', value); setSearchParams(next); };
  let ledger;
  let ledgerError = false;
  try {
    ledger = reconcileLedger(ledgerEntries.filter(entry => String(entry.playerId) === String(playerId)), { playerId });
  } catch {
    ledgerError = true;
  }
  // Historical allocations and the ledger are alternative award sources, never added.
  const trackingReady = ledgerTrackingComplete && !ledgerError;
  const earnedCents = period !== 'all' ? selectedLegacy.totalCents : trackingReady ? ledger.earnedCents : legacy.totalCents;
  const movements = ledger?.entries.filter(entry => ['payment', 'payout', 'refund'].includes(entry.type))
    .sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? '')) ?? [];
  const recordedAwards = (ledger?.entries ?? []).filter(entry => entry.type === 'award' && entry.status === 'posted')
    .map(entry => ({ ...entry, label: entry.description || 'Prize award', date: entry.occurredAt?.slice(0, 10) }))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  const awards = trackingReady && period === 'all' ? recordedAwards : selectedLegacy.awards;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-600">Your history</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-forest-950">My money</h1>
          <p className="mt-2 text-sm text-charcoal-600">A clear view of what you’ve won.</p>
        </div>
        <Button asChild variant="outline" className="h-11 shrink-0 rounded-full px-3 text-xs sm:px-4 sm:text-sm"><Link to="/leaderboard">Money list <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden="true" /></Link></Button>
      </header>

      {isLoading ? <Card><CardContent className="p-6 text-sm text-charcoal-600" role="status">Loading your winnings…</CardContent></Card> : dataError || !player ? <Card><CardContent className="p-6 text-sm leading-relaxed text-charcoal-600">Your money records are temporarily unavailable. Reload the league to see your complete history.</CardContent></Card> : <>
        <HistoryPeriodFilter value={period} periods={periods} onChange={changePeriod} label="Winnings year" />
        <Card className="overflow-hidden rounded-2xl border-forest-950 bg-forest-950 text-cream-100 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-cream-100/80">{period !== 'all' ? period === 'undated' ? 'Undated winnings' : `${period} winnings` : !trackingReady && recordedAwards.length > 0 ? 'Historical winnings' : 'Recorded winnings'}</p>
              <CircleDollarSign className="h-5 w-5 text-cream-100/70" aria-hidden="true" />
            </div>
            <p className="mt-3 font-display text-5xl font-semibold tracking-tight tabular-nums">{(period !== 'all' ? selectedLegacy.invalidCount : !trackingReady && legacy.invalidCount) ? '—' : formatMoney(earnedCents)}</p>
            <p className="mt-3 text-xs leading-relaxed text-cream-100/75">{period !== 'all' ? 'Prizes linked to these rounds · payment status is separate.' : `Prize money awarded${trackingReady ? ' across your recorded history.' : ' · payout confirmation is tracked separately.'}`}</p>
            {trackingReady && period === 'all' && <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/15 pt-4">
              <div><p className="text-xs text-cream-100/75">Paid to you</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(ledger.paidOutCents)}</p></div>
              <div><p className="text-xs text-cream-100/75">Still to receive</p><p className="mt-1 text-xl font-semibold tabular-nums">{formatMoney(ledger.awardOutstandingCents)}</p></div>
            </div>}
          </CardContent>
        </Card>

        {(ledgerError || legacy.invalidCount > 0) && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">Some money records need a commissioner’s review. Affected totals are unavailable until they’re checked.</div>}

        {!trackingReady && <Card className="rounded-2xl border-border shadow-sm"><CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-charcoal-600" aria-hidden="true" />
          <div>
            <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-forest-950">Payout status</h2><Badge variant="secondary" className="rounded-full text-[10px]">Unconfirmed</Badge></div>
            <p className="mt-1.5 text-sm leading-relaxed text-charcoal-600">Your winnings are recorded. Payment and payout history isn’t complete here yet, so the amount still owed to you isn’t shown.</p>
          </div>
        </CardContent></Card>}

        {trackingReady && <section aria-labelledby="league-payments-heading">
          <h2 id="league-payments-heading" className="mb-3 font-display text-xl font-semibold text-forest-950">League payments · All years</h2>
          <Card className="rounded-2xl border-border shadow-sm"><CardContent className="space-y-3 p-4">
            <div className="flex items-center justify-between text-sm"><span className="text-charcoal-600">Fees charged</span><span className="font-medium tabular-nums">{formatMoney(ledger.chargesCents)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-charcoal-600">Payments received</span><span className="font-medium tabular-nums">{formatMoney(ledger.paymentsCents)}</span></div>
            {ledger.refundsCents > 0 && <div className="flex items-center justify-between text-sm"><span className="text-charcoal-600">Refunds returned</span><span className="font-medium tabular-nums">{formatMoney(ledger.refundsCents)}</span></div>}
            <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold text-forest-950"><span>{ledger.creditCents > 0 ? 'Payment credit' : 'Amount due'}</span><span className="tabular-nums">{formatMoney(ledger.creditCents || ledger.amountDueCents)}</span></div>
          </CardContent></Card>
        </section>}

        <section aria-labelledby="winnings-heading" className="space-y-3">
          <div className="flex items-center justify-between gap-3"><h2 id="winnings-heading" className="font-display text-xl font-semibold text-forest-950">Winnings by year</h2><span className="text-xs text-charcoal-600">{awards.length} {awards.length === 1 ? 'award' : 'awards'}</span></div>
          <p className="text-xs leading-relaxed text-charcoal-600">Year filters use the dates of your rounds. Payment activity and balances above cover all recorded years.</p>
          <Card className="overflow-hidden rounded-2xl border-border shadow-sm">
            <CardContent className="p-0">
              {awards.length === 0 ? <div className="px-5 py-8 text-center"><p className="text-sm font-semibold text-forest-950">{period === 'all' ? 'No winnings recorded yet' : period === 'undated' ? 'No undated winnings' : `No winnings recorded for ${period}`}</p><p className="mt-2 text-sm text-charcoal-600">{period === 'all' ? 'Your weekly prizes will appear here after results are finalized.' : 'No prize awards are linked to rounds in this part of your available history.'}</p></div> : <ul className="divide-y divide-border">
                {awards.map(award => <li key={award.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0"><p className="text-sm font-semibold leading-snug text-forest-950">{award.label}</p><p className="mt-1 text-xs text-charcoal-600">{award.roundLabel || 'Prize award'}{award.date && !award.dateBasedId ? ` · ${formatRoundDate(award.date)}${period === 'all' ? `, ${award.date.slice(0, 4)}` : ''}` : ''}{!award.date ? ' · Undated' : ''}</p></div>
                  <span className="shrink-0 text-base font-semibold tabular-nums text-forest-900">{formatMoney(award.amountCents)}</span>
                </li>)}
              </ul>}
            </CardContent>
          </Card>
        </section>

        {!trackingReady && recordedAwards.length > 0 && <section aria-labelledby="recorded-prizes-heading" className="space-y-3">
          <h2 id="recorded-prizes-heading" className="font-display text-xl font-semibold text-forest-950">Prize entries · All years</h2>
          <p className="text-xs leading-relaxed text-charcoal-600">These entries are shown separately while the commissioner checks them against historical winnings.</p>
          <Card className="overflow-hidden rounded-2xl border-border shadow-sm"><CardContent className="divide-y divide-border p-0">
            {recordedAwards.map(award => <div key={award.id} className="flex items-center justify-between gap-4 p-4"><div className="min-w-0"><p className="text-sm font-semibold text-forest-950">{award.label}</p><p className="mt-1 text-xs text-charcoal-600">{award.date ? formatRoundDate(award.date) : 'Date not recorded'}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(award.amountCents)}</span></div>)}
          </CardContent></Card>
        </section>}

        {movements.length > 0 && <section aria-labelledby="transactions-heading" className="space-y-3">
          <h2 id="transactions-heading" className="font-display text-xl font-semibold text-forest-950">Payment activity · All years</h2>
          <Card className="overflow-hidden rounded-2xl border-border shadow-sm"><CardContent className="divide-y divide-border p-0">
            {movements.map(entry => <div key={entry.id} className="flex items-start justify-between gap-3 p-4">
              <div><p className="text-sm font-semibold text-forest-950">{entry.description || ({ payment: 'League payment', payout: 'Prize payout', refund: 'Payment refund' }[entry.type])}</p><p className="mt-1 text-xs text-charcoal-600">{entry.occurredAt ? formatRoundDate(entry.occurredAt.slice(0, 10)) : 'Date not recorded'}</p></div>
              <div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums">{formatMoney(entry.amountCents)}</p><Badge variant="secondary" className="mt-1 rounded-full text-[10px]">{entry.status === 'posted' && <Check className="mr-1 h-3 w-3" aria-hidden="true" />}{entry.status === 'posted' ? 'Confirmed' : entry.status === 'pending' ? 'Pending' : entry.status === 'failed' ? 'Failed' : 'Voided'}</Badge></div>
            </div>)}
          </CardContent></Card>
        </section>}
      </>}
    </div>
  );
}
