import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import BrowsePage from './pages/BrowsePage';
import SearchPage from './pages/SearchPage';
import HistoryPage from './pages/HistoryPage';
import AuthPage from './pages/AuthPage';
import SportsPage from './pages/SportsPage';
import DiscordPage from './pages/DiscordPage';
import KidsPage from './pages/KidsPage';
import CastPage from './pages/CastPage';
import LiveTVPage from './pages/LiveTVPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/movies" element={<BrowsePage type="movie" title="Movies" />} />
          <Route path="/tv" element={<BrowsePage type="tv" title="TV Shows" />} />
          <Route path="/trending" element={<BrowsePage type="movie" title="Trending" />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/livetv" element={<LiveTVPage />} />
          <Route path="/kids" element={<KidsPage />} />
          <Route path="/discord" element={<DiscordPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/movie/:id" element={<DetailPage />} />
          <Route path="/tv/:id" element={<DetailPage />} />
          <Route path="/cast/:type/:id" element={<CastPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
