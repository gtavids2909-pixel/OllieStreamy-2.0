import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Volleyball,
  Trophy,
  Radio,
  ExternalLink,
  Server,
  X,
  Play,
  Search as SearchIcon,
  Cast,
} from 'lucide-react';
import { CATEGORIES, CHANNELS, channelsByCategory } from '../../lib/sportsChannels';
import { getSafeMode, onSafeModeChange } from '../../lib/prefs';

export default function CuratedSports() {
  const navigate = useNavigate();
  const [catKey, setCatKey] = useState('cricket');
  const [query, setQuery] = useState('');
  const [tuned, setTuned] = useState(null); // channel object
  const [serverIdx, setServerIdx] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('fs_sports_server_idx'));
      return Number.isFinite(saved) && saved >= 0 ? saved : 0;
    } catch { return 0; }
  });
  const [safeMode, setSafeModeLocal] = useState(getSafeMode());
  useEffect(() => onSafeModeChange(setSafeModeLocal), []);

  const pickServer = (i) => {
    setServerIdx(i);
    try { localStorage.setItem('fs_sports_server_idx', String(i)); } catch (_e) { /* ignore */ }
  };

  // Visible channels after category + text filter
  const visible = useMemo(() => {
    const base = query.trim()
      ? CHANNELS.filter((c) =>
          (c.name + ' ' + (c.desc || '') + ' ' + c.country).toLowerCase().includes(query.trim().toLowerCase())
        )
      : channelsByCategory(catKey);
    return base;
  }, [catKey, query]);

  const tune = (channel) => {
    setTuned(channel);
    setServerIdx(0);
    setTimeout(() => document.getElementById('sports-player')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const openCast = () => {
    // Build a cast URL from the current server. We piggy-back on the standard
    // /cast route by passing the raw embed URL as ?u= so the Cast page can
    // render it full-screen just like a TMDB iframe.
    if (!tuned) return;
    const srv = tuned.servers[serverIdx];
    if (!srv) return;
    const u = encodeURIComponent(srv.url);
    const title = encodeURIComponent(tuned.name);
    navigate(`/cast/live/${tuned.slug}?u=${u}&title=${title}`);
  };

  const activeCategory = CATEGORIES.find((c) => c.key === catKey) || CATEGORIES[0];
  const srv = tuned?.servers[serverIdx];

  return (
    <section data-testid="curated-sports">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <Volleyball className="w-7 h-7 text-[#7c83ff]" />
          <h2 className="text-xl md:text-2xl font-black tracking-tight" data-testid="sports-page-title">Curated sports channels</h2>
          <span className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-bold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live 24/7
          </span>
          <span className="ml-auto text-xs text-zinc-400">
            {CHANNELS.length} channels · {CATEGORIES.length} directories
          </span>
        </div>
        <p className="text-zinc-400 mb-5 text-sm">
          Browse by sport or search a channel — each channel has multiple mirror servers (SportsBite, StreamSports99,
          IPTV-Web, NTV.ST, Famelack). If one is blocked in your region, swap to the next.
        </p>

        {/* Search */}
        <div className="relative mb-5 max-w-xl">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search channels (e.g. Sony Ten, Sky Sports F1, HBO)"
            data-testid="sports-search-input"
            className="w-full h-11 pl-10 pr-4 rounded-full bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60"
          />
        </div>

        {/* Category chips */}
        {!query.trim() && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide" data-testid="sports-category-chips">
            {CATEGORIES.map((c) => {
              const count = channelsByCategory(c.key).length;
              const active = c.key === catKey;
              return (
                <button
                  key={c.key}
                  data-testid={`sports-cat-${c.key}`}
                  onClick={() => setCatKey(c.key)}
                  className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    active
                      ? 'bg-[#7c83ff] text-white border-[#7c83ff] shadow-lg shadow-[#7c83ff]/25'
                      : 'bg-white/5 text-zinc-200 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.name}
                  <span className={`text-[11px] font-normal ${active ? 'text-white/80' : 'text-zinc-500'}`}>· {count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Player */}
        {tuned && (
          <div id="sports-player" className="bg-[#101018] rounded-2xl border border-white/5 overflow-hidden mb-8" data-testid="sports-player-root">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-white min-w-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                <span className="truncate">{tuned.name}</span>
                <span className="text-zinc-500 shrink-0 text-xs">· {tuned.country}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={openCast}
                  data-testid="sports-cast-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#7c83ff] hover:bg-[#9097ff] text-white text-xs font-semibold shadow-lg shadow-[#7c83ff]/20"
                  title="Full-viewport player optimized for TV screen mirroring"
                >
                  <Cast className="w-3.5 h-3.5" /> Cast / Mirror
                </button>
                <button onClick={() => setTuned(null)} className="text-zinc-400 hover:text-white p-1" data-testid="sports-close-player" aria-label="Close player">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative aspect-video bg-black">
              {srv ? (
                <iframe
                  key={`${srv.url}-${serverIdx}-${safeMode ? 'safe' : 'std'}`}
                  src={srv.url}
                  title="Live TV player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  {...(safeMode
                    ? { sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock' }
                    : {})}
                  className="absolute inset-0 w-full h-full"
                  data-testid="sports-iframe"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm">No server available</div>
              )}
            </div>
            <div className="p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-2 flex-wrap">
                <Server className="w-3.5 h-3.5" /> Choose Server
                <span className="text-zinc-500 normal-case">— if the player stays blank or shows a load symbol, try another server or open ↗</span>
                <span className="ml-auto text-zinc-500 normal-case">
                  {safeMode ? 'Popup blocker: ON' : 'Popup blocker: OFF'} · Navbar → Settings
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tuned.servers.map((s, i) => (
                  <div key={s.name + i} className="flex items-stretch rounded-md overflow-hidden border border-white/10">
                    <button
                      onClick={() => pickServer(i)}
                      data-testid={`sports-server-${i}`}
                      className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                        serverIdx === i ? 'bg-[#7c83ff] text-white' : 'bg-white/5 text-zinc-200 hover:bg-white/10'
                      }`}
                    >
                      {s.name}
                    </button>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in new tab"
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

        {/* Section header for the current category */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl" aria-hidden>{query.trim() ? '🔎' : activeCategory.emoji}</span>
          <h2 className="text-xl md:text-2xl font-bold">
            {query.trim() ? `Results for "${query.trim()}"` : activeCategory.name}
          </h2>
          <span className="text-sm text-zinc-400">· {visible.length} channel{visible.length === 1 ? '' : 's'}</span>
        </div>

        {/* Channel grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="sports-channel-grid">
          {visible.map((ch) => (
            <button
              key={ch.slug}
              onClick={() => tune(ch)}
              data-testid={`sports-channel-${ch.slug}`}
              className={`text-left p-4 rounded-xl border transition-colors group ${
                tuned?.slug === ch.slug
                  ? 'bg-[#7c83ff]/10 border-[#7c83ff]/40'
                  : 'bg-[#101018] border-white/5 hover:border-[#7c83ff]/30'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={ch.logo}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover border border-white/10 shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white truncate flex items-center gap-1.5">
                    {ch.name}
                    <span className="text-[10px] font-semibold text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">{ch.country}</span>
                  </div>
                  <div className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5">
                    <Radio className="w-3 h-3 text-red-400" />
                    Live · {ch.servers.length} servers
                  </div>
                </div>
              </div>
              {ch.desc && <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3">{ch.desc}</p>}
              <div className="flex flex-wrap gap-1 mb-3">
                {ch.categories.map((k) => {
                  const cat = CATEGORIES.find((c) => c.key === k);
                  if (!cat) return null;
                  return (
                    <span key={k} className="text-[10px] font-semibold text-zinc-300 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">
                      {cat.emoji} {cat.name}
                    </span>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#a8aeff]">
                <Play className="w-3.5 h-3.5 fill-[#a8aeff]" /> Tune in
              </div>
            </button>
          ))}
          {visible.length === 0 && (
            <div className="col-span-full text-center text-zinc-500 py-12 text-sm">
              No channels match that search. Try &quot;sony&quot;, &quot;sky&quot;, &quot;espn&quot;, &quot;hbo&quot;…
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-8 rounded-xl border border-white/5 bg-[#101018] p-5">
          <div className="flex items-start gap-3">
            <Trophy className="w-5 h-5 text-[#a8aeff] mt-0.5 shrink-0" />
            <div className="text-sm text-zinc-300 leading-relaxed">
              All streams come from public third-party iframe providers. If any mirror shows only a load spinner or a
              lock icon, that server is blocking cross-site embedding — try the next server or open it in a new tab
              with the ↗ icon. For TV screen mirroring, use <span className="font-semibold text-white">Cast / Mirror</span>.
            </div>
          </div>
        </div>
    </section>
  );
}
