import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleAlert, Flag, LoaderCircle, MailCheck, RefreshCw } from 'lucide-react';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

export default function PlayerAccountGate({ children }) {
  const { user, playerId, loading, error, profileError, configured, refreshProfile, signOut } = usePlayerSession();
  const [retryError, setRetryError] = React.useState('');
  async function retry() { setRetryError(''); try { await refreshProfile(); } catch (e) { setRetryError(e.message || 'Please try again.'); } }
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center gap-3 text-sm text-charcoal-600" role="status"><LoaderCircle className="size-5 animate-spin" />Loading your profile…</div>;
  if (user && playerId && !error) return children;
  const Icon = error ? CircleAlert : user ? MailCheck : Flag;
  return <div className="mx-auto max-w-xl space-y-6 py-5 sm:py-12">
    <div className="space-y-2 text-center"><p className="page-eyebrow">Your Monday, sorted</p><h1 className="page-heading">Your league. All in one place.</h1><p className="text-sm leading-6 text-charcoal-600">Your tee time, your team, and your season—right here.</p></div>
    <Card className="content-card"><CardContent className="space-y-5 p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-cream-200 text-forest-900"><Icon className="size-6" strokeWidth={1.6} /></span>
      <div className="space-y-2"><h2 className="text-lg font-semibold">{error ? 'We couldn’t load your profile' : user ? 'Let’s connect your player profile' : 'Welcome to The Lakes'}</h2><p className="text-sm leading-6 text-charcoal-600">{error ? (profileError || 'Your information is temporarily unavailable. Try loading your profile again.') : user ? 'Your account is signed in, but it isn’t linked to a league player yet. Ask your commissioner to check that your roster email matches your sign-in email.' : 'Sign in with the email you use for the league to see your schedule and manage your availability.'}</p></div>
      {user?.email && <p className="break-all text-xs text-charcoal-600">Signed in as {user.email}</p>}
      {retryError && <p role="alert" className="text-sm text-destructive">{retryError}</p>}
      {user ? <div className="flex flex-wrap gap-2"><Button onClick={retry} className="rounded-full"><RefreshCw className="mr-2 size-4" />Check again</Button><Button variant="outline" className="rounded-full" onClick={() => signOut().catch(e => setRetryError(e.message))}>Use another account</Button></div> : <Button asChild className="w-full rounded-full bg-cta-500 text-forest-950 hover:bg-cta-400"><Link to="/login">Sign in to your league<ArrowRight className="ml-2 size-4" /></Link></Button>}
      {configured === false && <p className="text-xs leading-5 text-charcoal-600">Player sign-in is being set up. Your commissioner will let you know when it’s ready.</p>}
      <Link to="/league" className="inline-flex min-h-11 items-center text-sm font-medium text-forest-900">View the league schedule <ArrowRight className="ml-2 size-4" /></Link>
    </CardContent></Card>
  </div>;
}
