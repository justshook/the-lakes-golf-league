import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Clock3, LoaderCircle, Mail, RefreshCw } from 'lucide-react';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { supabase } from '../supabaseClient';
import { teeTimes } from '../constants';
import { loadRegistration, membershipLabel, registrationNotificationSummary, submitRegistration } from '../services/registration-service';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

const emptyForm = { first_name: '', last_name: '', phone: '', handicap_id: '', handicap_index: '', availability: [], membership_type: 'full_time' };
const emailStatus = status => ({ sent: 'Your registration email was sent.', queued: 'Your registration email is queued.', failed: 'Your registration is saved, but its email could not be sent. Contact the commissioner if you need help.', unknown: 'Your registration is saved. Email delivery is unconfirmed; the commissioner can review it.' }[status] || '');

export default function RegisterPage() {
  const { user, profile, authLoading, loading: profileLoading, configured, isDemo, requestPasswordSetup, refreshProfile } = usePlayerSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sentDemo, setSentDemo] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [storedData, setData] = useState(null);
  const [dataUser, setDataUser] = useState(null);
  const data = dataUser === user?.id ? storedData : null;
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const identity = useRef(user?.id);
  const navigate = useNavigate();
  identity.current = user?.id;

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setDataUser(null); setError(''); setNotice(''); setForm(emptyForm); setLoading(Boolean(user));
    if (!user) return () => controller.abort();
    if (isDemo) { setLoading(false); return () => controller.abort(); }
    loadRegistration(supabase, { signal: controller.signal })
      .then(async value => { if (!controller.signal.aborted && value.application?.status === 'approved' && !profile?.player_id) await refreshProfile?.(); if (!controller.signal.aborted) { setData(value); setDataUser(user.id); } })
      .catch(cause => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [user?.id, isDemo, revision]);
  useEffect(() => { setBusy(false); }, [user?.id]);

  async function emailSetup(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await requestPasswordSetup(email.trim());
      setSentDemo(result?.demo === true); setSent(true);
    } catch { setError('We couldn’t send a setup link right now. Please try again, or sign in if you already have an account.'); }
    finally { setBusy(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const submittingUser = user?.id;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await submitRegistration(supabase, form);
      if (identity.current !== submittingUser) return;
      if (result.existing_player === true) {
        await refreshProfile?.();
        if (identity.current === submittingUser) navigate('/', { replace: true });
        return;
      }
      if (!result.application) throw new Error('Registration status could not be confirmed. Refresh before submitting again.');
      setData(current => ({ ...current, application: result.application }));
      setNotice(registrationNotificationSummary(result.notifications));
      refreshProfile?.();
    } catch (cause) { if (identity.current === submittingUser) setError(cause.message); }
    finally { if (identity.current === submittingUser) setBusy(false); }
  }
  const update = field => event => setForm(current => ({ ...current, [field]: event.target.value }));
  const application = data?.application;
  const existingPlayer = Boolean(profile?.player_id || data?.player_id);

  return <div className="mx-auto max-w-2xl space-y-6 py-3 sm:py-8">
    <header className="space-y-2"><p className="page-eyebrow">Make Monday your game</p><h1 className="page-heading">Join The Lakes</h1><p className="text-sm leading-6 text-charcoal-600">Verify your email, share your playing details, and send your registration to the commissioner.</p></header>
    {authLoading ? <Loading text="Checking your account…" /> : !user ? <Card className="content-card"><CardContent className="space-y-5 p-5 sm:p-7">
      {sent ? <div className="space-y-4" role="status"><Mail className="size-8 text-forest-900" aria-hidden="true" /><h2 className="text-xl font-semibold">{sentDemo ? 'Preview only' : 'Check your inbox'}</h2><p className="break-words text-sm leading-6 text-charcoal-600">{sentDemo ? 'No email was sent in this preview.' : <>If a setup email can be sent to <strong>{email}</strong>, it will contain a secure link to verify your email and choose a password. Open the latest link, finish password setup, then return here.</>}</p><Button variant="outline" onClick={() => { setSent(false); setError(''); }}>Use a different email</Button></div> : <form onSubmit={emailSetup} className="space-y-4"><div className="space-y-2"><label htmlFor="registration-email" className="text-sm font-semibold">Your email</label><Input id="registration-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={email} onChange={event => setEmail(event.target.value)} disabled={busy || configured === false} /><p className="text-xs leading-5 text-charcoal-600">We’ll send a secure setup link. You’ll choose your password after verifying your email.</p></div>{error && <ErrorMessage text={error} />}<Button type="submit" className="w-full bg-cta-500 text-forest-950 hover:bg-cta-400" disabled={busy || configured === false}>{busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Mail className="size-4" aria-hidden="true" />}Email me a setup link</Button>{configured === false && <p role="status" className="text-sm text-charcoal-600">Account setup is temporarily unavailable. Please contact the commissioner.</p>}</form>}
      <div className="space-y-2 border-t pt-4 text-xs leading-6 text-charcoal-600"><p className="font-semibold text-foreground">Already a Lakes player?</p><p>Use your roster email. After verification, a uniquely matching email connects to your original player profile, scores, winnings, and handicap.</p><Link className="inline-flex min-h-11 items-center font-semibold text-forest-900 underline underline-offset-4" to="/login">Already have a password? Sign in</Link></div>
    </CardContent></Card> : <>
      {loading || profileLoading ? <Loading text="Loading your registration…" /> : isDemo ? <Card><CardContent className="space-y-3 p-5"><h2 className="font-semibold">Registration preview</h2><p className="text-sm leading-6 text-charcoal-600">Registration and email delivery are unavailable in this demo.</p><Button asChild variant="outline"><Link to="/">Continue to My Week</Link></Button></CardContent></Card> : <>
        {error && <ErrorMessage text={error} />}
        {notice && <p role="status" className="rounded-xl bg-cream-200 p-4 text-sm leading-6">{notice}</p>}
        {application ? <ApplicationStatus application={application} paid={data?.registration_paid} /> : existingPlayer ? <Card className="content-card"><CardContent className="space-y-4 p-5 sm:p-7"><Check className="size-8 text-forest-900" aria-hidden="true" /><h2 className="text-xl font-semibold">Your player profile is connected.</h2><p className="text-sm leading-6 text-charcoal-600">Your existing player record and history are ready. You don’t need a new-player application.</p><Button asChild className="w-full sm:w-auto"><Link to="/">Continue to My Week<ArrowRight className="size-4" /></Link></Button></CardContent></Card> : data && !user.email_confirmed_at ? <ErrorMessage text="Verify your email before submitting a registration. Open your setup email or sign in again." /> : data ? <Card className="content-card"><CardContent className="p-5 sm:p-7"><form onSubmit={submit} className="space-y-6">
          <div className="space-y-2"><label htmlFor="verified-registration-email" className="text-sm font-semibold">Verified email</label><Input id="verified-registration-email" type="email" value={user.email || ''} readOnly aria-describedby="verified-registration-help" className="bg-cream-200/50" /><p id="verified-registration-help" className="text-xs leading-5 text-charcoal-600">Your application belongs to this signed-in account. Contact the commissioner if you already play under a different roster email.</p></div>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="First name" id="registration-first-name"><Input id="registration-first-name" autoComplete="given-name" required maxLength={80} value={form.first_name} onChange={update('first_name')} disabled={busy} /></Field><Field label="Last name" id="registration-last-name"><Input id="registration-last-name" autoComplete="family-name" required maxLength={80} value={form.last_name} onChange={update('last_name')} disabled={busy} /></Field></div>
          <Field label="Phone number" id="registration-phone"><Input id="registration-phone" type="tel" inputMode="tel" autoComplete="tel" required maxLength={40} value={form.phone} onChange={update('phone')} disabled={busy} /><p className="text-xs leading-5 text-charcoal-600">For league coordination. Your phone number is kept behind account access controls.</p></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Handicap ID (GHIN or CDGA)" id="registration-handicap-id"><Input id="registration-handicap-id" required maxLength={40} value={form.handicap_id} onChange={update('handicap_id')} disabled={busy} /><p className="text-xs leading-5 text-charcoal-600">Enter the ID used for your GHIN or CDGA handicap record.</p></Field><Field label="Handicap index" id="registration-handicap-index"><Input id="registration-handicap-index" type="number" inputMode="decimal" min={-10} max={54} step="0.1" required value={form.handicap_index} onChange={update('handicap_index')} disabled={busy} /><p className="text-xs leading-5 text-charcoal-600">Use your 18-hole index, from -10 to 54.</p></Field></div>
          <fieldset disabled={busy} className="space-y-3"><legend className="text-sm font-semibold">Membership</legend><div className="grid gap-3 sm:grid-cols-2">{[['full_time', 'Full-time', '$180 season dues after approval.'], ['substitute', 'Substitute', 'Free registration. No membership payment.']].map(([value, label, description]) => <label key={value} className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-xl border p-4 ${form.membership_type === value ? 'border-forest-900 bg-forest-900/5' : 'border-border'}`}><input type="radio" name="membership_type" value={value} checked={form.membership_type === value} onChange={update('membership_type')} className="mt-1 size-4 accent-forest-900" /><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-charcoal-600">{description}</span></span></label>)}</div></fieldset>
          <fieldset disabled={busy} className="space-y-3"><legend className="text-sm font-semibold">Available tee times</legend><p className="text-xs leading-5 text-charcoal-600">Choose every time you can reliably make. Select at least one. Recurring tee-time availability is visible on the public league roster.</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{teeTimes.map(time => <label key={time} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${form.availability.includes(time) ? 'border-forest-900 bg-forest-900/5' : 'border-border'}`}><input type="checkbox" value={time} checked={form.availability.includes(time)} onChange={event => setForm(current => ({ ...current, availability: event.target.checked ? teeTimes.filter(item => current.availability.includes(item) || item === time) : current.availability.filter(item => item !== time) }))} className="size-4 shrink-0 accent-forest-900" />{time}</label>)}</div></fieldset>
          <p className="rounded-xl bg-cream-200 p-4 text-xs leading-6 text-charcoal-600">The commissioner reviews your application before adding you to the roster. Submitting this form does not charge you. {form.membership_type === 'full_time' ? 'Approved full-time players can then pay $180 through secure Checkout.' : 'Substitute membership is free.'}</p>
          <Button type="submit" className="w-full bg-cta-500 text-forest-950 hover:bg-cta-400" disabled={busy}>{busy ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Sending registration…</> : <>Send registration for review<ArrowRight className="size-4" /></>}</Button>
        </form></CardContent></Card> : null}
        <Button variant="outline" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}><RefreshCw className="size-4" aria-hidden="true" />Refresh registration status</Button>
      </>}
    </>}
    <p className="text-xs leading-6 text-charcoal-600">Questions? <a href="mailto:justshook@gmail.com" className="inline-flex min-h-11 items-center underline underline-offset-4">Contact the commissioner</a> · <Link to="/privacy" className="inline-flex min-h-11 items-center underline underline-offset-4">Privacy policy</Link></p>
  </div>;
}

function ApplicationStatus({ application, paid }) {
  const approved = application.status === 'approved';
  const rejected = application.status === 'rejected';
  return <Card className="content-card"><CardContent className="space-y-4 p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><span className="flex size-11 items-center justify-center rounded-full bg-cream-200 text-forest-900">{approved ? <Check className="size-5" aria-hidden="true" /> : <Clock3 className="size-5" aria-hidden="true" />}</span><Badge variant="secondary">{approved ? 'Approved' : rejected ? 'Not approved' : 'Pending review'}</Badge></div><h2 className="text-xl font-semibold">{approved ? 'Welcome to The Lakes.' : rejected ? 'Your registration was reviewed.' : 'Your registration is with the commissioner.'}</h2><p className="text-sm leading-6 text-charcoal-600">{approved ? application.membership_type === 'substitute' ? 'Your substitute membership is free. Continue to your player profile and league schedule.' : 'Your full-time registration is approved. Continue to the payment step for your $180 season dues.' : rejected ? 'Your application was not approved. Contact the commissioner to discuss the registration.' : 'You don’t need to submit another application. Refresh this page to check the decision.'}</p><p className="text-sm font-semibold">{membershipLabel(application.membership_type)}</p>{emailStatus(application.notification_status) && <p role="status" className="text-xs leading-6 text-charcoal-600">{emailStatus(application.notification_status)}</p>}{approved && <Button asChild className="w-full sm:w-auto"><Link to={application.membership_type === 'substitute' ? '/' : '/registration/payment'}>{application.membership_type === 'substitute' ? 'Continue to My Week' : 'Continue to payment'}<ArrowRight className="size-4" /></Link></Button>}</CardContent></Card>;
}
function Field({ label, id, children }) { return <div className="space-y-2"><label htmlFor={id} className="text-sm font-semibold">{label}</label>{children}</div>; }
function ErrorMessage({ text }) {
  const alert = useRef(null);
  useEffect(() => { alert.current?.focus(); }, [text]);
  return <p ref={alert} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{text}</p>;
}
function Loading({ text }) { return <p role="status" className="flex min-h-40 items-center justify-center gap-3 text-sm text-charcoal-600"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" />{text}</p>; }
