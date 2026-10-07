import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import BrowsePage from './pages/BrowsePage';
import SearchPage from './pages/SearchPage';
import HistoryPage from './pages/HistoryPage';
import AuthPage from './pages/AuthPage';
import ReplaysPage from './pages/ReplaysPage';
import DiscordPage from './pages/DiscordPage';
import KidsPage from './pages/KidsPage';
import CastPage from './pages/CastPage';
import LiveTVPage from './pages/LiveTVPage';
import MultiViewPage from './pages/MultiViewPage';
import AdminPage from './pages/AdminPage';
import CommandPalette from './components/CommandPalette';
import ScrollToTop from './components/ScrollToTop';
import LegalPages from './pages/LegalPages';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <ScrollToTop />
        <CommandPalette />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<BrowsePage type="movie" title="Movies" />} />
          <Route path="/tv" element={<BrowsePage type="tv" title="TV Shows" />} />
          <Route path="/trending" element={<BrowsePage type="movie" title="Trending" />} />
          <Route path="/sports" element={<Navigate to="/livetv?tab=sports" replace />} />
          <Route path="/replays" element={<ReplaysPage />} />
          <Route path="/livetv" element={<LiveTVPage />} />
          <Route path="/multiview" element={<MultiViewPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/kids" element={<KidsPage />} />
          <Route path="/discord" element={<DiscordPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movie/:id" element={<DetailPage />} />
          <Route path="/tv/:id" element={<DetailPage />} />
          <Route path="/cast/:type/:id" element={<CastPage />} />
          <Route path="/about" element={<LegalPages slug="about" />} />
          <Route path="/contact" element={<LegalPages slug="contact" />} />
          <Route path="/privacy" element={<LegalPages slug="privacy" />} />
          <Route path="/terms" element={<LegalPages slug="terms" />} />
          <Route path="/dmca" element={<LegalPages slug="dmca" />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
