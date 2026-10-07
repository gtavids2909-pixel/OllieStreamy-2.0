import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Play,
  Heart,
  Bookmark,
  Download,
  Star,
  Calendar,
  Clock,
  ArrowLeft,
  Share2,
  ChevronDown,
  Server,
  X,
  Cast,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Row from '../components/Row';
import { tmdb, IMG, getServers } from '../lib/tmdb';
import { getSafeMode, setSafeMode, onSafeModeChange } from '../lib/prefs';

const HISTORY_KEY = 'fs_watch_history';
const FAV_KEY = 'fs_favorites';
const WATCH_KEY = 'fs_watchlist';

const toggleStored = (key, item) => {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    const exists = arr.find((x) => x.id === item.id && x.type === item.type);
    let next;
    if (exists) next = arr.filter((x) => !(x.id === item.id && x.type === item.type));
    else next = [item, ...arr];
    localStorage.setItem(key, JSON.stringify(next));
    return !exists;
  } catch {
    return false;
  }
};

const inStored = (key, id, type) => {
  try {
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    return !!arr.find((x) => x.id === id && x.type === type);
  } catch {
    return false;
  }
};

const pushHistory = (item) => {
  try {
    const arr = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const filtered = arr.filter((x) => !(x.id === item.id && x.type === item.type));
    filtered.unshift({ ...item, watchedAt: Date.now() });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch {}
};

export default function DetailPage() {
  const { id } = useParams();
  const location = useLocation();
  // Route is /movie/:id or /tv/:id — derive type from the path so it's always correct
  const type = location.pathname.startsWith('/tv/') ? 'tv' : 'movie';
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(params.get('play') === '1');
  const [serverIdx, setServerIdx] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('fs_server_idx'));
      return Number.isFinite(saved) && saved >= 0 ? saved : 0;
    } catch {
      return 0;
    }
  });
  const pickServer = (i) => {
    setServerIdx(i);
    try {
      localStorage.setItem('fs_server_idx', String(i));
    } catch {}
  };
  // Samsung TV / popup-safe mode is synced from Navbar Settings via /lib/prefs.
  const [safeMode, setLocalSafeMode] = useState(getSafeMode());
  useEffect(() => onSafeModeChange(setLocalSafeMode), []);
  const toggleSafeMode = () => setSafeMode(!safeMode);
  const [tab, setTab] = useState('about');
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [seasonData, setSeasonData] = useState(null);
  const [fav, setFav] = useState(false);
  const [watchlist, setWatchlist] = useState(false);

  useEffect(() => {
    setLoading(true);
    setData(null);
    setSeasonData(null);
    setPlaying(params.get('play') === '1');
    (async () => {
      try {
        const d = type === 'tv' ? await tmdb.tvDetails(id) : await tmdb.movieDetails(id);
        // Guard: only commit if the URL hasn't changed in the meantime
        if (String(d.id) === String(id)) {
          setData(d);
          if (type === 'tv' && d.seasons?.length) {
            const firstSeason = d.seasons.find((s) => s.season_number > 0) || d.seasons[0];
            setSeason(firstSeason.season_number);
          }
          setFav(inStored(FAV_KEY, Number(id), type));
          setWatchlist(inStored(WATCH_KEY, Number(id), type));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
    window.scrollTo({ top: 0 });
    // eslint-disable-next-line
  }, [type, id]);

  useEffect(() => {
    if (type === 'tv' && data) {
      tmdb.tvSeason(id, season).then(setSeasonData).catch(() => setSeasonData(null));
    }
  }, [type, id, season, data]);

  const servers = useMemo(
    () => getServers(type, id, season, episode, data?.external_ids?.imdb_id),
    [type, id, season, episode, data]
  );

  const handlePlay = () => {
    setPlaying(true);
    setParams({ play: '1' });
    if (data) {
      pushHistory({
        id: Number(id),
        type,
        title: data.title || data.name,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
      });
    }
    setTimeout(() => {
      document.getElementById('player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Guard: never render stale content from a previous movie/show
  if (loading || !data || String(data.id) !== String(id)) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-24">
          <div className="grid md:grid-cols-[300px_1fr] gap-8 animate-pulse">
            <div className="aspect-[2/3] rounded-xl bg-white/5" />
            <div className="space-y-4">
              <div className="h-10 w-2/3 bg-white/5 rounded-lg" />
              <div className="h-4 w-1/3 bg-white/5 rounded" />
              <div className="h-4 w-full bg-white/5 rounded" />
              <div className="h-4 w-5/6 bg-white/5 rounded" />
              <div className="h-4 w-4/6 bg-white/5 rounded" />
              <div className="flex gap-2 pt-4">
                <div className="h-11 w-28 bg-white/10 rounded-lg" />
                <div className="h-11 w-40 bg-white/5 rounded-lg" />
                <div className="h-11 w-40 bg-white/5 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const title = data.title || data.name;
  const releaseDate = data.release_date || data.first_air_date;
  const runtime = data.runtime
    ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m`
    : data.episode_run_time?.[0]
    ? `${data.episode_run_time[0]}m / ep`
    : null;
  const genres = data.genres || [];

  const recs = (data.recommendations?.results || data.similar?.results || []).slice(0, 20);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />

      {/* Backdrop banner */}
      <div className="relative pt-16">
        {data.backdrop_path && (
          <div className="absolute inset-0 -z-0 h-[60vh] overflow-hidden">
            <img
              src={IMG(data.backdrop_path, 'original')}
              alt=""
              className="w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0f]/80 to-[#0a0a0f]" />
          </div>
        )}
        <div className="relative z-10 max-w-[1400px] mx-auto px-4 lg:px-8 pt-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-2 text-zinc-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" /> Back
          </button>

          <div className="grid md:grid-cols-[300px_1fr] gap-8">
            <div className="shrink-0">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#15151f] shadow-2xl">
                {data.poster_path ? (
                  <img
                    src={IMG(data.poster_path, 'w500')}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3">
                {title}
              </h1>
              {data.tagline && (
                <p className="italic text-zinc-300 mb-4">{data.tagline}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mb-5 text-sm">
                {releaseDate && (
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Calendar className="w-4 h-4" /> {releaseDate.slice(0, 4)}
                  </span>
                )}
                {runtime && (
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <Clock className="w-4 h-4" /> {runtime}
                  </span>
                )}
                {data.vote_average ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Star className="w-4 h-4 fill-amber-400" />
                    {data.vote_average.toFixed(1)}
                  </span>
                ) : null}
                {genres.map((g) => (
                  <span
                    key={g.id}
                    className="px-2.5 py-1 rounded-md bg-white/10 text-xs text-zinc-200 border border-white/10"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
              <p className="text-zinc-200 leading-relaxed mb-6 max-w-3xl">{data.overview}</p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7c83ff] hover:bg-[#9097ff] text-white font-semibold transition-colors"
                >
                  <Play className="w-4 h-4 fill-white" /> Play
                </button>
                <button
                  onClick={() => {
                    const next = toggleStored(FAV_KEY, {
                      id: Number(id),
                      type,
                      title,
                      poster_path: data.poster_path,
                      backdrop_path: data.backdrop_path,
                    });
                    setFav(next);
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-colors ${
                    fav
                      ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${fav ? 'fill-pink-400' : ''}`} />
                  {fav ? 'In Favorites' : 'Add to Favorites'}
                </button>
                <button
                  onClick={() => {
                    const next = toggleStored(WATCH_KEY, {
                      id: Number(id),
                      type,
                      title,
                      poster_path: data.poster_path,
                      backdrop_path: data.backdrop_path,
                    });
                    setWatchlist(next);
                  }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border transition-colors ${
                    watchlist
                      ? 'bg-[#7c83ff]/20 border-[#7c83ff]/50 text-[#a8aeff]'
                      : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${watchlist ? 'fill-[#a8aeff]' : ''}`} />
                  {watchlist ? 'In Watchlist' : 'Add to Watchlist'}
                </button>
                <button
                  onClick={() =>
                    navigator.share
                      ? navigator.share({ title, url: window.location.href }).catch(() => {})
                      : navigator.clipboard.writeText(window.location.href)
                  }
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
                <button
                  onClick={handlePlay}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Player */}
      {playing && (
        <div id="player" className="max-w-[1400px] mx-auto px-4 lg:px-8 mt-10">
          <div className="bg-[#101018] rounded-2xl border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-white min-w-0">
                <Server className="w-4 h-4 text-[#7c83ff] shrink-0" />
                <span className="truncate">Now Playing: {title}</span>
                {type === 'tv' && (
                  <span className="text-zinc-400 font-normal shrink-0">
                    · S{season} E{episode}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const qs = type === 'tv' ? `?s=${season}&e=${episode}` : '';
                    navigate(`/cast/${type}/${id}${qs}`);
                  }}
                  data-testid="open-cast-mode"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7c83ff] hover:bg-[#9097ff] text-white text-xs font-semibold shadow-lg shadow-[#7c83ff]/20"
                  title="Open a distraction-free full-screen player for reliable TV screen mirroring"
                >
                  <Cast className="w-3.5 h-3.5" /> Cast / Mirror
                </button>
                <button
                  onClick={() => {
                    setPlaying(false);
                    setParams({});
                  }}
                  className="text-zinc-400 hover:text-white p-1"
                  aria-label="Close player"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative aspect-video bg-black">
              <iframe
                key={`${servers[serverIdx].url}-${serverIdx}-${safeMode ? 'safe' : 'std'}`}
                src={servers[serverIdx].url}
                title="Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
                referrerPolicy="no-referrer"
                {...(safeMode
                  ? { sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock' }
                  : {})}
                className="absolute inset-0 w-full h-full"
                data-testid="player-iframe"
              />
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Server className="w-3.5 h-3.5" /> Choose Server
                  <span className="text-zinc-500 normal-case">— if one doesn&apos;t work, try another</span>
                </div>
                <button
                  onClick={toggleSafeMode}
                  data-testid="toggle-safe-mode"
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    safeMode
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                  title="Blocks pop-ups that freeze Samsung TV / smart-TV browsers. Turn off if a server refuses to load."
                >
                  {safeMode ? 'TV / Popup Blocker: ON' : 'TV / Popup Blocker: OFF'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {servers.map((s, i) => (
                  <div key={s.name} className="flex items-stretch rounded-md overflow-hidden border border-white/10">
                    <button
                      onClick={() => pickServer(i)}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        serverIdx === i
                          ? 'bg-[#7c83ff] text-white'
                          : 'bg-white/5 text-zinc-200 hover:bg-white/10'
                      }`}
                    >
                      {s.name}
                    </button>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in new tab"
                      className={`px-2 flex items-center justify-center transition-colors border-l border-white/10 ${
                        serverIdx === i
                          ? 'bg-[#7c83ff] text-white hover:bg-[#9097ff]'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TV Episodes */}
          {type === 'tv' && data.seasons?.length > 0 && (
            <div className="mt-6 bg-[#101018] rounded-2xl border border-white/5 p-4">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="text-sm font-semibold text-white">Season</span>
                <div className="relative">
                  <select
                    value={season}
                    onChange={(e) => {
                      setSeason(Number(e.target.value));
                      setEpisode(1);
                    }}
                    className="appearance-none pl-3 pr-8 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white focus:outline-none"
                  >
                    {data.seasons
                      .filter((s) => s.season_number > 0 || data.seasons.length === 1)
                      .map((s) => (
                        <option key={s.id} value={s.season_number} className="bg-[#101018]">
                          Season {s.season_number} ({s.episode_count} eps)
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                </div>
              </div>
              {seasonData?.episodes && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto pr-2">
                  {seasonData.episodes.map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => setEpisode(ep.episode_number)}
                      className={`flex gap-3 p-2 rounded-lg text-left border transition-colors ${
                        episode === ep.episode_number
                          ? 'bg-[#7c83ff]/15 border-[#7c83ff]/40'
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-32 aspect-video rounded-md overflow-hidden bg-[#0a0a0f] shrink-0">
                        {ep.still_path ? (
                          <img
                            src={IMG(ep.still_path, 'w300')}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-[#a8aeff] font-semibold">
                          Episode {ep.episode_number}
                        </div>
                        <div className="text-sm font-medium text-white line-clamp-1">
                          {ep.name}
                        </div>
                        <div className="text-xs text-zinc-400 line-clamp-2 mt-1">
                          {ep.overview}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 mt-12">
        <div className="flex gap-6 border-b border-white/5">
          {['about', 'cast', 'reviews'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-semibold capitalize transition-colors relative ${
                tab === t ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-[#7c83ff]" />
              )}
            </button>
          ))}
        </div>

        {tab === 'about' && (
          <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard label="Status" value={data.status} />
            <InfoCard
              label="Budget"
              value={data.budget ? `$${data.budget.toLocaleString()}` : '—'}
            />
            <InfoCard
              label="Revenue"
              value={data.revenue ? `$${data.revenue.toLocaleString()}` : '—'}
            />
            <InfoCard label="Original Language" value={(data.original_language || '').toUpperCase()} />
            <InfoCard
              label="Production"
              value={data.production_companies?.map((p) => p.name).join(', ') || '—'}
            />
            <InfoCard
              label={type === 'tv' ? 'Seasons' : 'Runtime'}
              value={
                type === 'tv'
                  ? `${data.number_of_seasons || 0} seasons · ${data.number_of_episodes || 0} eps`
                  : runtime || '—'
              }
            />
          </div>
        )}

        {tab === 'cast' && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {(data.credits?.cast || []).slice(0, 18).map((p) => (
              <div key={p.id} className="text-center">
                <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#15151f] mb-2">
                  {p.profile_path ? (
                    <img
                      src={IMG(p.profile_path, 'w185')}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs">
                      {p.name}
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium text-white line-clamp-1">{p.name}</div>
                <div className="text-xs text-zinc-400 line-clamp-1">{p.character}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'reviews' && (
          <div className="mt-6 text-zinc-400 text-sm">
            Reviews coming soon. In the meantime, drop your thoughts in our community.
          </div>
        )}
      </div>

      {recs.length > 0 && (
        <div className="mt-12">
          <Row title="You May Also Like" items={recs} />
        </div>
      )}

      <Footer />
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#101018] p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-400 mb-1">{label}</div>
      <div className="text-white font-semibold break-words">{value || '—'}</div>
    </div>
  );
}
