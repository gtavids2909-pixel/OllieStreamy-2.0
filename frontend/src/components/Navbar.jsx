import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Film,
  Tv,
  Volleyball,
  Baby,
  TrendingUp,
  History,
  LogIn,
  UserPlus,
  Search,
  ArrowRight,
  Menu,
  X,
  Settings,
  Tv2,
  LayoutGrid,
  LogOut,
  User,
} from 'lucide-react';
import { openPalette } from './CommandPalette';
import { tmdb, IMG } from '../lib/tmdb';
import { getSafeMode, setSafeMode, onSafeModeChange } from '../lib/prefs';

const NAV = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Movies', to: '/movies', icon: Film },
  { label: 'TV Shows', to: '/tv', icon: Tv },
  { label: 'Live TV', to: '/livetv', icon: Tv },
  { label: 'Multi-View', to: '/multiview', icon: LayoutGrid },
  { label: 'Replays', to: '/replays', icon: Volleyball },
  { label: 'Kids', to: '/kids', icon: Baby },
  { label: 'Trending', to: '/trending', icon: TrendingUp },
  { label: 'Watch History', to: '/history', icon: History },
];

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [safe, setSafe] = useState(getSafeMode());
  const settingsRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const inputRef = useRef(null);
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fs_user') || 'null'); } catch { return null; }
  });
  const logout = () => {
    localStorage.removeItem('fs_user');
    setUser(null);
    navigate('/');
  };

  useEffect(() => onSafeModeChange(setSafe), []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      document.addEventListener('mousedown', onClickOutside);
      return () => document.removeEventListener('mousedown', onClickOutside);
    }
  }, [settingsOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
    setShowResults(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await tmdb.search(query);
        setResults(
          (data.results || [])
            .filter((r) => r.media_type !== 'person' && (r.poster_path || r.backdrop_path))
            .slice(0, 8)
        );
        setShowResults(true);
      } catch (e) {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowResults(false);
      setMobileSearchOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled ? 'bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/5' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-1 shrink-0">
          <span className="text-2xl font-extrabold bg-gradient-to-r from-[#7c83ff] to-[#a78bff] bg-clip-text text-transparent tracking-tight">
            Ollie
          </span>
          <span className="text-2xl font-extrabold text-white tracking-tight">Streamy</span>
        </Link>

        <nav className="hidden xl:flex items-center gap-0.5 ml-2 min-w-0">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={`nav-link-${item.to.slice(1) || 'home'}`}
                className={`flex items-center px-2 2xl:px-2.5 py-2 rounded-lg text-[13px] 2xl:text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'text-white bg-white/10'
                    : 'text-zinc-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            to="/discord"
            className="flex items-center px-2 2xl:px-2.5 py-2 rounded-lg text-[13px] 2xl:text-sm font-medium whitespace-nowrap text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <svg className="hidden" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Discord
          </Link>
        </nav>

        <div className="hidden xl:flex items-center gap-1 ml-auto shrink-0">
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setSettingsOpen((v) => !v)}
              data-testid="nav-settings-btn"
              className={`flex items-center gap-1.5 p-2 rounded-lg text-sm font-medium transition-colors ${
                safe ? 'text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15' : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
              title="Playback settings"
              aria-label="Playback settings"
            >
              <Settings className="w-4 h-4" />
              {safe && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </button>
            {settingsOpen && (
              <div
                data-testid="nav-settings-panel"
                className="absolute right-0 top-12 w-[320px] rounded-xl border border-white/10 bg-[#101018] shadow-2xl p-4 z-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Tv2 className="w-4 h-4 text-[#7c83ff]" />
                  <div className="text-sm font-semibold text-white">Playback settings</div>
                </div>
                <label className="flex items-start gap-3 rounded-lg p-3 hover:bg-white/5 cursor-pointer border border-white/5">
                  <input
                    type="checkbox"
                    data-testid="nav-safe-mode-toggle"
                    checked={safe}
                    onChange={(e) => setSafeMode(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-[#7c83ff]"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">Popup blocker (Samsung TV / Smart-TV mode)</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                      Blocks the pop-up tabs that freeze Tizen / webOS browsers when you tap a player. Turn ON before pressing Play. Auto-detected on smart TVs. Turn OFF if a specific server refuses to load.
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>
          <button
            onClick={openPalette}
            data-testid="nav-palette-btn"
            className="flex items-center gap-2 p-2 2xl:pl-3 2xl:pr-2 h-9 rounded-full text-zinc-300 hover:text-white bg-white/0 2xl:bg-white/5 2xl:border 2xl:border-white/10 hover:bg-white/10 transition-colors"
            aria-label="Search (Ctrl+K)"
            title="Search (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
            <span className="hidden 2xl:inline text-sm">Search</span>
            <kbd className="hidden 2xl:inline text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-zinc-400">Ctrl K</kbd>
          </button>
          {user ? (
            <>
              <span className="flex items-center gap-1.5 px-2 text-sm font-medium text-white whitespace-nowrap max-w-[90px] 2xl:max-w-[140px]" data-testid="nav-user-name">
                <User className="w-4 h-4 text-[#a8aeff] shrink-0" /><span className="truncate">{user.name}</span>
              </span>
              <button onClick={logout} data-testid="nav-logout-btn" aria-label="Logout" title="Logout" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">
                <LogOut className="w-4 h-4" /> <span className="hidden 2xl:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" data-testid="nav-login-link" aria-label="Login" title="Login" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">
                <LogIn className="w-4 h-4" /> <span className="hidden 2xl:inline">Login</span>
              </Link>
              <Link to="/signup" data-testid="nav-signup-link" aria-label="Sign Up" title="Sign Up" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap text-zinc-300 hover:text-white hover:bg-white/5 transition-colors">
                <UserPlus className="w-4 h-4" /> <span className="hidden 2xl:inline">Sign Up</span>
              </Link>
            </>
          )}
        </div>


        <div className="xl:hidden ml-auto flex items-center gap-1">
          <button
            className="text-white p-2 rounded-lg hover:bg-white/10"
            onClick={openPalette}
            data-testid="nav-mobile-search-btn"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            className="text-white p-2 rounded-lg hover:bg-white/10"
            onClick={() => setMobileOpen((v) => !v)}
            data-testid="nav-mobile-menu-btn"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div className="xl:hidden fixed inset-0 z-[60] bg-[#0a0a0f]/98 backdrop-blur-md">
          <div className="px-4 pt-4 pb-3 border-b border-white/5 flex items-center gap-2">
            <form onSubmit={handleSubmit} className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search movies & TV..."
                className="w-full h-11 pl-10 pr-4 rounded-full bg-white/5 border border-white/10 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60"
              />
            </form>
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setQuery('');
              }}
              className="p-2 text-zinc-300 hover:text-white"
              aria-label="Close search"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="overflow-y-auto h-[calc(100vh-72px)] px-2 py-2">
            {results.length === 0 && query && (
              <div className="text-center text-zinc-500 py-12 text-sm">
                No results yet — keep typing
              </div>
            )}
            {!query && (
              <div className="text-center text-zinc-500 py-12 text-sm">
                Start typing to search across movies and TV shows
              </div>
            )}
            {results.map((r) => (
              <Link
                key={`m-${r.media_type}-${r.id}`}
                to={`/${r.media_type}/${r.id}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                onClick={() => {
                  setMobileSearchOpen(false);
                  setQuery('');
                }}
              >
                <img
                  src={IMG(r.poster_path || r.backdrop_path, 'w92')}
                  alt={r.title || r.name}
                  className="w-12 h-16 object-cover rounded-md bg-[#15151f]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium line-clamp-1">
                    {r.title || r.name}
                  </div>
                  <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <span className="uppercase">{r.media_type}</span>
                    <span>{(r.release_date || r.first_air_date || '').slice(0, 4)}</span>
                    {r.vote_average ? <span>★ {r.vote_average.toFixed(1)}</span> : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {mobileOpen && (
        <div className="xl:hidden bg-[#0a0a0f] border-t max-h-[calc(100dvh-4rem)] overflow-y-auto border-white/5 px-4 py-3 space-y-1">
          <form onSubmit={handleSubmit} className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60"
            />
          </form>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-200 hover:bg-white/5"
              >
                <Icon className="w-4 h-4" /> {item.label}
              </Link>
            );
          })}
          <Link
            to="/discord"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-200 hover:bg-white/5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.197.373.291a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>{' '}
            Discord
          </Link>
          {user ? (
            <div className="flex items-center gap-2 pt-2">
              <span className="flex-1 flex items-center gap-2 text-sm text-white truncate" data-testid="nav-mobile-user-name"><User className="w-4 h-4 text-[#a8aeff]" /> {user.name}</span>
              <button onClick={logout} data-testid="nav-mobile-logout-btn" className="px-4 py-2 rounded-lg bg-white/5 text-white text-sm flex items-center gap-1.5"><LogOut className="w-4 h-4" /> Logout</button>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Link to="/login" data-testid="nav-mobile-login-link" className="flex-1 text-center py-2 rounded-lg bg-white/5 text-white text-sm">
                Login
              </Link>
              <Link to="/signup" data-testid="nav-mobile-signup-link" className="flex-1 text-center py-2 rounded-lg bg-[#7c83ff] text-white text-sm">
                Sign Up
              </Link>
            </div>
          )}
          <label className="mt-3 flex items-start gap-3 rounded-lg p-3 bg-white/5 border border-white/5">
            <input
              type="checkbox"
              data-testid="nav-safe-mode-toggle-mobile"
              checked={safe}
              onChange={(e) => setSafeMode(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#7c83ff]"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <Tv2 className="w-4 h-4 text-[#7c83ff]" />
                Popup blocker (Smart-TV mode)
              </div>
              <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                Enable before pressing Play on Samsung TV / webOS to stop pop-ups that freeze the player.
              </div>
            </div>
          </label>
        </div>
      )}
    </header>
  );
}
