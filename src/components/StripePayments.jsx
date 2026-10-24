import { stripeUrl as receiptUrl, checkoutResult, checkoutNotice, refundLabel } from '../lib/payment-display';
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatMoney } from '../lib/ledger';

async function request(path, options = {}) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Sign in again to view payments.');
  const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${data.session.access_token}`, 'Content-Type': 'application/json' } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Payments are temporarily unavailable. Please try again.');
  return result;
}
export default function StripePayments({ playerId, commissioner = false }) {
  const { isDemo } = usePlayerSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null); setError('');
    if (isDemo || !supabase) return;
    request('/api/payments' + (commissioner ? `?player_id=${encodeURIComponent(playerId)}` : '')).then(value => { if (active) setData(value); }).catch(cause => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, [playerId, commissioner, isDemo, revision]);
  async function checkout() {
    setBusy(true); setError('');
    try {
      const result = await request('/api/checkout', { method: 'POST', body: '{}' });
      const outcome = checkoutResult(result);
      if (outcome.url) window.location.assign(outcome.url);
      else {
        setNotice(checkoutNotice(outcome.status));
        setBusy(false); setRevision(value => value + 1);
      }
    } catch (cause) { setError(cause.message); setBusy(false); }
  }
  const returned = new URLSearchParams(window.location.search).get('checkout');
  return <Card><CardContent className="space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-display text-xl font-semibold">League payments</h2>{data?.mode === 'test' && <Badge variant="secondary">Stripe test mode · No real money</Badge>}</div>
    {returned && !commissioner && <p role="status" className="text-sm">{returned === 'cancelled' ? 'Checkout closed. Your payment status is shown below.' : 'Back from Checkout. Payment is confirmed only after Stripe verification. Refresh to check its status.'}</p>}
    {isDemo ? <p className="text-sm">Payments are unavailable in this demo.</p> : <>
      {notice && <p role="status" className="text-sm">{notice}</p>}
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {!data && !error && <p role="status" className="text-sm">Loading payments…</p>}
      {data && <>
        <p className="text-sm">{data.mode === 'test' ? 'Test checkout balance' : 'Amount due'} <strong>{formatMoney(data.due_cents ?? 0)}</strong></p>
        {!data.enabled && <p className="text-sm text-charcoal-600">Online payment collection is not enabled.</p>}
        {!commissioner && data.enabled && data.due_cents > 0 && <Button className="h-11 w-full" onClick={checkout} disabled={busy}>{busy ? 'Opening Checkout…' : data.mode === 'test' ? 'Try test payment' : 'Pay securely with Stripe'}</Button>}
        <ul className="divide-y divide-border">{(data.orders ?? []).map(order => <li key={order.id} className="space-y-2 py-3"><div className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{formatMoney(order.amount_cents)}</span><Badge variant="secondary">{order.status.replaceAll('_', ' ')}</Badge></div><p className="text-xs text-charcoal-600">{new Date(order.created_at).toLocaleDateString()} · {order.livemode === true ? 'Stripe payment' : 'Test transaction · excludes real balances'}</p>{order.dispute_status && <p className="text-sm">Dispute: {order.dispute_status.replaceAll('_', ' ')}{order.status === 'disputed' ? ' · Commissioner reconciliation required' : ''}</p>}{order.refunded_cents > 0 && <p className="text-sm">Refunded: {formatMoney(order.refunded_cents)}</p>}{(order.refunds ?? []).map(refund => <p key={refund.id} className="text-sm">{refundLabel(refund.status)}: {formatMoney(refund.amount_cents)}</p>)}{receiptUrl(order.receipt_url) && <a className="inline-flex min-h-11 items-center text-sm underline" href={receiptUrl(order.receipt_url)} target="_blank" rel="noopener noreferrer">View Stripe receipt</a>}</li>)}</ul>
        {!data.orders?.length && <p className="text-sm text-charcoal-600">No Stripe payment history yet.</p>}
      </>}
      <Button variant="outline" className="h-11" disabled={busy} onClick={() => setRevision(value => value + 1)}>Refresh payments</Button>
    </>}
  </CardContent></Card>;
}
