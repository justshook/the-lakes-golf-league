import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

export default function SignInPage() {
  const {
    user, loading, configured, googleEnabled, passwordRecovery, signInWithGoogle,
    signInWithPassword, requestPasswordSetup, requestPasswordReset, error: sessionError,
  } = usePlayerSession();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(null);
  const [sent, setSent] = useState(null);
  const [sentDemo, setSentDemo] = useState(false);
  const [error, setError] = useState('');
  if (user) return <Navigate to={passwordRecovery ? "/account/password" : "/"} replace />;

  const isCreating = mode === 'setup';
  const isResetting = mode === 'reset';
  const disabled = Boolean(pending) || loading || configured === false;
  const title = isResetting ? 'Reset your password.' : isCreating ? 'Set up your league login.' : 'See you on Monday.';
  function changeMode(next) {
    setMode(next); setSent(null); setSentDemo(false); setError(''); setPassword(''); setShowPassword(false);
  }
  async function submit(event) {
    event.preventDefault();
    if (pending) return;
    setError('');
    setPending('email');
    try {
      if (isResetting) {
        const result = await requestPasswordReset(email.trim()); setSentDemo(result?.demo === true); setSent('reset');
      } else if (isCreating) {
        const result = await requestPasswordSetup(email.trim()); setSentDemo(result?.demo === true); setSent('setup'); setPassword('');
      } else {
        await signInWithPassword(email.trim(), password);
      }
    } catch (cause) { setError(cause.message || 'We couldn’t complete that request. Please try again.'); }
    finally { setPending(null); }
  }
  async function googleSignIn() {
    if (pending) return;
    setPending('google'); setError('');
    try { await signInWithGoogle(); }
    catch (cause) { setError(cause.message || 'Google sign-in isn’t available right now. Try your email and password.'); }
    finally { setPending(null); }
  }

  return <div className="mx-auto max-w-md space-y-6 py-3 sm:py-9">
    <header className="space-y-2"><p className="page-eyebrow">Your league, connected</p><h1 className="page-heading">{title}</h1><p className="text-sm leading-6 text-charcoal-600">{isResetting ? 'We’ll send a secure link to the email on your account.' : isCreating ? 'Verify your league email, then choose your password.' : 'Your tee time, your team, and your playing history—all in one place.'}</p></header>
    <Card className="content-card"><CardContent className="space-y-4 p-5 sm:p-7">
      {sent ? <div className="space-y-4" role="status">
        <span className="flex size-12 items-center justify-center rounded-full bg-forest-900/10 text-forest-900"><Check className="size-6" aria-hidden="true" /></span>
        <h2 className="text-xl font-semibold">{sentDemo ? 'Preview only' : 'Check your inbox'}</h2>
        <p className="break-words text-sm leading-6 text-charcoal-600">{sentDemo ? <>No email was sent. In the live league, this step emails you a secure link to verify your email and choose a password.</> : sent === 'reset' ? <>If an account exists for <strong className="font-semibold text-foreground">{email}</strong>, you’ll receive a secure password-reset link.</> : <>Look for a verification email at <strong className="font-semibold text-foreground">{email}</strong>. Open the secure link to verify your email and choose a password.</>}</p>
        {!sentDemo && <p className="text-xs leading-5 text-charcoal-600">Open the latest email on this phone. Check your spam folder if it doesn’t arrive.</p>}
        {sent === 'setup' && <p className="rounded-xl bg-cream-200 p-3 text-xs leading-5 text-charcoal-600">Already created an account with this email? Sign in with your existing password, or reset it below.</p>}
        <Button variant="outline" className="w-full" onClick={() => changeMode('signin')}>Back to sign in</Button>
        <div className="flex flex-wrap justify-center gap-x-3"><button type="button" className="min-h-11 px-2 text-xs font-medium text-forest-900 underline-offset-4 hover:underline" onClick={() => changeMode(sent === 'reset' ? 'reset' : 'setup')}>Use a different email</button>{sent === 'setup' && <button type="button" className="min-h-11 px-2 text-xs font-medium text-forest-900 underline-offset-4 hover:underline" onClick={() => changeMode('reset')}>Reset an existing password</button>}</div>
      </div> : <>
        {!isResetting && <>
          <Button type="button" variant="outline" disabled={disabled || !googleEnabled} onClick={googleSignIn} className="h-12 w-full border-forest-900/25 bg-white text-sm font-semibold shadow-none">{pending === 'google' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <span className="mr-1 text-lg font-bold" aria-hidden="true">G</span>}Continue with Google</Button>
          {!googleEnabled && configured !== false && <p className="-mt-3 text-center text-xs leading-5 text-charcoal-600">Google sign-in isn’t available yet. You can use email below.</p>}
          <div className="flex items-center gap-3" aria-hidden="true"><div className="h-px flex-1 bg-border" /><span className="text-[10px] font-medium uppercase tracking-wider text-charcoal-600">or use email</span><div className="h-px flex-1 bg-border" /></div>

        </>}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2"><label htmlFor="login-email" className="text-sm font-semibold">Your league email</label><div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 size-5 text-charcoal-600" aria-hidden="true" /><Input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck="false" placeholder="you@example.com" required value={email} onChange={event => setEmail(event.target.value)} className="pl-10" aria-describedby="email-help" disabled={disabled} /></div><p id="email-help" className="text-xs leading-5 text-charcoal-600">Use the email on your league roster to connect your existing player history.</p></div>
          {!isResetting && !isCreating && <>
            <div className="space-y-2"><label htmlFor="login-password" className="text-sm font-semibold">Password</label><div className="relative"><Input id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="pr-12" disabled={disabled} /><button type="button" onClick={() => setShowPassword(current => !current)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-charcoal-600" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={Boolean(pending)}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
          </>}
          {(error || sessionError) && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-destructive">{error || sessionError}</p>}
          {configured === false && <p role="status" className="rounded-xl bg-cream-200 p-3 text-sm leading-6 text-charcoal-600">Player sign-in is being set up. Please check back with your commissioner.</p>}
          <Button type="submit" disabled={disabled} className="w-full bg-cta-500 text-forest-950 hover:bg-cta-400">{pending === 'email' ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />{isResetting ? 'Sending link…' : isCreating ? 'Sending setup link…' : 'Signing in…'}</> : <>{isResetting ? 'Send password-reset link' : isCreating ? 'Email me a setup link' : 'Sign in'}<ArrowRight className="size-4" /></>}</Button>
          {!isCreating && !isResetting && <div className="flex flex-wrap items-center justify-between gap-x-2"><button type="button" onClick={() => changeMode('setup')} disabled={Boolean(pending)} className="min-h-11 text-left text-xs font-semibold text-forest-900 hover:underline">First time here? Set up login</button><button type="button" onClick={() => changeMode('reset')} disabled={Boolean(pending)} className="min-h-11 text-left text-xs font-medium text-charcoal-600 hover:underline">Forgot password?</button></div>}
          {(isResetting || isCreating) && <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => changeMode('signin')} disabled={Boolean(pending)}><ArrowLeft className="size-3.5" />Back to sign in</Button>}
        </form>
      </>}
    </CardContent></Card>
    <div className="space-y-1 px-1 text-xs leading-5 text-charcoal-600"><p className="font-semibold text-foreground">Already play in the league?</p><p>{isResetting ? 'If you’ve never signed in before, choose First time here? and use the email on your roster.' : 'Use First time here? to set up your login, or continue with Google using your roster email. Your existing scores and winnings will link after verification.'}</p><p className="pt-1">Using a different email? Ask your commissioner to update your roster email before signing in.</p></div>
    <Button variant="ghost" asChild className="px-0 text-charcoal-600"><Link to="/league"><ArrowLeft className="size-4" />Back to the league</Link></Button>
  </div>;
}
