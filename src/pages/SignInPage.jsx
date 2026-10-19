import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LoaderCircle, Mail } from 'lucide-react';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

export default function SignInPage() {
  const { user, loading, configured, signIn, error: sessionError } = usePlayerSession();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  if (user) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError('');
    try { await signIn(email.trim()); setSent(true); } catch (e) { setError(e.message || 'We couldn’t send your sign-in link. Please try again.'); } finally { setPending(false); }
  }
  return <div className="mx-auto max-w-md space-y-7 py-6 sm:py-12">
    <div className="space-y-3"><p className="page-eyebrow">Welcome back</p><h1 className="page-heading">See you on Monday.</h1><p className="text-sm leading-6 text-charcoal-600">Sign in for your tee time, your team, and everything you need for league night.</p></div>
    <Card className="content-card"><CardContent className="p-6 sm:p-7">
      {sent ? <div className="space-y-4" role="status"><span className="flex size-12 items-center justify-center rounded-full bg-forest-900/10 text-forest-900"><Check className="size-6" /></span><h2 className="text-xl font-semibold">Check your inbox</h2><p className="break-words text-sm leading-6 text-charcoal-600">We sent a secure sign-in link to <strong className="font-semibold text-foreground">{email}</strong>. Open it on this phone to continue.</p><p className="text-xs leading-5 text-charcoal-600">Can’t find it? Check your spam folder. The link works once and expires for your security.</p><Button variant="outline" className="w-full" onClick={() => { setSent(false); setError(''); }}>Use a different email</Button></div> : <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2"><label htmlFor="login-email" className="text-sm font-semibold">Your league email</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 size-5 text-charcoal-600" aria-hidden="true" /><Input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)} className="pl-10" aria-describedby="email-help" disabled={pending} /></div><p id="email-help" className="text-xs leading-5 text-charcoal-600">Use the email on your player profile. No password to remember.</p></div>
        {(error || sessionError) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error || sessionError}</p>}
        {configured === false && <p role="status" className="rounded-xl bg-cream-200 p-3 text-sm leading-6 text-charcoal-600">Player sign-in is being set up. Please check back with your commissioner.</p>}
        <Button type="submit" disabled={pending || loading || configured === false} className="w-full bg-cta-500 text-forest-950 hover:bg-cta-400">{pending ? <><LoaderCircle className="size-4 animate-spin" />Sending link…</> : <>Email me a sign-in link<ArrowRight className="size-4" /></>}</Button>
      </form>}
    </CardContent></Card>
    <Button variant="ghost" asChild className="px-0 text-charcoal-600"><Link to="/league"><ArrowLeft className="size-4" />Back to the league</Link></Button>
  </div>;
}
