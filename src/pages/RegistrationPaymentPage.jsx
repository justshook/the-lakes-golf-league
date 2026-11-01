import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePlayerSession } from '../contexts/PlayerSessionContext';
import { supabase } from '../supabaseClient';
import { loadRegistration } from '../services/registration-service';
import StripePayments from '../components/StripePayments';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

export default function RegistrationPaymentPage() {
  const { user, refreshProfile, isDemo } = usePlayerSession();
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    if (isDemo) { setError('Registration payments are unavailable in the demo.'); return; }
    loadRegistration(supabase, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) { setData(value); if (value.application?.status === 'approved') refreshProfile(); } }).catch(() => { if (!controller.signal.aborted) setError('We couldn’t load your registration. Please refresh or contact the commissioner.'); });
    return () => controller.abort();
  }, [user?.id, isDemo]);
  if (error) return <p role="alert" className="py-10 text-sm">{error}</p>;
  if (!data) return <p role="status" className="py-10 text-sm">Checking your registration…</p>;
  const approved = data.application?.status === 'approved' || Boolean(data.player_id && !data.application);
  const substitute = (data.application?.membership_type || data.membership_type) === 'substitute';
  return <div className="mx-auto max-w-xl space-y-6 py-4"><header className="space-y-2"><p className="page-eyebrow">Lakes League registration</p><h1 className="page-heading">{approved ? 'You’re in.' : 'Registration review'}</h1><p className="text-sm leading-6 text-charcoal-600">{approved ? substitute ? 'Your substitute membership is approved. There is no registration fee.' : data.registration_paid ? 'Your $180 registration payment is confirmed. You’re ready for the league.' : 'Your membership is approved. Complete your $180 full-time registration payment when collection is available.' : 'The commissioner needs to approve your application before you can pay.'}</p></header>
    {approved && !substitute ? <StripePayments /> : <Card><CardContent className="space-y-4 p-6"><p className="text-sm">{substitute && approved ? 'Registration fee: $0. No card or Checkout is needed.' : 'No fee has been collected. Check your application status for updates.'}</p><Button asChild><Link to={approved ? '/schedule' : '/register'}>{approved ? 'Open my schedule' : 'View application'}</Link></Button></CardContent></Card>}
    {approved && <Button asChild variant="outline"><Link to="/schedule">Continue to my schedule</Link></Button>}
  </div>;
}
