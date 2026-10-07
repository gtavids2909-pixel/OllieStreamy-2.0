import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  Tv,
  Radio,
  Search as SearchIcon,
  ChevronRight,
  ChevronDown,
  X,
  Server,
  Cast,
  ExternalLink,
  Globe,
  Loader2,
} from 'lucide-react';
import { getSafeMode, onSafeModeChange } from '../lib/prefs';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

async function j(path) {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// --------------------------- HLS <video> player -----------------------------
// Every live-TV URL goes through our /api/livetv/proxy endpoint, which never
// ends in ".m3u8" — so we must NOT sniff the extension. Use hls.js whenever the
// browser supports MSE, fall back to native HLS (Safari/iOS), and report errors
// so the page can auto-advance to the next mirror.
function HlsVideo({ url, onFatal }) {
  const videoRef = useRef(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    setErr(null);
    setLoading(true);

    let hls;
    let dead = false;
    const fail = (msg) => {
      if (dead) return;
      dead = true;
      setErr(msg);
      setLoading(false);
      if (onFatal) onFatal();
    };

    const onPlaying = () => setLoading(false);
    const onNativeError = () => fail('Playback failed. Trying next server…');
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onNativeError);

    // Give each mirror a hard cap to start before we move on.
    const startTimer = setTimeout(() => {
      if (video.readyState < 2) fail('Stream is not responding. Trying next server…');
    }, 20000);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 3,
        backBufferLength: 30,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const p = video.play();
        if (p && p.catch) p.catch(() => { /* autoplay blocked; user can press play */ });
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try { hls.recoverMediaError(); return; } catch (_e) { /* fall through */ }
        }
        fail('Playback failed. Trying next server…');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url; // Safari / iOS native HLS
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      fail('This browser cannot play live streams.');
    }

    return () => {
      dead = true;
      clearTimeout(startTimer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onNativeError);
      try { hls?.destroy(); } catch (_e) { /* ignore */ }
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (_e) { /* ignore */ }
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative aspect-video bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay
        muted
        className="absolute inset-0 w-full h-full"
        data-testid="livetv-hls-video"
      />
      {loading && !err && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      )}
      {err && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="text-sm text-red-300 bg-black/70 px-3 py-2 rounded">{err}</div>
        </div>
      )}
    </div>
  );
}

// ----------------------------  Country row  ---------------------------------
function CountryRow({ c, open, onToggle, q, categoryFilter, onPickChannel, activeChannelId, showOffline }) {
  const [state, setState] = useState({ loading: false, items: [], total: 0, page: 1 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Refetch when: opened, country changed, or an outer filter changed
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = async () => {
      setState((s) => ({ ...s, loading: true }));
      const params = new URLSearchParams({ country: c.code, page: '1', page_size: '60' });
      if (categoryFilter) params.set('category', categoryFilter);
      if (q?.trim()) params.set('q', q.trim());
      if (showOffline) params.set('include_offline', 'true');
      try {
        const d = await j(`/livetv/channels?${params.toString()}`);
        if (!cancelled) setState({ loading: false, items: d.items, total: d.total, page: 1 });
      } catch (_e) {
        if (!cancelled) setState({ loading: false, items: [], total: 0, page: 1 });
      }
    };
    run();
    return () => { cancelled = true; };
  }, [open, c.code, categoryFilter, q, refreshKey, showOffline]);

  const loadMore = useCallback(async () => {
    const nextPage = state.page + 1;
    const params = new URLSearchParams({
      country: c.code,
      page: String(nextPage),
      page_size: '60',
    });
    if (categoryFilter) params.set('category', categoryFilter);
    if (q?.trim()) params.set('q', q.trim());
    if (showOffline) params.set('include_offline', 'true');
    try {
      const d = await j(`/livetv/channels?${params.toString()}`);
      setState((s) => ({ ...s, items: [...s.items, ...d.items], page: nextPage }));
    } catch (_e) { /* ignore */ }
  }, [c.code, categoryFilter, q, state.page, showOffline]);

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
                  <button
                    key={ch.id}
                    data-testid={`livetv-channel-${ch.id}`}
                    onClick={() => onPickChannel(ch)}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
                      activeChannelId === ch.id
                        ? 'bg-[#7c83ff]/15 border-[#7c83ff]/40'
                        : 'bg-[#0d0d14] border-white/5 hover:border-[#7c83ff]/30 hover:bg-white/5'
                    }`}
                  >
                    <img
                      src={ch.logo || `https://ui-avatars.com/api/?background=15151f&color=a8aeff&bold=true&name=${encodeURIComponent(ch.name.slice(0, 2))}`}
                      alt=""
                      loading="lazy"
                      className="w-10 h-10 rounded-md object-contain bg-white/5 border border-white/10 shrink-0"
                      onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?background=15151f&color=a8aeff&bold=true&name=${encodeURIComponent(ch.name.slice(0, 2))}`; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate flex items-center gap-1">
                        {ch.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <Radio className={`w-2.5 h-2.5 ${ch.offline ? 'text-amber-400' : ch.alive_count ? 'text-green-400' : 'text-zinc-400'}`} />
                        {ch.offline
                          ? 'Off-air · checks every 15 min'
                          : ch.alive_count ? `${ch.alive_count} live` : `${ch.stream_count} server${ch.stream_count === 1 ? '' : 's'}`}
                        {ch.categories?.length ? ` · ${ch.categories.slice(0, 2).join(', ')}` : ''}
                      </div>
                    </div>
                  </button>
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
  const [categories, setCategories] = useState([]);
  const [openCode, setOpenCode] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [channelFull, setChannelFull] = useState(null); // { id, name, streams, ... }
  const [serverIdx, setServerIdx] = useState(0);
  const [loadingCat, setLoadingCat] = useState(true);
  const [showOffline, setShowOffline] = useState(false);
  const [safeMode, setSafeModeLocal] = useState(getSafeMode());
  useEffect(() => onSafeModeChange(setSafeModeLocal), []);

  useEffect(() => {
    (async () => {
      try {
        const qs = showOffline ? '?include_offline=true' : '';
        const [cs, cats] = await Promise.all([j(`/livetv/countries${qs}`), j(`/livetv/categories${qs}`)]);
        setCountries(cs.items || []);
        setCategories(cats.items || []);
      } catch (_e) { /* ignore */ } finally {
        setLoadingCat(false);
      }
    })();
  }, [showOffline]);

  const sortedCountries = useMemo(() => {
    const arr = [...countries];
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [countries]);

  const pickChannel = async (c) => {
    try {
      const full = await j(`/livetv/channel/${encodeURIComponent(c.id)}`);
      setChannelFull(full);
      setServerIdx(0);
      setTimeout(
        () => document.getElementById('livetv-player')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        80,
      );
    } catch (_e) { /* ignore */ }
  };

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
            {countries.reduce((a, c) => a + c.count, 0).toLocaleString()} channels · {countries.length} countries · auto-refreshed daily
          </span>
        </div>
        <p className="text-zinc-400 mb-5 text-sm">
          Browse by country, filter by category, tap a channel — plays as a native HLS stream (no iframes, no popups).
          Catalog is sourced from <a className="text-[#a8aeff] hover:text-white" href="https://github.com/iptv-org/iptv" target="_blank" rel="noreferrer">iptv-org</a> and refreshed every 24 hours.
        </p>

        {/* Search + category chips */}
        <div className="grid md:grid-cols-[1fr_auto] gap-3 mb-5">
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
            {categories
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((c) => (
                <option key={c.id} value={c.id} className="bg-[#101018]">
                  {c.name} ({c.count.toLocaleString()})
                </option>
              ))}
          </select>
        </div>

        <label className="flex items-center gap-2 mb-5 text-sm text-zinc-300 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={showOffline}
            onChange={(e) => setShowOffline(e.target.checked)}
            data-testid="livetv-show-offline"
            className="accent-[#7c83ff] w-4 h-4"
          />
          Show off-air / scheduled channels
          <span className="text-xs text-zinc-500">(re-checked every 15 min and when you open them — they play as soon as they go live)</span>
        </label>

        {/* Active player */}
        {channelFull && (
          <div id="livetv-player" className="bg-[#101018] rounded-2xl border border-white/5 overflow-hidden mb-8" data-testid="livetv-player-root">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-white min-w-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                {channelFull.logo && (
                  <img src={channelFull.logo} alt="" className="w-6 h-6 rounded object-contain bg-white/5 border border-white/10 shrink-0" />
                )}
                <span className="truncate">{channelFull.name}</span>
                <span className="text-zinc-500 shrink-0 text-xs">· {channelFull.country_flag} {channelFull.country}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={openCast}
                  data-testid="livetv-cast-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7c83ff] hover:bg-[#9097ff] text-white text-xs font-semibold shadow-lg shadow-[#7c83ff]/20"
                  title="Full-viewport mirror mode"
                >
                  <Cast className="w-3.5 h-3.5" /> Cast / Mirror
                </button>
                <button onClick={() => setChannelFull(null)} className="text-zinc-400 hover:text-white p-1" aria-label="Close" data-testid="livetv-close-player">
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
            {activeStream ? (
              <HlsVideo
                key={`${channelFull.id}-${serverIdx}`}
                url={`${process.env.REACT_APP_BACKEND_URL}${activeStream.proxy_url}`}
                onFatal={() => {
                  // Auto-advance to the next mirror; stop at the last one.
                  setServerIdx((i) => (i + 1 < (channelFull.streams?.length || 0) ? i + 1 : i));
                }}
              />
            ) : (
              <div className="aspect-video flex items-center justify-center text-sm text-zinc-400 bg-black">No server available</div>
            )}
            <div className="p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2 flex-wrap">
                <Server className="w-3.5 h-3.5" /> Choose Server
                <span className="text-zinc-500 normal-case">— if playback stalls or shows an error, try another</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {channelFull.streams.map((s, i) => (
                  <div key={s.url + i} className="flex items-stretch rounded-md overflow-hidden border border-white/10">
                    <button
                      onClick={() => setServerIdx(i)}
                      data-testid={`livetv-server-${i}`}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        serverIdx === i ? 'bg-[#7c83ff] text-white' : 'bg-white/5 text-zinc-200 hover:bg-white/10'
                      }`}
                    >
                      {s.alive === true && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                      {s.label || s.quality || `Mirror ${i + 1}`}
                    </button>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open stream URL"
                      className={`px-2 flex items-center justify-center border-l border-white/10 ${
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
          </div>
        )}

        {/* Country list */}
        <div className="bg-[#101018] rounded-2xl border border-white/5 overflow-hidden">
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
                showOffline={showOffline}
              />
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
