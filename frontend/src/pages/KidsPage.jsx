import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Baby, Clock, Play, X, ChevronLeft, ChevronRight, Radio, Star, Sparkles, Server, Shuffle, ExternalLink, Cast } from 'lucide-react';
import { tmdb, IMG, getServers } from '../lib/tmdb';
import { getSafeMode, onSafeModeChange, pickRandomEpisode, recordEpisode } from '../lib/prefs';

// -----------------------------------------------------------------------------
// Show definitions. Each entry carries the exact TMDB id + media type so posters
// are always accurate (no fuzzy search picking Hannah Montana for Sesame Street).
// YouTube ids point at long full-episode uploads on youtube.com (nocookie).
// -----------------------------------------------------------------------------
const S = {
  bluey:        { title: 'Bluey',                    tmdbId: 82728, media: 'tv', ytId: 'yWirdnSDsV4' },
  peppa:        { title: 'Peppa Pig',                tmdbId: 12225, media: 'tv', ytId: 'JEPBrHPHo7Q' },
  paw:          { title: 'Paw Patrol',               tmdbId: 57532, media: 'tv', ytId: 'A2Y8jZ-nq4M' },
  duggee:       { title: 'Hey Duggee',               tmdbId: 74280, media: 'tv', ytId: 'ZbYFj42S1lc' },
  sesame:       { title: 'Sesame Street',            tmdbId: 502,   media: 'tv', ytId: 'C99Twm_j7HI' },
  playschool:   { title: 'Play School',              tmdbId: 4070,  media: 'tv', ytId: 'lNoCPrTGDYc' },
  bananas:      { title: 'Bananas in Pyjamas',       tmdbId: 3103,  media: 'tv', ytId: 'kHW9UtvbAv0' },
  night:        { title: 'In the Night Garden',      tmdbId: 3048,  media: 'tv', ytId: 'F7HqjS8bJ_M' },
  teletubbies:  { title: 'Teletubbies',              tmdbId: 1682,  media: 'tv', ytId: 'RRr5PB2ZfHo' },
  giggle:       { title: 'Giggle and Hoot',          tmdbId: 32669, media: 'tv', ytId: 'PZDjpH5F9zk' },
  bedtime:      { title: 'CBeebies Bedtime Stories', tmdbId: 49281, media: 'tv', ytId: 'LU_hPBGjssg' },
  lullabies:    { title: 'Overnight Lullabies',      tmdbId: null,  media: 'tv', ytId: 'iLh5MnjaXhg',
                  fallbackImg: 'https://i.ytimg.com/vi/iLh5MnjaXhg/hqdefault.jpg' },
  // 2000s / classics
  rugrats:      { title: 'Rugrats',                  tmdbId: 3022,  media: 'tv', ytId: 'JsjJfCFVCK4', year: '1991' },
  wiggles:      { title: 'The Wiggles',              tmdbId: 34921, media: 'tv', ytId: 'iA6VDsMbSjQ', year: '1998' },
  barney:       { title: 'Barney & Friends',         tmdbId: 4887,  media: 'tv', ytId: 'K8vITNs4qYM', year: '1992' },
  bluesclues:   { title: "Blue's Clues",             tmdbId: 10821, media: 'tv', ytId: 'M8sfBpx9Q4o', year: '1996' },
  bear:         { title: 'Bear in the Big Blue House', tmdbId: 207, media: 'tv', ytId: 'B_zsuXbnDS4', year: '1997' },
  bob:          { title: 'Bob the Builder',          tmdbId: 10938, media: 'tv', ytId: 'wUdyHQzOtBs', year: '1998' },
  postmanpat:   { title: 'Postman Pat',              tmdbId: 1588,  media: 'tv', ytId: '7NF3XyphYT4', year: '1981' },
  thomas:       { title: 'Thomas & Friends',         tmdbId: 2304,  media: 'tv', ytId: 'l-KGPZS4z9U', year: '1984' },
  dora:         { title: 'Dora the Explorer',        tmdbId: 79,    media: 'tv', ytId: 'QdSKmiZmDKI', year: '2000' },
  hi5:          { title: 'Hi-5',                     tmdbId: 1371,  media: 'tv', ytId: 'YZP7X8xk4WM', year: '1999' },
  hey_arnold:   { title: 'Hey Arnold!',              tmdbId: 537,   media: 'tv', ytId: 'C3XyOKzeh3Y', year: '1996' },
  powerpuff:    { title: 'The Powerpuff Girls',      tmdbId: 607,   media: 'tv', ytId: 'oo6d5Ky5RGE', year: '1998' },
  kim:          { title: 'Kim Possible',             tmdbId: 2345,  media: 'tv', ytId: 'nBu5uMY1_2s', year: '2002' },
  dexter:       { title: "Dexter's Laboratory",      tmdbId: 4229,  media: 'tv', ytId: 'p8bnrGXKD3g', year: '1996' },
};

// Today's roster — day shows early, evening shows at night, sleepy shows before bed.
const TODAY = [
  { start: '06:00', duration: 420,  ...S.bluey },
  { start: '06:30', duration: 1500, ...S.playschool },
  { start: '07:00', duration: 420,  ...S.duggee },
  { start: '07:30', duration: 600,  ...S.peppa },
  { start: '08:00', duration: 900,  ...S.bananas },
  { start: '09:00', duration: 1500, ...S.sesame },
  { start: '10:00', duration: 1500, ...S.paw },
  { start: '11:00', duration: 420,  ...S.bluey },
  { start: '12:00', duration: 420,  ...S.duggee },
  { start: '13:00', duration: 1500, ...S.playschool },
  { start: '14:00', duration: 600,  ...S.peppa },
  { start: '15:00', duration: 900,  ...S.bananas },
  { start: '16:00', duration: 1500, ...S.paw },
  { start: '17:00', duration: 420,  ...S.bluey },
  { start: '17:30', duration: 600,  ...S.peppa },
  { start: '18:00', duration: 1200, ...S.giggle },
  { start: '18:30', duration: 1500, ...S.night },
  { start: '19:00', duration: 1500, ...S.teletubbies },
  { start: '19:30', duration: 600,  ...S.bedtime },
  { start: '20:00', duration: 3600, ...S.lullabies },
];

const CLASSICS_2000S = [
  S.bananas, S.rugrats, S.wiggles, S.barney, S.bluesclues, S.teletubbies,
  S.bear, S.bob, S.postmanpat, S.thomas, S.dora, S.hi5,
  S.hey_arnold, S.powerpuff, S.kim, S.dexter,
];

const POPULAR_NOW = [
  S.bluey, S.peppa, S.paw, S.duggee, S.sesame, S.playschool, S.night, S.teletubbies,
];

// -----------------------------------------------------------------------------
// TMDB helpers
// -----------------------------------------------------------------------------
const toSecs = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 3600 + m * 60;
};

function currentSlotIndex() {
  const d = new Date();
  const secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  let idx = -1;
  for (let i = 0; i < TODAY.length; i++) if (toSecs(TODAY[i].start) <= secs) idx = i;
  return idx === -1 ? TODAY.length - 1 : idx;
}

function useSecondsTick() {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((v) => v + 1), 30 * 1000);
    return () => clearInterval(id);
  }, []);
}

// Cache TMDB card data across the page lifetime
const cardCache = {};
async function fetchCard(show) {
  const key = `${show.media}:${show.tmdbId || show.title}`;
  if (cardCache[key]) return cardCache[key];
  if (!show.tmdbId) {
    cardCache[key] = { url: show.fallbackImg || '', overview: '', rating: null, year: show.year || '' };
    return cardCache[key];
  }
  try {
    const d = show.media === 'movie' ? await tmdb.movieCard(show.tmdbId) : await tmdb.tvCard(show.tmdbId);
    cardCache[key] = {
      url: d.poster_path ? IMG(d.poster_path, 'w342') : (show.fallbackImg || ''),
      overview: d.overview || '',
      rating: d.vote_average || null,
      year: (d.first_air_date || d.release_date || show.year || '').slice(0, 4),
    };
    return cardCache[key];
  } catch {
    return { url: show.fallbackImg || '', overview: '', rating: null, year: show.year || '' };
  }
}

// Resolve a random Season+Episode for a show. Uses TMDB tvDetails to get the
// list of seasons and their episode counts, then picks a (S,E) that hasn't
// been played in the last 14 days (see /lib/prefs.js).
const detailsCache = {};
async function resolveRandomEpisode(show) {
  if (!show.tmdbId) return { season: 1, episode: 1 };
  const key = String(show.tmdbId);
  let details = detailsCache[key];
  if (!details) {
    try {
      details = await tmdb.tvDetails(show.tmdbId);
      detailsCache[key] = details;
    } catch (_e) {
      return { season: 1, episode: 1 };
    }
  }
  return pickRandomEpisode(show.tmdbId, details?.seasons || []);
}

// -----------------------------------------------------------------------------
// UI atoms
// -----------------------------------------------------------------------------
function ShowCard({ show, onClick, badge }) {
  const [meta, setMeta] = useState(null);
  useEffect(() => {
    let mounted = true;
    fetchCard(show).then((m) => mounted && setMeta(m));
    return () => (mounted = false);
  }, [show.tmdbId, show.title]);

  return (
    <button
      onClick={onClick}
      data-testid={`kids-showcard-${show.title.replace(/\s+/g, '-').toLowerCase()}`}
      className="group relative shrink-0 w-[180px] rounded-xl overflow-hidden bg-[#15151f] border border-white/5 hover:border-[#7c83ff]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#7c83ff]/20 text-left"
    >
      <div className="relative aspect-[2/3] bg-[#0d0d14]">
        {meta?.url ? (
          <img src={meta.url} alt={show.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 px-2 text-center">{show.title}</div>
        )}
        {badge && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold uppercase flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> {badge}
          </div>
        )}
        {meta?.rating ? (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" /> {Number(meta.rating).toFixed(1)}
          </div>
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <p className="text-[11px] text-zinc-100 line-clamp-5 mb-2">{meta?.overview || 'Tap to watch.'}</p>
          <div className="inline-flex items-center gap-1 text-xs font-bold text-white bg-[#7c83ff] rounded-md px-2 py-1 self-start">
            <Play className="w-3 h-3 fill-white" /> Play
          </div>
        </div>
      </div>
      <div className="p-2.5">
        <div className="text-sm font-semibold text-white line-clamp-1">{show.title}</div>
        <div className="text-[11px] text-zinc-400">{show.start ? `Airs ${show.start}` : show.year || meta?.year || 'Classic'}</div>
      </div>
    </button>
  );
}

// Card built directly from TMDB discover result (used by Library rail)
function LibraryCard({ item }) {
  const isMovie = !!item.title;
  const title = item.title || item.name;
  const type = isMovie ? 'movie' : 'tv';
  return (
    <Link
      to={`/${type}/${item.id}`}
      data-testid={`kids-library-card-${item.id}`}
      className="group relative shrink-0 w-[180px] rounded-xl overflow-hidden bg-[#15151f] border border-white/5 hover:border-[#7c83ff]/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#7c83ff]/20 text-left"
    >
      <div className="relative aspect-[2/3] bg-[#0d0d14]">
        {item.poster_path ? (
          <img src={IMG(item.poster_path, 'w342')} alt={title} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500 px-2 text-center">{title}</div>
        )}
        {item.vote_average ? (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" /> {Number(item.vote_average).toFixed(1)}
          </div>
        ) : null}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] font-bold uppercase text-zinc-100">
          {isMovie ? 'Movie' : 'Series'}
        </div>
      </div>
      <div className="p-2.5">
        <div className="text-sm font-semibold text-white line-clamp-1">{title}</div>
        <div className="text-[11px] text-zinc-400">
          {(item.release_date || item.first_air_date || '').slice(0, 4) || '—'}
        </div>
      </div>
    </Link>
  );
}

function Row({ title, subtitle, children, icon: Icon, testId }) {
  const ref = useRef(null);
  const scroll = (d) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <section className="py-5 group/row" data-testid={testId}>
      <div className="flex items-center gap-2 mb-3 px-4 lg:px-8">
        {Icon && <Icon className="w-5 h-5 text-[#7c83ff]" />}
        <h2 className="text-xl md:text-2xl font-bold text-white">{title}</h2>
        {subtitle && <span className="text-sm text-zinc-400">· {subtitle}</span>}
      </div>
      <div className="relative">
        <button onClick={() => scroll(-1)} className="hidden md:flex absolute left-0 top-0 bottom-0 z-10 items-center justify-center w-12 bg-gradient-to-r from-[#0a0a0f] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity" aria-label="Scroll left">
          <span className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-[#7c83ff]/40"><ChevronLeft className="w-5 h-5" /></span>
        </button>
        <button onClick={() => scroll(1)} className="hidden md:flex absolute right-0 top-0 bottom-0 z-10 items-center justify-center w-12 bg-gradient-to-l from-[#0a0a0f] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity" aria-label="Scroll right">
          <span className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center hover:bg-[#7c83ff]/40"><ChevronRight className="w-5 h-5" /></span>
        </button>
        <div ref={ref} className="flex gap-3 overflow-x-auto scrollbar-hide px-4 lg:px-8 pb-2" style={{ scrollbarWidth: 'none' }}>{children}</div>
      </div>
    </section>
  );
}

// -----------------------------------------------------------------------------
// Age filter → TMDB discover parameters
// -----------------------------------------------------------------------------
const AGE_BUCKETS = [
  { id: 'all',      label: 'All ages',
    tv: { with_genres: '10762,10751,16', sort_by: 'popularity.desc' },
    movie: { with_genres: '10751,16', sort_by: 'popularity.desc', 'certification_country': 'US', 'certification.lte': 'PG' } },
  { id: 'toddler',  label: 'Toddler (1–3)',
    tv: { with_genres: '10762', sort_by: 'popularity.desc' },
    movie: { with_genres: '10751,16', sort_by: 'popularity.desc', 'certification_country': 'US', 'certification': 'G' } },
  { id: 'preschool', label: 'Preschool (3–6)',
    tv: { with_genres: '10762,16', sort_by: 'popularity.desc' },
    movie: { with_genres: '10751,16', sort_by: 'popularity.desc', 'certification_country': 'US', 'certification': 'G' } },
  { id: 'kids',     label: 'Kids (6–8)',
    tv: { with_genres: '10751,16', sort_by: 'popularity.desc' },
    movie: { with_genres: '10751,16', sort_by: 'popularity.desc', 'certification_country': 'US', 'certification.lte': 'PG' } },
  { id: 'tween',    label: 'Tween (8–12)',
    tv: { with_genres: '10751,16', sort_by: 'popularity.desc' },
    movie: { with_genres: '10751', sort_by: 'popularity.desc', 'certification_country': 'US', 'certification.lte': 'PG' } },
];

// -----------------------------------------------------------------------------
// Main page
// -----------------------------------------------------------------------------
export default function KidsPage() {
  useSecondsTick();
  const currentIdx = currentSlotIndex();
  const [tuned, setTuned] = useState(null);
  // { show, season, episode, isLive, notYet }
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
    try { localStorage.setItem('fs_server_idx', String(i)); } catch (_e) { /* ignore */ }
  };
  const [safeMode, setSafeModeLocal] = useState(getSafeMode());
  useEffect(() => onSafeModeChange(setSafeModeLocal), []);
  const [ageId, setAgeId] = useState('all');
  const [libTv, setLibTv] = useState([]);
  const [libMovies, setLibMovies] = useState([]);
  const [libLoading, setLibLoading] = useState(false);

  const airingNow = useMemo(() => TODAY.slice(currentIdx).concat(TODAY.slice(0, currentIdx)), [currentIdx]);
  const nowShow = TODAY[currentIdx];
  const nextShow = TODAY[(currentIdx + 1) % TODAY.length];

  // Fetch library when age filter changes
  useEffect(() => {
    const bucket = AGE_BUCKETS.find((b) => b.id === ageId) || AGE_BUCKETS[0];
    let mounted = true;
    setLibLoading(true);
    Promise.all([
      tmdb.discoverTv({ ...bucket.tv, page: 1, include_adult: 'false' }).catch(() => ({ results: [] })),
      tmdb.discoverMovies({ ...bucket.movie, page: 1, include_adult: 'false' }).catch(() => ({ results: [] })),
    ]).then(([tv, mv]) => {
      if (!mounted) return;
      setLibTv((tv.results || []).filter((r) => r.poster_path).slice(0, 20));
      setLibMovies((mv.results || []).filter((r) => r.poster_path).slice(0, 20));
      setLibLoading(false);
    });
    return () => { mounted = false; };
  }, [ageId]);

  const tuneToLive = async (show) => {
    const idx = TODAY.findIndex((s) => s.start === show.start && s.title === show.title);
    if (idx !== currentIdx) {
      setTuned({ show, season: 1, episode: 1, isLive: false, notYet: true });
      setTimeout(() => document.getElementById('kids-tv')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      return;
    }
    const { season, episode } = await resolveRandomEpisode(show);
    if (show.tmdbId) recordEpisode(show.tmdbId, season, episode);
    setTuned({ show, season, episode, isLive: true });
    setTimeout(() => document.getElementById('kids-tv')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const playClassic = async (show) => {
    const { season, episode } = await resolveRandomEpisode(show);
    if (show.tmdbId) recordEpisode(show.tmdbId, season, episode);
    setTuned({ show, season, episode, isLive: false });
    setTimeout(() => document.getElementById('kids-tv')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const shuffleEpisode = async () => {
    if (!tuned?.show?.tmdbId) return;
    const { season, episode } = await resolveRandomEpisode(tuned.show);
    recordEpisode(tuned.show.tmdbId, season, episode);
    setTuned((prev) => (prev ? { ...prev, season, episode } : prev));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="pt-20 pb-14">
        {/* Hero strip */}
        <div className="px-4 lg:px-8 pb-2">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Baby className="w-7 h-7 text-[#7c83ff]" />
            <h1 className="text-3xl md:text-4xl font-black tracking-tight" data-testid="kids-page-title">Kids TV</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live schedule
            </span>
          </div>
          <p className="text-zinc-400 text-sm">
            Shows air at their real time slots — day shows in the day, bedtime shows (Giggle and Hoot, In the Night Garden) at night. Tune in when they&apos;re on.
          </p>
          {nowShow && (
            <div className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-300 flex-wrap">
              <Radio className="w-4 h-4 text-red-400" />
              <span className="font-bold text-white">On now:</span> {nowShow.title}
              <span className="text-zinc-500">·</span>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-zinc-400">Next at {nextShow.start}: {nextShow.title}</span>
            </div>
          )}
        </div>

        {/* Player */}
        {tuned && (() => {
          const servers = tuned.show.tmdbId
            ? getServers('tv', tuned.show.tmdbId, tuned.season, tuned.episode)
            : [];
          const activeServer = servers[serverIdx] || servers[0];
          return (
            <section id="kids-tv" className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-4">
              <div className="bg-[#101018] rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white min-w-0">
                    {tuned.isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500 text-white text-[10px] font-bold uppercase shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 shrink-0">On-demand</span>
                    )}
                    <span className="truncate">{tuned.show.title}</span>
                    {!tuned.notYet && (
                      <span className="text-zinc-400 font-normal text-xs shrink-0">
                        · S{tuned.season} E{tuned.episode}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!tuned.notYet && tuned.show.tmdbId && (
                      <>
                        <button
                          onClick={() => window.location.assign(`/cast/tv/${tuned.show.tmdbId}?s=${tuned.season}&e=${tuned.episode}`)}
                          data-testid="kids-open-cast"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#7c83ff] hover:bg-[#9097ff] text-white text-xs font-semibold shadow-lg shadow-[#7c83ff]/20"
                          title="Full-screen mode built for smart-TV screen mirroring"
                        >
                          <Cast className="w-3.5 h-3.5" /> Cast / Mirror
                        </button>
                        <button
                          onClick={shuffleEpisode}
                          data-testid="kids-shuffle-episode"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-xs text-zinc-200 border border-white/10"
                          title="Pick a different random episode"
                        >
                          <Shuffle className="w-3.5 h-3.5" /> Shuffle
                        </button>
                      </>
                    )}
                    <button onClick={() => setTuned(null)} data-testid="kids-close-player" className="text-zinc-400 hover:text-white" aria-label="Close">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                {tuned.notYet ? (
                  <div className="aspect-video flex flex-col items-center justify-center text-center p-8 bg-gradient-to-br from-[#101018] to-[#1a1a26]">
                    <Clock className="w-12 h-12 text-[#7c83ff] mb-4" />
                    <div className="text-2xl font-black mb-2">Not on yet</div>
                    <p className="text-zinc-400 max-w-md">
                      <span className="text-white font-semibold">{tuned.show.title}</span> airs at <span className="text-[#a8aeff] font-bold">{tuned.show.start}</span>.
                      Come back then to catch it live — or scroll down to watch a 2000s classic on demand.
                    </p>
                  </div>
                ) : activeServer ? (
                  <div className="relative aspect-video bg-black">
                    <iframe
                      key={`${activeServer.url}-${serverIdx}-${tuned.season}-${tuned.episode}-${safeMode ? 'safe' : 'std'}`}
                      src={activeServer.url}
                      title={`${tuned.show.title} S${tuned.season}E${tuned.episode}`}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      referrerPolicy="no-referrer"
                      {...(safeMode
                        ? { sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock' }
                        : {})}
                      className="absolute inset-0 w-full h-full"
                      data-testid="kids-player-iframe"
                    />
                  </div>
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center text-center p-8 bg-[#0d0d14]">
                    <div className="text-zinc-400 text-sm">No player available for this show.</div>
                  </div>
                )}
                {!tuned.notYet && servers.length > 0 && (
                  <div className="p-4">
                    <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2 flex-wrap">
                      <Server className="w-3.5 h-3.5" /> Choose Server
                      <span className="text-zinc-500 normal-case">— if one doesn&apos;t work, try another</span>
                      <span className="ml-auto text-zinc-500 normal-case">
                        {safeMode ? 'Popup blocker: ON' : 'Popup blocker: OFF'} · change in Navbar → Settings
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {servers.map((s, i) => (
                        <div key={s.name} className="flex items-stretch rounded-md overflow-hidden border border-white/10">
                          <button
                            onClick={() => pickServer(i)}
                            data-testid={`kids-server-${i}`}
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
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })()}

        {/* Airing Now row */}
        <Row title="Airing now on Kids TV" subtitle="Today's live schedule" icon={Radio} testId="row-airing-now">
          {airingNow.map((s, i) => (
            <ShowCard key={`n-${i}-${s.title}-${s.start}`} show={s} onClick={() => tuneToLive(s)} badge={i === 0 ? 'On now' : `${s.start}`} />
          ))}
        </Row>

        {/* 2000s Classics row */}
        <Row title="2000s Classics" subtitle="On-demand nostalgia" icon={Star} testId="row-classics">
          {CLASSICS_2000S.map((s, i) => (
            <ShowCard key={`c-${i}-${s.title}`} show={s} onClick={() => playClassic(s)} />
          ))}
        </Row>

        {/* Popular Now row */}
        <Row title="Popular Kids Shows" subtitle="Loved by families" icon={Baby} testId="row-popular">
          {POPULAR_NOW.map((s, i) => (
            <ShowCard key={`p-${i}-${s.title}`} show={s} onClick={() => playClassic(s)} />
          ))}
        </Row>

        {/* -----------------------  Movies & Series Library ----------------------- */}
        <section className="pt-8 px-4 lg:px-8" data-testid="kids-library">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <Sparkles className="w-5 h-5 text-[#7c83ff]" />
            <h2 className="text-2xl md:text-3xl font-black">Kids Movies & Series Library</h2>
            <span className="text-sm text-zinc-400">· Curated by TMDB · family & animation</span>
          </div>
          <p className="text-zinc-500 text-sm mb-4">Pick an age range — the library retunes to match.</p>
          <div className="flex flex-wrap gap-2" data-testid="kids-age-chips">
            {AGE_BUCKETS.map((b) => (
              <button
                key={b.id}
                data-testid={`kids-age-chip-${b.id}`}
                onClick={() => setAgeId(b.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  ageId === b.id
                    ? 'bg-[#7c83ff] border-[#7c83ff] text-white shadow-lg shadow-[#7c83ff]/25'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </section>

        {libLoading ? (
          <div className="px-4 lg:px-8 pt-6">
            <div className="flex gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="w-[180px] h-[270px] rounded-xl bg-white/5 animate-pulse shrink-0" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <Row title="Kids Series" subtitle="Browse full library" testId="row-lib-series">
              {libTv.length > 0 ? libTv.map((it) => <LibraryCard key={`ltv-${it.id}`} item={it} />) : (
                <div className="text-sm text-zinc-500 px-4">No matches for this age — try another.</div>
              )}
            </Row>
            <Row title="Kids Movies" subtitle="Family films" testId="row-lib-movies">
              {libMovies.length > 0 ? libMovies.map((it) => <LibraryCard key={`lmv-${it.id}`} item={it} />) : (
                <div className="text-sm text-zinc-500 px-4">No matches for this age — try another.</div>
              )}
            </Row>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
