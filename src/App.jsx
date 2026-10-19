import React, { lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PlayerSessionProvider } from './contexts/PlayerSessionContext';
import { LeagueProvider } from './LeagueContext';
import Layout from './components/Layout';
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
  return <BrowserRouter><PlayerSessionProvider><LeagueProvider><Routes><Route element={<Layout />}>
    <Route index element={<MyWeekPage />} />
    <Route path="my-week" element={<MyWeekPage />} />
    <Route path="schedule" element={<MySchedulePage />} />
    <Route path="results" element={<MyResultsPage />} />
    <Route path="money" element={<MyMoneyPage />} />
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
  </Route></Routes></LeagueProvider></PlayerSessionProvider></BrowserRouter>;
}
