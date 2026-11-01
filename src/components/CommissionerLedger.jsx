import StripePayments from './StripePayments';
import React, { useRef, useState } from 'react';
import { useLeague } from '../LeagueContext';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { formatMoney, reconcileLedger } from '../lib/ledger';

const TYPES = [
  ['charge', 'Fee charged'], ['payment', 'Payment received'], ['award', 'Prize awarded'],
  ['payout', 'Prize payout completed'], ['refund', 'Payment refund completed'],
];
const blank = { playerId: '', type: 'payment', amount: '', reference: '', description: '', relatedEntryId: '' };

export default function CommissionerLedger() {
  const { isAdmin, isDemo } = usePlayerSession();
  const { players = [], ledgerEntries = [], recordLedgerEntry, ledgerError, dataError } = useLeague();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState(false);
  const pendingEntry = useRef(null);
  if (!isAdmin) return null;
  const player = players.find(item => String(item.id) === String(form.playerId));
  const playerEntries = ledgerEntries.filter(entry => String(entry.playerId) === String(form.playerId));
  const payments = playerEntries.filter(entry => entry.type === 'payment' && entry.status === 'posted' && entry.provenance !== 'stripe_verified');
  const needsReference = ['payment', 'payout', 'refund'].includes(form.type);
  let totals = null;
  try { if (form.playerId) totals = reconcileLedger(playerEntries, { playerId: form.playerId }); } catch { /* Fail closed below. */ }
  const unavailable = !recordLedgerEntry || Boolean(ledgerError || dataError);
  const update = (name, value) => { pendingEntry.current = null; setForm(previous => ({ ...previous, [name]: value })); setError(''); setSuccess(''); };
  const prepare = event => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!player) return setError('Choose a player.');
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount)) return setError('Enter a dollar amount with up to two decimal places.');
    const amountCents = Math.round(Number(form.amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return setError('Enter an amount greater than zero.');
    if (needsReference && !form.reference.trim()) return setError('Add the payment confirmation or receipt reference.');
    if (form.type === 'refund' && !form.relatedEntryId) return setError('Choose the original received payment.');
    if (!pendingEntry.current) {
      const id = crypto.randomUUID();
      pendingEntry.current = {
        id, idempotencyKey: `commissioner:${id}`, playerId: String(player.id), type: form.type,
        status: 'posted', amountCents, currency: 'USD', reference: needsReference ? form.reference.trim() : null,
        relatedEntryId: form.type === 'refund' ? form.relatedEntryId : null,
        occurredAt: new Date().toISOString(), description: form.description.trim() || TYPES.find(([type]) => type === form.type)[1],
      };
    }
    try { reconcileLedger([...playerEntries, pendingEntry.current], { playerId: form.playerId }); }
    catch (cause) { return setError(cause.message); }
    setReview(true);
  };
  const save = async () => {
    if (saving || !pendingEntry.current) return;
    setSaving(true); setError('');
    try {
      await recordLedgerEntry(pendingEntry.current);
      setSuccess(isDemo ? 'Saved in this demo session.' : 'Entry recorded.');
      setForm(previous => ({ ...blank, playerId: previous.playerId }));
      pendingEntry.current = null; setReview(false);
    } catch (cause) {
      setError(cause.message || 'Could not save. Try again with the same entry.');
      setReview(false); // Keep the same identifier and payload for a safe retry.
    } finally { setSaving(false); }
  };

  return <section aria-labelledby="commissioner-ledger-heading" className="space-y-4">
    <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-charcoal-600">League accounting</p><h2 id="commissioner-ledger-heading" className="mt-1 font-display text-2xl font-semibold text-forest-950">Record a payment or award</h2><p className="mt-2 text-sm leading-relaxed text-charcoal-600">Record fees, prizes, and payments you’ve confirmed. Recording an entry does not collect or send money.</p></div>
    {unavailable && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Payment tracking needs to be set up before entries can be saved.</p>}
    <Card className="rounded-2xl border-border shadow-sm"><CardContent className="p-4 sm:p-5">
      <form onSubmit={prepare} className="space-y-4">
        <fieldset disabled={saving || unavailable} className="grid min-w-0 grid-cols-1 gap-4 disabled:opacity-60 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-medium text-forest-950"><span>Player</span><select aria-label="Player" className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.playerId} onChange={event => update('playerId', event.target.value)} required><option value="">Choose player</option>{players.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium text-forest-950"><span>Entry type</span><select className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm" aria-label="Entry type" value={form.type} onChange={event => update('type', event.target.value)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium text-forest-950"><span>Amount ($)</span><Input className="h-11 text-base" inputMode="decimal" placeholder="0.00" aria-label="Amount ($)" value={form.amount} onChange={event => update('amount', event.target.value)} required /></label>
          <label className="space-y-1.5 text-sm font-medium text-forest-950"><span>Description</span><Input className="h-11 text-base" placeholder="e.g. Week 4 team prize" maxLength={500} aria-label="Description" value={form.description} onChange={event => update('description', event.target.value)} /></label>
          {needsReference && <label className="space-y-1.5 text-sm font-medium text-forest-950 sm:col-span-2"><span>Payment or receipt reference</span><Input className="h-11 text-base" placeholder="Confirmation ID or cash receipt number" aria-label="Payment or receipt reference" value={form.reference} onChange={event => update('reference', event.target.value)} maxLength={200} required /><span className="block text-xs font-normal leading-relaxed text-charcoal-600">Use a unique confirmation for the completed transaction.</span></label>}
          {form.type === 'refund' && <label className="space-y-1.5 text-sm font-medium text-forest-950 sm:col-span-2"><span>Original payment</span><select className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm" aria-label="Original payment" value={form.relatedEntryId} onChange={event => update('relatedEntryId', event.target.value)} required><option value="">Choose received payment</option>{payments.map(entry => <option key={entry.id} value={entry.id}>{entry.description || 'Payment'} · {formatMoney(entry.amountCents)} · {entry.reference}</option>)}</select><span className="block text-xs font-normal leading-relaxed text-charcoal-600">A refund returns a payment. It does not cancel the original fee.</span></label>}
        </fieldset>
        {form.type === 'award' && <p className="text-xs leading-relaxed text-charcoal-600">Record each prize once. Historical winnings must be reconciled before they can support a recorded payout.</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {success && <p role="status" className="rounded-xl bg-forest-900/10 p-3 text-sm text-forest-900">{success}</p>}
        <Button type="submit" disabled={saving || unavailable} className="h-11 w-full rounded-full sm:w-auto">Review entry</Button>
      </form>
    </CardContent></Card>
    {form.playerId && <StripePayments key={form.playerId} playerId={form.playerId} commissioner />}
    {totals && <div className="grid grid-cols-2 gap-3">
      <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-charcoal-600">Recorded prizes</p><p className="mt-1 font-display text-2xl font-semibold text-forest-950">{formatMoney(totals.earnedCents)}</p></CardContent></Card>
      <Card className="rounded-2xl"><CardContent className="p-4"><p className="text-xs text-charcoal-600">Confirmed prize payouts</p><p className="mt-1 font-display text-2xl font-semibold text-forest-950">{formatMoney(totals.paidOutCents)}</p></CardContent></Card>
    </div>}
    {playerEntries.length > 0 && <Card className="overflow-hidden rounded-2xl"><CardContent className="divide-y divide-border p-0">
      {[...playerEntries].sort((a, b) => (b.occurredAt ?? '').localeCompare(a.occurredAt ?? '')).slice(0, 10).map(entry => <div key={entry.id} className="flex items-start justify-between gap-3 p-4"><div className="min-w-0"><p className="text-sm font-medium text-forest-950">{entry.description || TYPES.find(([type]) => type === entry.type)?.[1]}</p><Badge className="mt-1 text-[10px]" variant="secondary">{entry.status === 'posted' ? (entry.provenance === 'stripe_verified' ? 'Stripe verified' : 'Manual record') : entry.status}</Badge></div><span className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(entry.amountCents)}</span></div>)}
    </CardContent></Card>}
    <Dialog open={review} onOpenChange={open => { if (!saving) setReview(open); }}><DialogContent className="max-w-sm rounded-2xl"><DialogHeader><DialogTitle>Confirm this record</DialogTitle><DialogDescription className="pt-2 leading-relaxed">{player?.name} · {TYPES.find(([type]) => type === form.type)?.[1]} · {formatMoney(pendingEntry.current?.amountCents)}. {needsReference ? 'Confirm this money movement has already completed.' : 'Confirm the fee or prize amount is correct.'} This creates an accounting record only.</DialogDescription></DialogHeader><DialogFooter className="gap-2"><Button variant="outline" onClick={() => setReview(false)} disabled={saving} className="h-11">Go back</Button><Button onClick={save} disabled={saving} className="h-11">{saving ? 'Saving…' : 'Record entry'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
