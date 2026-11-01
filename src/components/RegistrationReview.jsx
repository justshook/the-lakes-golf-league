import React, { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, RefreshCw, UserPlus, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { decideRegistration, loadRegistration, membershipLabel, registrationNotificationSummary, retryRegistrationNotifications } from '../services/registration-service';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

export default function RegistrationReview({ onDecision } = {}) {
  const { user, isAdmin, isDemo } = usePlayerSession();
  const [storedData, setData] = useState(null);
  const [dataUser, setDataUser] = useState(null);
  const data = dataUser === user?.id ? storedData : null;
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selection, setSelection] = useState(null);
  const [revision, setRevision] = useState(0);
  const identity = useRef(user?.id);
  identity.current = user?.id;

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setDataUser(null); setError(''); setNotice(''); setSelection(null);
    if (!user || !isAdmin || isDemo) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    loadRegistration(supabase, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) { setData(value); setDataUser(user.id); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, isAdmin, isDemo, revision]);

  async function decide() {
    if (!selection || busy) return;
    const decidingUser = user?.id;
    const { application, decision } = selection;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await decideRegistration(supabase, application.id, decision);
      if (identity.current !== decidingUser) return;
      if (!result.application?.id || !['pending', 'approved', 'rejected'].includes(result.application.status)) throw new Error('The decision status could not be confirmed. Refresh before trying again.');
      setData(current => ({ ...current, applications: (current?.applications || []).map(item => item.id === application.id ? result.application : item) }));
      setSelection(null);
      setNotice(`Registration ${decision === 'approved' ? 'approved' : 'rejected'}. ${registrationNotificationSummary(result.notifications) || 'The saved decision is shown below; no email delivery has been confirmed.'}`);
      try { await onDecision?.(result.application); }
      catch { if (identity.current === decidingUser) setNotice(current => `${current} Reload the league to refresh the roster.`); }
      const fresh = await loadRegistration(supabase).catch(() => null);
      if (fresh && identity.current === decidingUser) setData(fresh);
    } catch (cause) { if (identity.current === decidingUser) setError(cause.message); }
    finally { if (identity.current === decidingUser) setBusy(false); }
  }
  async function retryEmails(application) {
    if (busy || !['queued', 'failed'].includes(application.notification_status)) return;
    const requestingUser = user?.id;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await retryRegistrationNotifications(supabase, application.id);
      if (identity.current !== requestingUser) return;
      if (result.application) setData(current => ({ ...current, applications: (current?.applications || []).map(item => item.id === application.id ? result.application : item) }));
      setNotice(registrationNotificationSummary(result.notifications) || 'The retry request completed. Email delivery has not been confirmed.');
      const fresh = await loadRegistration(supabase).catch(() => null);
      if (fresh && identity.current === requestingUser) setData(fresh);
    } catch (cause) { if (identity.current === requestingUser) setError(cause.message); }
    finally { if (identity.current === requestingUser) setBusy(false); }
  }
  useEffect(() => { setBusy(false); }, [user?.id]);
  if (!user || !isAdmin) return null;
  const applications = data?.applications || [];
  const pendingCount = applications.filter(item => item.status === 'pending').length;
  const visible = applications.filter(item => filter === 'all' || item.status === filter);

  return <section className="space-y-4" aria-labelledby="registration-review-heading">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="page-eyebrow">New players</p><h2 id="registration-review-heading" className="font-display text-2xl font-semibold">Registration review</h2></div><Badge variant="secondary">{pendingCount} pending</Badge></header>
    <Card className="content-card"><CardContent className="space-y-5 p-4 sm:p-6">
      <p className="text-sm leading-6 text-charcoal-600">Approve or reject new-player applications. Approval adds the player to the league; full-time players then complete their $180 payment step. Substitutes are free. These decisions do not collect payment.</p>
      {isDemo ? <p className="text-sm text-charcoal-600">Live registrations and email delivery are unavailable in this demo.</p> : <>
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="space-y-1"><label htmlFor="registration-status-filter" className="block text-xs font-semibold text-charcoal-600">Show registrations</label><select id="registration-status-filter" className="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={filter} onChange={event => setFilter(event.target.value)} disabled={busy}><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Not approved</option><option value="all">All registrations</option></select></div><Button variant="outline" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className="size-4" aria-hidden="true" />Refresh</Button></div>
        {registrationNotificationSummary(data?.notifications) && <p className="text-xs leading-6 text-charcoal-600">{registrationNotificationSummary(data.notifications)}</p>}
        {notice && <p role="status" className="rounded-xl bg-cream-200 p-4 text-sm leading-6">{notice}</p>}
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</p>}
        {loading ? <p role="status" className="flex items-center gap-2 py-5 text-sm text-charcoal-600"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Loading registrations…</p> : data?.is_admin === false ? <p className="text-sm text-charcoal-600">Commissioner access is required to review registrations. Sign in again if your access has changed.</p> : data && visible.length ? <ul className="divide-y divide-border">{visible.map(application => <li key={application.id} className="space-y-4 py-5 first:pt-0 last:pb-0"><div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h3 className="break-words text-base font-semibold">{application.first_name} {application.last_name}</h3><p className="mt-1 text-xs text-charcoal-600">{membershipLabel(application.membership_type)}</p></div><Badge variant="secondary">{application.status === 'rejected' ? 'Not approved' : application.status === 'approved' ? 'Approved' : 'Pending review'}</Badge></div><dl className="grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2"><Detail label="Phone">{application.phone || 'Not provided'}</Detail><Detail label="Verified email">{application.email || 'Not provided'}</Detail><Detail label="Handicap ID (GHIN or CDGA)">{application.handicap_id || 'Not provided'}</Detail><Detail label="Handicap index">{application.handicap_index ?? 'Not provided'}</Detail><Detail label="Available tee times">{application.availability?.join(', ') || 'No times selected'}</Detail>{application.player_id != null && <Detail label="Player record">#{application.player_id}</Detail>}{application.notification_status && <Detail label="Registration email">{notificationStatus(application.notification_status)}</Detail>}</dl>{['queued', 'failed'].includes(application.notification_status) && <Button variant="outline" disabled={busy} onClick={() => retryEmails(application)}>Retry queued or failed emails</Button>}{application.notification_status === 'unknown' && <p className="text-xs leading-6 text-charcoal-600">Delivery is unconfirmed. Check the email provider before resending.</p>}{application.status === 'pending' && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => { setError(''); setSelection({ application, decision: 'approved' }); }}><Check className="size-4" aria-hidden="true" />Approve</Button><Button variant="outline" disabled={busy} onClick={() => { setError(''); setSelection({ application, decision: 'rejected' }); }}><X className="size-4" aria-hidden="true" />Reject</Button></div>}</li>)}</ul> : data && !error ? <div className="space-y-2 py-6 text-center"><UserPlus className="mx-auto size-7 text-forest-900" aria-hidden="true" /><p className="text-sm font-semibold">{filter === 'pending' ? 'No applications waiting for review.' : 'No registrations in this view.'}</p></div> : null}
      </>}
    </CardContent></Card>
    <Dialog open={Boolean(selection)} onOpenChange={open => { if (!open && !busy) setSelection(null); }}><DialogContent><DialogHeader className="pr-6 text-left"><DialogTitle>{selection?.decision === 'approved' ? 'Approve this registration?' : 'Reject this registration?'}</DialogTitle><DialogDescription className="pt-2 leading-6">{selection?.application.first_name} {selection?.application.last_name}{selection?.decision === 'approved' ? <> will be added to the league as {selection.application.membership_type === 'substitute' ? 'a substitute, with no membership fee' : 'a full-time player, with a $180 payment step after approval'}. No payment is collected by this action.</> : ' will be marked not approved. Email status appears after saving. This does not change existing player histories or initiate a payment.'}</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm leading-6 text-red-800">{error}</p>}<DialogFooter className="gap-2"><Button variant="outline" disabled={busy} onClick={() => setSelection(null)}>Cancel</Button><Button disabled={busy} variant={selection?.decision === 'rejected' ? 'destructive' : 'default'} onClick={decide}>{busy ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Saving decision…</> : selection?.decision === 'approved' ? 'Approve registration' : 'Reject registration'}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}

function Detail({ label, children }) { return <div className="min-w-0"><dt className="text-xs text-charcoal-600">{label}</dt><dd className="mt-1 break-words leading-6">{children}</dd></div>; }
function notificationStatus(value) { return ({ sent: 'Sent', queued: 'Queued', failed: 'Failed — follow-up needed', unknown: 'Delivery unconfirmed — manual review' })[value] || 'Status not confirmed'; }
