import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from 'lucide-react';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { MIN_PASSWORD_LENGTH } from '../lib/player-service';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';

export default function SetPasswordPage() {
  const { user, loading, authLoading, configured, setupRequired, updatePassword } = usePlayerSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  if (authLoading ?? loading) return <div role="status" className="flex min-h-[45vh] items-center justify-center gap-3 text-sm text-charcoal-600"><LoaderCircle className="size-5 animate-spin" aria-hidden="true" />Checking your sign-in…</div>;

  async function save(event) {
    event.preventDefault();
    if (pending || !user) return;
    setError('');
    if (password !== confirmation) { setError('Your passwords don’t match. Please check both fields.'); return; }
    if (password.length < MIN_PASSWORD_LENGTH) { setError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`); return; }
    setPending(true);
    try { await updatePassword(password); setPassword(''); setConfirmation(''); navigate('/', { replace: true, state: { passwordUpdated: true } }); }
    catch (cause) { setError(cause.message || 'We couldn’t update your password. Please try again.'); }
    finally { setPending(false); }
  }

  return <div className="mx-auto max-w-md space-y-6 py-5 sm:py-12">
    <header className="space-y-2"><p className="page-eyebrow">Your account</p><h1 className="page-heading">Set your password.</h1><p className="text-sm leading-6 text-charcoal-600">Choose a password you’ll use to sign in to The Lakes.</p></header>
    <Card className="content-card"><CardContent className="space-y-5 p-6 sm:p-7">
      <span className="flex size-12 items-center justify-center rounded-full bg-forest-900/10 text-forest-900"><LockKeyhole className="size-5" aria-hidden="true" /></span>
      {!user || configured === false ? <div className="space-y-4"><h2 className="text-lg font-semibold">Verify your email first</h2><p className="text-sm leading-6 text-charcoal-600">Open the latest setup or password-reset link from your email to continue. If the link has expired or was already used, request a new one from the sign-in page.</p><Button asChild className="w-full"><Link to="/login">Go to sign in<ArrowRight className="size-4" /></Link></Button></div> : <>
        <p className="break-words text-sm leading-6 text-charcoal-600">Signed in as <strong className="font-semibold text-foreground">{user.email || 'your verified account'}</strong></p>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-2"><label htmlFor="new-password" className="text-sm font-semibold">New password</label><div className="relative"><Input id="new-password" name="newPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required value={password} onChange={event => setPassword(event.target.value)} disabled={pending} className="pr-12" aria-describedby="new-password-help" /><button type="button" onClick={() => setShowPassword(current => !current)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-charcoal-600" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} disabled={pending}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><p id="new-password-help" className="text-xs leading-5 text-charcoal-600">Use at least {MIN_PASSWORD_LENGTH} characters. A few memorable words work well.</p></div>
          <div className="space-y-2"><label htmlFor="confirm-new-password" className="text-sm font-semibold">Confirm new password</label><Input id="confirm-new-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={pending} /></div>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-6 text-destructive">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full bg-cta-500 text-forest-950 hover:bg-cta-400">{pending ? <><LoaderCircle className="size-4 animate-spin" aria-hidden="true" />Saving password…</> : <>Save password<ArrowRight className="size-4" /></>}</Button>
        </form>
      </>}
    </CardContent></Card>
    {user && !setupRequired && <Button variant="ghost" asChild className="px-0 text-charcoal-600"><Link to="/"><ArrowLeft className="size-4" />Back to My Week</Link></Button>}
  </div>;
}
