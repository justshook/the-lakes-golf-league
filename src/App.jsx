import React, { lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PlayerSessionProvider, usePlayerSession } from './contexts/PlayerSessionContext';
import { LeagueProvider } from './LeagueContext';
import Layout from './components/Layout';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { hasAuthCallbackParameters } from './lib/auth-callback';
import { supabase } from './supabaseClient';
import { loadRegistration } from './services/registration-service';
import { Button } from './components/ui/button';
import { Link } from 'react-router-dom';
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'));
const MyWeekPage = lazy(() => import('./pages/MyWeekPage'));
const MySchedulePage = lazy(() => import('./pages/MySchedulePage'));
const WeeklyResultsPage = lazy(() => import('./pages/WeeklyResultsPage'));
const LiveRoundPage = lazy(() => import('./pages/LiveRoundPage'));
const MyResultsPage = lazy(() => import('./pages/MyResultsPage'));
const MyMoneyPage = lazy(() => import('./pages/MyMoneyPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const LeagueOverviewPage = lazy(() => import('./pages/LeagueOverviewPage'));
const CommissionerPage = lazy(() => import('./pages/CommissionerPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const GiantSkinsPage = lazy(() => import('./pages/GiantSkinsPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const RegistrationPaymentPage = lazy(() => import('./pages/RegistrationPaymentPage'));

export default function App() {
  return <BrowserRouter><PlayerSessionProvider><AuthRoutes /></PlayerSessionProvider></BrowserRouter>;
}

function AuthRoutes() {
  const location = useLocation();
  const { user, setupRequired, authLoading, loading, profile, isAdmin } = usePlayerSession();
  // Handles legacy redirects to /, /my-week or /auth/confirm without dropping tokens.
  if (hasAuthCallbackParameters(location.search, location.hash) || ['/auth/callback', '/auth/confirm'].includes(location.pathname)) return <AuthCallbackPage />;
  if (user && setupRequired && !['/account/password', '/account/setup'].includes(location.pathname)) return <Navigate to="/account/password" replace />;
  if (authLoading && !user) return <AccountLoading />;
  if (!user) return <div className="min-h-dvh bg-background px-4 py-6 sm:py-10"><main id="main-content"><React.Suspense fallback={<AccountLoading />}><Routes>
    <Route path="/" element={<SignInPage />} /><Route path="/login" element={<SignInPage />} />
    <Route path="/register" element={<RegisterPage />} /><Route path="/privacy" element={<PrivacyPage />} />
    <Route path="/account/password" element={<SetPasswordPage />} /><Route path="/account/setup" element={<SetPasswordPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></React.Suspense></main></div>;
  if (!loading && !profile?.player_id && !isAdmin && !['/register','/registration/payment','/privacy','/account/password','/account/setup'].includes(location.pathname)) return <Navigate to="/register" replace />;
  return <LeagueProvider><Routes><Route element={<Layout />}>
    <Route index element={<RegistrationHome />} />
    <Route path="my-week" element={<RegistrationHome />} />
    <Route path="schedule" element={<MySchedulePage />} />
    <Route path="results" element={<WeeklyResultsPage />} />
    <Route path="results/history" element={<MyResultsPage />} />
    <Route path="round/:weekId" element={<LiveRoundPage />} />
    <Route path="money" element={<MyMoneyPage />} />
    <Route path="profile" element={<MyProfilePage />} />
    <Route path="account/password" element={<SetPasswordPage />} />
    <Route path="account/setup" element={<SetPasswordPage />} />
    <Route path="login" element={<SignInPage />} />
    <Route path="register" element={<RegisterPage />} />
    <Route path="registration/payment" element={<RegistrationPaymentPage />} />
    <Route path="league" element={<LeagueOverviewPage />} />
    <Route path="leaderboard" element={<LeaderboardPage />} />
    <Route path="players" element={<PlayersPage />} />
    <Route path="players/:playerId" element={<PlayersPage />} />
    <Route path="skins" element={<GiantSkinsPage />} />
    <Route path="rules" element={<RulesPage />} />
    <Route path="privacy" element={<PrivacyPage />} />
    <Route path="admin" element={<CommissionerPage />} />
    <Route path="admin/manage" element={<Navigate to="/admin" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></LeagueProvider>;
}

function AccountLoading() { return <div role="status" className="flex min-h-[50vh] items-center justify-center text-sm text-charcoal-600">Checking your account…</div>; }
function RegistrationHome() {
  const { user, loading, profile, isAdmin, isDemo } = usePlayerSession();
  const [state, setState] = useState(null); const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController(); setState(null); setError(false);
    if (user && !isAdmin && !isDemo) loadRegistration(supabase, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setState(value); }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [user?.id, isAdmin, isDemo]);
  if (loading) return <AccountLoading />;
  if (!profile?.player_id && !isAdmin) return <Navigate to="/register" replace />;
  if (isAdmin || isDemo) return <MyWeekPage />;
  if (error) return <div role="alert" className="mx-auto max-w-md space-y-4 py-12"><p>We couldn’t check your registration. Open your account to retry.</p><Button asChild><Link to="/register">Check registration</Link></Button></div>;
  if (!state) return <AccountLoading />;
  if (state.application?.status === 'approved' && state.application.membership_type === 'full_time' && !state.registration_paid) return <Navigate to="/registration/payment" replace />;
  return <MyWeekPage />;
}
