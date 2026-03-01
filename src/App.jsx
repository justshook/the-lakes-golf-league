import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LeagueProvider } from './LeagueContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LeaderboardPage from './pages/LeaderboardPage';
import PlayersPage from './pages/PlayersPage';
import GiantSkinsPage from './pages/GiantSkinsPage';
import AdminPage from './pages/AdminPage';
import RulesPage from './pages/RulesPage';

export default function App() {
  return (
    <BrowserRouter>
      <LeagueProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/players" element={<PlayersPage />} />
            <Route path="/players/:playerId" element={<PlayersPage />} />
            <Route path="/skins" element={<GiantSkinsPage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </LeagueProvider>
    </BrowserRouter>
  );
}
