import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PlayerSessionProvider, usePlayerSession } from './contexts/PlayerSessionContext';
import { LeagueProvider } from './LeagueContext';
import Layout from './components/Layout';
import AuthCallbackPage from './pages/AuthCallbackPage';
import { hasAuthCallbackParameters } from './lib/auth-callback';
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage'));
const MyProfilePage = lazy(() => import('./pages/MyProfilePage'));
const MyWeekPage = lazy(() => import('./pages/MyWeekPage'));
const MySchedulePage = lazy(() => import('./pages/MySchedulePage'));
const MyResultsPage = lazy(() => import('./pages/MyResultsPage'));
const MyMoneyPage = lazy(() => import('./pages/MyMoneyPage'));
const SignInPage = lazy(() => import('./pages/SignInPage'));
const LeagueOverviewPage = lazy(() => import('./pages/LeagueOverviewPage'));
const CommissionerPage = lazy(() => import('./pages/CommissionerPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const PlayersPage = lazy(() => import('./pages/PlayersPage'));
const GiantSkinsPage = lazy(() => import('./pages/GiantSkinsPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));

export default function App() {
  return <BrowserRouter><PlayerSessionProvider><AuthRoutes /></PlayerSessionProvider></BrowserRouter>;
}

function AuthRoutes() {
  const location = useLocation();
  const { user, setupRequired } = usePlayerSession();
  // Handles legacy redirects to /, /my-week or /auth/confirm without dropping tokens.
  if (hasAuthCallbackParameters(location.search, location.hash) || ['/auth/callback', '/auth/confirm'].includes(location.pathname)) return <AuthCallbackPage />;
  if (user && setupRequired && !['/account/password', '/account/setup'].includes(location.pathname)) return <Navigate to="/account/password" replace />;
  return <LeagueProvider><Routes><Route element={<Layout />}>
    <Route index element={<MyWeekPage />} />
    <Route path="my-week" element={<MyWeekPage />} />
    <Route path="schedule" element={<MySchedulePage />} />
    <Route path="results" element={<MyResultsPage />} />
    <Route path="money" element={<MyMoneyPage />} />
    <Route path="profile" element={<MyProfilePage />} />
    <Route path="account/password" element={<SetPasswordPage />} />
    <Route path="account/setup" element={<SetPasswordPage />} />
    <Route path="login" element={<SignInPage />} />
    <Route path="league" element={<LeagueOverviewPage />} />
    <Route path="leaderboard" element={<LeaderboardPage />} />
    <Route path="players" element={<PlayersPage />} />
    <Route path="players/:playerId" element={<PlayersPage />} />
    <Route path="skins" element={<GiantSkinsPage />} />
    <Route path="rules" element={<RulesPage />} />
    <Route path="admin" element={<CommissionerPage />} />
    <Route path="admin/manage" element={<Navigate to="/admin" replace />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes></LeagueProvider>;
}
