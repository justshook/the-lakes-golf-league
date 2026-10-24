import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLedgerEntry, reconcileLedger, formatMoney } from '../src/lib/ledger.js';
import { summarizePlayerAwards, summarizePlayerResults, historyPeriods, historyPeriod, normalizeHistoryPeriod } from '../src/lib/player-summary.js';

const record = (id, type, amountCents, extra = {}) => ({
  id, idempotencyKey: `request:${id}`, playerId: '42', type, amountCents,
  currency: 'USD', status: 'posted',
  ...(['payment', 'payout', 'refund'].includes(type) ? { reference: `receipt:${id}` } : {}),
  ...extra,
});
const reconcile = entries => reconcileLedger(entries, { playerId: 42 });

test('reconciliation keeps prize awards separate from money paid and fees due', () => {
  const result = reconcile([
    record('dues', 'charge', 20000), record('fee-payment', 'payment', 15000),
    record('prize', 'award', 10000), record('prize-transfer', 'payout', 4000),
    record('refund', 'refund', 1000, { relatedEntryId: 'fee-payment' }),
  ]);
  assert.equal(result.earnedCents, 10000);
  assert.equal(result.paidOutCents, 4000);
  assert.equal(result.awardOutstandingCents, 6000);
  assert.equal(result.netPaidCents, 14000);
  assert.equal(result.amountDueCents, 6000);
  assert.equal(result.netCashMovementCents, 10000);
  assert.equal(result.creditCents, 0);
});

test('duplicate callbacks do not double-count; changed duplicate payloads are rejected', () => {
  const entry = record('pay', 'payment', 2500);
  assert.equal(reconcile([entry, { ...entry }]).paymentsCents, 2500);
  assert.equal(reconcile([entry, { ...entry }]).entries.length, 1);
  assert.throws(() => reconcile([entry, { ...entry, amountCents: 2501 }]), /Conflicting/);
  assert.throws(() => reconcile([entry, { ...entry, id: 'another-id' }]), /Conflicting/);
  assert.throws(() => reconcile([entry, record('new-import', 'payment', 2500, { reference: entry.reference })]), /Duplicate money/);
});

test('pending and failed transfers do not masquerade as received cash', () => {
  const result = reconcile([
    record('prize', 'award', 5000),
    record('pending', 'payout', 1000, { status: 'pending', reference: null }),
    record('failed', 'payout', 1000, { status: 'failed', reference: null }),
    record('pending-payment', 'payment', 2000, { status: 'pending', reference: null }),
    record('void-charge', 'charge', 500, { status: 'void' }),
  ]);
  assert.equal(result.paidOutCents, 0);
  assert.equal(result.paymentsCents, 0);
  assert.equal(result.chargesCents, 0);
  assert.equal(result.awardOutstandingCents, 5000);
  assert.equal(result.pendingPayoutCents, 1000);
  assert.equal(result.availableToScheduleCents, 4000);
});

test('overpayments become payment credit without changing prize money', () => {
  const result = reconcile([record('charge', 'charge', 1000), record('payment', 'payment', 1500)]);
  assert.equal(result.amountDueCents, 0);
  assert.equal(result.creditCents, 500);
  assert.equal(result.earnedCents, 0);
});

test('refunds require a posted payment and cannot exceed its refundable amount', () => {
  const payment = record('payment', 'payment', 2000);
  assert.throws(() => reconcile([record('refund', 'refund', 500, { relatedEntryId: 'missing' })]), /posted payment/);
  assert.throws(() => reconcile([record('award', 'award', 2000), record('refund', 'refund', 500, { relatedEntryId: 'award' })]), /posted payment/);
  assert.throws(() => reconcile([payment, record('refund', 'refund', 2100, { relatedEntryId: 'payment' })]), /exceeds/);
  assert.throws(() => reconcile([
    payment, record('r1', 'refund', 1100, { relatedEntryId: 'payment' }),
    record('r2', 'refund', 1000, { relatedEntryId: 'payment', status: 'pending', reference: null }),
  ]), /exceeds/);
});

test('payouts cannot consume more awards than exist, including reserved pending payouts', () => {
  assert.throws(() => reconcile([record('payout', 'payout', 100)]), /exceed posted prize/);
  assert.throws(() => reconcile([
    record('award', 'award', 1000), record('paid', 'payout', 600),
    record('pending', 'payout', 500, { status: 'pending' }),
  ]), /exceed posted prize/);
});

test('malformed financial amounts, identity, currency, status and missing transfer proof fail closed', () => {
  for (const amountCents of [null, undefined, NaN, Infinity, -1, 0, 1.5, '100', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => normalizeLedgerEntry(record('bad', 'award', amountCents)), /positive safe integer/);
  }
  for (const patch of [{ id: '' }, { idempotencyKey: ' ' }, { playerId: {} }, { currency: 'CAD' }, { status: 'successful' }, { type: 'transfer' }, { occurredAt: 'banana' }]) {
    assert.throws(() => normalizeLedgerEntry(record('bad', 'award', 100, patch)));
  }
  assert.throws(() => normalizeLedgerEntry(record('payout', 'payout', 100, { reference: '' })), /reference/);
  assert.throws(() => normalizeLedgerEntry(record('payout', 'payout', 100, { reference: null })), /reference/);
  assert.throws(() => reconcile([record('other', 'award', 100, { playerId: '43' })]), /another player/);
  assert.throws(() => reconcileLedger([], {}), /playerId/);
  assert.throws(() => reconcile([record('max', 'award', Number.MAX_SAFE_INTEGER), record('extra', 'award', 1)]), /safe precision/);
});

test('legacy award totals use decimal-safe cents and never imply payouts', () => {
  const result = summarizePlayerAwards({ id: 42, totalMoney: 999, weeklyMoney: { 1: { first: '25.50', greenie: 10 }, 2: { side: 0.1, extra: 0.2 } } });
  assert.equal(result.totalCents, 3580);
  assert.equal(result.invalidCount, 0);
  assert.equal('paidOutCents' in result, false);
  assert.equal('amountDueCents' in result, false);
  const invalid = summarizePlayerAwards({ id: 42, weeklyMoney: { 1: { blank: '', invalid: 'ten', negative: -1, decimals: 0.001, object: {}, array: [] } } });
  assert.equal(invalid.invalidCount, 6);
  assert.equal(invalid.awards.length, 0);
});

test('team scores never become individual averages even if legacy flags are missing', () => {
  const summary = summarizePlayerResults({
    playerId: '42',
    scores: [
      { id: 1, player_id: 42, week_id: 1, gross_score: 40, net_score: 35, handicap_used: 5 },
      { id: 2, player_id: 42, week_id: 2, gross_score: 28, net_score: 24, handicap_used: 4 },
      { id: 3, player_id: 42, week_id: 3, gross_score: 25, net_score: 22, is_team_score: true },
      { id: 4, player_id: 43, week_id: 1, gross_score: 50, net_score: 45 },
      { id: 5, player_id: 42, week_id: 4, gross_score: null, net_score: '', handicap_used: null },
    ],
    games: [{ weekId: 2, teamType: '2-person', gameName: 'Scramble' }],
    weeks: [{ id: 1, date: '2027-06-07', nineHoles: 'back' }],
  });
  assert.equal(summary.roundCount, 4);
  assert.equal(summary.teamCount, 2);
  assert.equal(summary.individualCount, 2);
  assert.equal(summary.averageGross, 40);
  assert.equal(summary.averageNet, 35);
  assert.equal(summary.bestGross, 40);
  assert.equal(summary.rounds.find(round => round.weekId === 1).handicapUsed, 5);
  assert.equal(summary.rounds.find(round => round.weekId === 4).gross, null);
});

test('currency formatting preserves cents and unknown amounts', () => {
  assert.equal(formatMoney(12345), '$123.45');
  assert.equal(formatMoney(12000), '$120');
  assert.equal(formatMoney(null), '—');
});

test('personal history separates available years and retains records without a matched date', () => {
  const weeks = [{ id: 1, date: '2026-04-13' }, { id: '20270412', date: '2027-04-12' }];
  const scores = [
    { player_id: 42, week_id: 1, gross_score: 43, net_score: 37, handicap_used: 6 },
    { player_id: 42, week_id: '20270412', gross_score: 39, net_score: 35, handicap_used: 4 },
    { player_id: 42, week_id: 99, gross_score: 45, net_score: 38, handicap_used: 7 },
    { player_id: 43, week_id: 1, gross_score: 50, net_score: 40 },
  ];
  const all = summarizePlayerResults({ playerId: 42, scores, weeks });
  assert.deepEqual(historyPeriods(all.rounds), ['2027', '2026', 'undated']);
  assert.equal(all.roundCount, 3);
  const oldSeason = summarizePlayerResults({ playerId: 42, scores, weeks, period: '2026' });
  assert.equal(oldSeason.roundCount, 1);
  assert.equal(oldSeason.averageGross, 43);
  assert.equal(oldSeason.rounds[0].handicapUsed, 6);
  assert.equal(summarizePlayerResults({ playerId: 42, scores, weeks, period: 'undated' }).roundCount, 1);
  assert.equal(summarizePlayerResults({ playerId: 42, scores, weeks, period: '2025' }).roundCount, 0);
});

test('historical winnings filter by round dates rather than inferring a season from IDs or transfer dates', () => {
  const player = { id: 42, weeklyMoney: { 1: { prize: 50 }, 20270412: { prize: 75 }, 99: { prize: 10 } } };
  const weeks = [{ id: 1, date: '2026-04-13' }, { id: '20270412', date: '2027-04-12' }];
  assert.equal(summarizePlayerAwards(player, weeks, undefined, { period: '2026' }).totalCents, 5000);
  assert.equal(summarizePlayerAwards(player, weeks, undefined, { period: '2027' }).totalCents, 7500);
  assert.equal(summarizePlayerAwards(player, weeks, undefined, { period: 'undated' }).totalCents, 1000);
  assert.equal(summarizePlayerAwards(player, weeks, undefined, { period: '2025' }).awards.length, 0);
  assert.equal(summarizePlayerAwards(player, weeks).totalCents, 13500);
});

test('invalid dates remain undated and an explicit earlier year never silently selects all history', () => {
  for (const date of [null, undefined, '2025-02-30', '2026', '2026-13-01', '2026-01-01T00:00:00Z']) assert.equal(historyPeriod(date), 'undated');
  assert.equal(historyPeriod('2026-04-13'), '2026');
  assert.equal(normalizeHistoryPeriod('2025'), '2025');
  assert.equal(normalizeHistoryPeriod('undated'), 'undated');
  assert.equal(normalizeHistoryPeriod('not-a-year'), 'all');
});
