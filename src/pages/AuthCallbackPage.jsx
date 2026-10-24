import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CircleAlert, Flag, LoaderCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { completeAuthCallback, callbackErrorMessage } from '../lib/auth-callback';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshProfile, beginPasswordRecovery } = usePlayerSession();
  const originalUrl = useRef(window.location.href);
  const operation = useRef(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    // Remove credentials from browser history before any links or error UI render.
    window.history.replaceState(window.history.state, '', '/auth/callback');
    // Reuse the operation during React StrictMode's effect replay. A one-use token
    // must never be exchanged twice because a component effect reran.
    if (!operation.current) operation.current = completeAuthCallback(supabase, originalUrl.current);
    operation.current.then(async result => {
      if (!active) return;
      if (result.needsPasswordSetup) beginPasswordRecovery?.(result.user.id);
      await refreshProfile();
      if (active) navigate(result.next, { replace: true });
    }).catch(cause => { if (active) setError(callbackErrorMessage(cause)); });
    return () => { active = false; };
  }, [navigate, refreshProfile, beginPasswordRecovery]);
  return <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
    <div className="w-full max-w-md space-y-6"><div className="flex items-center justify-center gap-2 text-forest-950"><Flag className="size-5" /><span className="font-serif text-2xl font-semibold">The Lakes</span></div>
      <Card><CardContent className="space-y-5 p-6 sm:p-8">{error ? <>
        <CircleAlert className="size-8 text-destructive" aria-hidden="true" /><h1 className="font-display text-2xl font-semibold">Let’s get you signed in</h1><p role="alert" className="text-sm leading-6 text-charcoal-600">{error}</p>
        <Button asChild className="w-full"><Link to="/login">Return to sign in</Link></Button><Button asChild variant="outline" className="w-full"><Link to="/league">View league schedule</Link></Button>
      </> : <div role="status" className="space-y-4 py-6 text-center"><LoaderCircle className="mx-auto size-8 animate-spin text-forest-900" aria-hidden="true" /><h1 className="font-display text-2xl font-semibold">Finishing your sign-in</h1><p className="text-sm leading-6 text-charcoal-600">Verifying your account and finding your player profile.</p></div>}</CardContent></Card>
    </div>
  </main>;
}
