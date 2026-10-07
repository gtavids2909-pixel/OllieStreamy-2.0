import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Tv,
  Search as SearchIcon,
  Radio,
  Star,
  History as HistoryIcon,
  ChevronRight,
  ChevronDown,
  X,
  Cast,
  Globe,
} from 'lucide-react';
import { getSafeMode, onSafeModeChange } from '../lib/prefs';

import HlsVideo from '../components/HlsVideo';
import ChannelCard from '../components/livetv/ChannelCard';
import ChannelStrip from '../components/livetv/ChannelStrip';
import FavButton from '../components/livetv/FavButton';
import PlayerToolbar from '../components/livetv/PlayerToolbar';
import { j, proxyFull, pushRecent, reducedMotion } from '../lib/livetv';
import useLiveStore from '../lib/useLiveStore';
import SportsHub from '../components/livetv/SportsHub';
import StatusTabs, { PRIMARY_CATEGORIES } from '../components/livetv/StatusTabs';
import ServerPicker from '../components/livetv/ServerPicker';
import LogoTile from '../components/LogoTile';
import { seekBy, togglePlay } from '../components/player/SeekBar';

// ----------------------------  Country row  ---------------------------------
function CountryRow({ c, open, onToggle, q, categoryFilter, onPickChannel, activeChannelId, status, tick }) {
  const [state, setState] = useState({ loading: false, items: [], total: 0, page: 1 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Refetch when: opened, country changed, or an outer filter changed
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setState((s) => ({ ...s, loading: true }));
      const params = new URLSearchParams({ country: c.code, page: '1', page_size: '60' });
      if (categoryFilter) params.set('pcat', categoryFilter);
      if (q?.trim()) params.set('q', q.trim());
      params.set('status', status);
      try {
        const d = await j(`/livetv/channels?${params.toString()}`);
        if (!cancelled) setState({ loading: false, items: d.items, total: d.total, page: 1 });
      } catch (_e) {
        if (!cancelled) setState({ loading: false, items: [], total: 0, page: 1 });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, c.code, categoryFilter, q, refreshKey, status, tick]);

  const loadMore = useCallback(async () => {
    const nextPage = state.page + 1;
    const params = new URLSearchParams({
      country: c.code,
      page: String(nextPage),
      page_size: '60',
    });
    if (categoryFilter) params.set('pcat', categoryFilter);
    if (q?.trim()) params.set('q', q.trim());
    params.set('status', status);
    try {
      const d = await j(`/livetv/channels?${params.toString()}`);
      setState((s) => ({ ...s, items: [...s.items, ...d.items], page: nextPage }));
    } catch (_e) { /* ignore */ }
  }, [c.code, categoryFilter, q, state.page, status]);

  const hasMore = state.items.length < state.total;

  return (
    <div className="border-b border-white/5" data-testid={`livetv-country-row-${c.code}`}>
      <button
        onClick={onToggle}
        data-testid={`livetv-country-toggle-${c.code}`}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors ${
          open ? 'bg-white/5' : ''
        }`}
      >
        <span className="text-xl shrink-0" aria-hidden>{c.flag || '🌐'}</span>
        <span className="font-semibold text-white truncate flex-1">{c.name}</span>
        <span className="text-xs text-zinc-400 tabular-nums">{c.count}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="p-3">
          {state.loading && state.items.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : state.items.length === 0 ? (
            <div className="text-sm text-zinc-500 py-6 text-center">No channels match.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {state.items.map((ch) => (
                  <ChannelCard
                    key={ch.id}
                    ch={ch}
                    active={activeChannelId === ch.id}
                    onPick={(c) => onPickChannel(c, state.items)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="mt-3 flex justify-center">
                  <button
                    onClick={loadMore}
                    data-testid={`livetv-loadmore-${c.code}`}
                    className="px-4 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-200 border border-white/10"
                  >
                    Load more ({state.total - state.items.length} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------  Page  ------------------------------------
export default function LiveTVPage() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState([]);
  const [openCode, setOpenCode] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [channelFull, setChannelFull] = useState(null); // { id, name, streams, ... }
  const [serverIdx, setServerIdx] = useState(0);
  const [loadingCat, setLoadingCat] = useState(true);
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'sports' ? 'sports' : 'channels';
  const setTab = (t) => setParams((p) => { const n = new URLSearchParams(p); if (t === 'sports') n.set('tab', 'sports'); else n.delete('tab'); n.delete('play'); return n; }, { replace: true });
  const [status, setStatus] = useState('live');
  const [sport, setSport] = useState('');
  const [facets, setFacets] = useState({ status: {}, sports: {}, categories: {} });
  const [allFailed, setAllFailed] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);
  const [safeMode, setSafeModeLocal] = useState(getSafeMode());
  useEffect(() => onSafeModeChange(setSafeModeLocal), []);

  useEffect(() => {
    (async () => {
      try {
        const cq = new URLSearchParams({ status });
        if (cat) cq.set('pcat', cat);
        const [cs, fc] = await Promise.all([j(`/livetv/countries?${cq}`), j(`/livetv/facets?status=${status}`)]);
        setCountries(cs.items || []);
        setFacets(fc);
      } catch (_e) { /* ignore */ } finally {
        setLoadingCat(false);
      }
    })();
  }, [status, cat, tick]);

  const sortedCountries = useMemo(() => {
    const arr = [...countries];
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [countries]);

  const { favs, recent } = useLiveStore();
  const [surfList, setSurfList] = useState([]);
  const [current, setCurrent] = useState(null); // card-level info of the playing channel
  const [muted, setMuted] = useState(true);
  const [tuning, setTuning] = useState(false);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const reqRef = useRef(0);

  const pickChannel = useCallback(async (c, list, { scroll = true } = {}) => {
    if (list) setSurfList(list);
    setCurrent(c);
    setTuning(true);
    const req = ++reqRef.current;
    try {
      const full = await j(`/livetv/channel/${encodeURIComponent(c.id)}`);
      if (req !== reqRef.current) return;
      setChannelFull(full);
      setServerIdx(0);
      setAllFailed(false);
      pushRecent({ ...c, ...full, alive_count: c.alive_count, hd: c.hd });
      if (scroll) {
        setTimeout(
          () => document.getElementById('livetv-player')?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' }),
          80,
        );
      }
    } catch (_e) { /* ignore */ } finally {
      if (req === reqRef.current) setTuning(false);
    }
  }, []);

  useEffect(() => {
    const id = params.get('play');
    if (id) pickChannel({ id, name: '' });
  }, [params.get('play')]); // eslint-disable-line react-hooks/exhaustive-deps

  const surfIdx = current ? surfList.findIndex((x) => x.id === current.id) : -1;
  const canSurf = surfList.length > 1;
  const surf = useCallback((dir) => {
    if (surfList.length < 2) return;
    const i = surfIdx < 0 ? 0 : (surfIdx + dir + surfList.length) % surfList.length;
    pickChannel(surfList[i], null, { scroll: false });
  }, [surfList, surfIdx, pickChannel]);

  const randomChannel = useCallback(async () => {
    let pool = surfList.filter((x) => x.id !== current?.id);
    if (!pool.length) {
      try {
        const page = 1 + Math.floor(Math.random() * 20);
        const d = await j(`/livetv/channels?page=${page}&page_size=100`);
        pool = d.items || [];
      } catch (_e) { pool = []; }
    }
    if (pool.length) pickChannel(pool[Math.floor(Math.random() * pool.length)], surfList.length ? null : pool, { scroll: !channelFull });
  }, [surfList, current, pickChannel, channelFull]);

  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const fullscreen = useCallback(() => {
    const v = videoRef.current;
    const el = v?.closest('[data-player-shell]') || playerRef.current;
    if (document.fullscreenElement) { document.exitFullscreen?.(); return; }
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => v?.webkitEnterFullscreen?.());
    else v?.webkitEnterFullscreen?.();
  }, []);

  useEffect(() => {
    if (!channelFull) return undefined;
    const onKey = (e) => {
      const t = e.target;
      if (e.ctrlKey || e.metaKey || e.altKey || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable) return;
      const k = e.key.toLowerCase();
      const v = videoRef.current;
      const map = { arrowleft: () => seekBy(v, -10), arrowright: () => seekBy(v, 10), ' ': () => togglePlay(v), arrowup: () => surf(-1), p: () => surf(-1), arrowdown: () => surf(1), n: () => surf(1), m: toggleMute, f: fullscreen, r: randomChannel };
      if (map[k]) { e.preventDefault(); map[k](); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [channelFull, surf, toggleMute, fullscreen, randomChannel]);

  const activeStream = channelFull?.streams?.[serverIdx] || null;

  const openCast = () => {
    if (!channelFull || !activeStream) return;
    const streamUrl = `${process.env.REACT_APP_BACKEND_URL}${activeStream.proxy_url}`;
    const u = encodeURIComponent(streamUrl);
    const title = encodeURIComponent(channelFull.name);
    navigate(`/cast/live/${encodeURIComponent(channelFull.id)}?u=${u}&title=${title}&hls=1`);
  };

  // If searching, keep only matching countries whose rows will show results.
  // (The row itself re-queries with the global q.)
  const visibleCountries = useMemo(() => {
    if (!q.trim() && !cat) return sortedCountries;
    return sortedCountries;
  }, [sortedCountries, q, cat]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-24 pb-14">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Tv className="w-7 h-7 text-[#7c83ff]" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" data-testid="livetv-title">Live TV</h1>
          <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live
          </span>
          <span className="ml-auto text-xs text-zinc-400">
            {countries.reduce((a, c) => a + c.count, 0).toLocaleString()} channels · {countries.length} countries · live status refreshed every 15 min
          </span>
        </div>
        <p className="text-zinc-400 mb-5 text-sm">
          Browse by country, filter by category, tap a channel — plays as a native HLS stream (no iframes, no popups).
          Catalog is sourced from <a className="text-[#a8aeff] hover:text-white" href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer">iptv-org</a> and refreshed every 24 hours.
        </p>

        <StatusTabs tab={tab} setTab={setTab} status={status} setStatus={setStatus} counts={facets.status} />

        {/* Search + category chips */}
        {tab === 'channels' && <div className="grid md:grid-cols-[1fr_auto] gap-3 mb-5">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search channels (e.g. Sony Sports, Sky News, HBO)"
              data-testid="livetv-search-input"
              className="w-full h-11 pl-10 pr-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60"
            />
          </div>
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            data-testid="livetv-category-select"
            className="h-11 px-4 pr-8 rounded-full bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-[#7c83ff]/60"
          >
            <option value="" className="bg-[#101018]">All categories</option>
            {PRIMARY_CATEGORIES.filter((c) => facets.categories?.[c]).map((c) => (
              <option key={c} value={c} className="bg-[#101018]">
                {c} ({facets.categories[c].toLocaleString()})
              </option>
            ))}
          </select>
        </div>}

        <ChannelStrip title="Favourites" icon={Star} items={favs} onPick={pickChannel} activeId={channelFull?.id} testId="livetv-favourites-row" />
        <ChannelStrip title="Recently watched" icon={HistoryIcon} items={recent} onPick={pickChannel} activeId={channelFull?.id} testId="livetv-recent-row" />

        {!channelFull && (
          <button
            onClick={randomChannel}
            data-testid="livetv-surprise-btn"
            className="mb-5 inline-flex items-center gap-2 px-4 h-10 rounded-full bg-[#7c83ff]/15 border border-[#7c83ff]/30 text-[#c3c7ff] text-sm font-semibold hover:bg-[#7c83ff]/25 transition-colors"
          >
            <Radio className="w-4 h-4" /> {tuning ? 'Tuning…' : 'Surprise me — random channel'}
          </button>
        )}

        {/* Active player */}
        {channelFull && (
          <div id="livetv-player" ref={playerRef} className="bg-[#101018] rounded-2xl border border-white/5 overflow-hidden mb-8 scroll-mt-20" data-testid="livetv-player-root">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-white min-w-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <LogoTile src={channelFull.logo} name={channelFull.name} className="w-7 h-7" />
                <span className="truncate" data-testid="livetv-player-title">{channelFull.name}</span>
                <span className="text-zinc-500 shrink-0 text-xs">· {channelFull.country_flag} {channelFull.country}</span>
                {tuning && <span className="text-[11px] text-[#a8aeff] shrink-0" data-testid="livetv-tuning">Tuning…</span>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <FavButton channel={{ ...current, ...channelFull, alive_count: current?.alive_count, hd: current?.hd }} testId="livetv-player-fav-btn" size="md" />
                <button
                  onClick={openCast}
                  data-testid="livetv-cast-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7c83ff] hover:bg-[#9097ff] text-white text-xs font-semibold shadow-lg shadow-[#7c83ff]/20"
                  title="Full-viewport mirror mode"
                >
                  <Cast className="w-3.5 h-3.5" /> Cast / Mirror
                </button>
                <button onClick={() => { setChannelFull(null); setCurrent(null); }} className="text-zinc-400 hover:text-white p-1" aria-label="Close" data-testid="livetv-close-player">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            {channelFull.offline && (
              <div className="px-4 py-2 text-xs text-amber-300 bg-amber-500/10 border-b border-amber-500/20">
                This channel looks off-air right now. We tried every server — if it is a scheduled channel it will
                start working when the broadcast begins. Re-open it then, or pick another server below.
              </div>
            )}
            <PlayerToolbar
              videoRef={videoRef}
              muted={muted}
              onToggleMute={toggleMute}
              onFullscreen={fullscreen}
              onPrev={() => surf(-1)}
              onNext={() => surf(1)}
              onRandom={randomChannel}
              canSurf={canSurf}
              position={canSurf && surfIdx >= 0 ? `${surfIdx + 1} / ${surfList.length}` : ''}
            />
            {activeStream ? (
              <div className="relative">
                <HlsVideo
                  key={`${channelFull.id}-${serverIdx}-${allFailed ? 'x' : ''}`}
                  videoRef={videoRef}
                  muted={muted}
                  onMutedChange={setMuted}
                  enhanced
                  startTimeout={serverIdx === 0 ? 25000 : 20000}
                  url={proxyFull(activeStream.proxy_url)}
                  onFatal={() => {
                    const total = channelFull.streams?.length || 0;
                    setServerIdx((i) => {
                      if (i + 1 < total) return i + 1;
                      setAllFailed(true);
                      return i;
                    });
                  }}
                />
                {allFailed && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 text-center px-6" data-testid="livetv-all-failed">
                    <div className="text-sm font-semibold text-white">None of the {channelFull.streams.length} server{channelFull.streams.length === 1 ? '' : 's'} responded.</div>
                    <div className="text-xs text-zinc-400 max-w-sm">This channel may be off-air or blocked in your region right now. It is re-checked every 15 minutes.</div>
                    <button
                      onClick={() => { setAllFailed(false); setServerIdx(0); }}
                      data-testid="livetv-retry-all-btn"
                      className="h-10 px-5 rounded-full bg-[#7c83ff] hover:bg-[#9097ff] text-white text-sm font-semibold"
                    >
                      Retry all servers
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center text-sm text-zinc-400 bg-black">No server available</div>
            )}
            <ServerPicker
              streams={channelFull.streams}
              idx={serverIdx}
              onPick={(i) => { setAllFailed(false); setServerIdx(i); }}
              onNext={() => { setAllFailed(false); setServerIdx((i) => (i + 1) % channelFull.streams.length); }}
            />
          </div>
        )}

        {tab === 'sports' && (
          <SportsHub tick={tick} status={status} counts={facets.sports} sport={sport} setSport={setSport} onPick={pickChannel} activeId={channelFull?.id} />
        )}

        {/* Country list */}
        {tab === 'channels' && <div className="bg-[#101018] rounded-2xl border border-white/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <Globe className="w-4 h-4 text-[#7c83ff]" />
            <div className="text-sm font-semibold">Browse by country</div>
            <div className="ml-auto text-xs text-zinc-500">tap a country to open the channel list</div>
          </div>
          {loadingCat ? (
            <div className="p-6 text-center text-sm text-zinc-500">Loading channel catalog…</div>
          ) : (
            visibleCountries.map((c) => (
              <CountryRow
                key={c.code}
                c={c}
                open={openCode === c.code}
                onToggle={() => setOpenCode(openCode === c.code ? null : c.code)}
                q={q}
                categoryFilter={cat}
                onPickChannel={pickChannel}
                activeChannelId={channelFull?.id}
                status={status}
                tick={tick}
              />
            ))
          )}
          {!loadingCat && visibleCountries.length === 0 && (
            <div className="p-6 text-center text-sm text-zinc-500" data-testid="livetv-no-countries">No channels in this view.</div>
          )}
        </div>}
      </main>
      <Footer />
    </div>
  );
}
