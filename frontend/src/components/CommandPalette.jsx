import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Home, Film, Tv, Radio, Volleyball, Baby, LayoutGrid, Loader2, Clapperboard, CornerDownLeft } from 'lucide-react';
import { tmdb, IMG } from '../lib/tmdb';
import { j, fallbackLogo } from '../lib/livetv';

export const openPalette = () => window.dispatchEvent(new Event('os:open-palette'));

const PAGES = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Movies', to: '/movies', icon: Film },
  { label: 'TV Shows', to: '/tv', icon: Tv },
  { label: 'Live TV', to: '/livetv', icon: Radio },
  { label: 'Sports', to: '/livetv?tab=sports', icon: Volleyball },
  { label: 'Replays', to: '/replays', icon: Clapperboard },
  { label: 'Kids', to: '/kids', icon: Baby },
  { label: 'Multi-View', to: '/multiview', icon: LayoutGrid },
];

function useSearch(q, open) {
  const [res, setRes] = useState({ media: [], channels: [], loading: false });
  useEffect(() => {
    if (!open || !q.trim()) { setRes({ media: [], channels: [], loading: false }); return undefined; }
    let cancelled = false;
    setRes((r) => ({ ...r, loading: true }));
    const t = setTimeout(async () => {
      const [m, c] = await Promise.allSettled([
        tmdb.search(q.trim()),
        j(`/livetv/channels?q=${encodeURIComponent(q.trim())}&page_size=6`),
      ]);
      if (cancelled) return;
      setRes({
        media: m.status === 'fulfilled' ? (m.value.results || []).filter((r) => r.media_type === 'movie' || r.media_type === 'tv').slice(0, 6) : [],
        channels: c.status === 'fulfilled' ? c.value.items || [] : [],
        loading: false,
      });
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);
  return res;
}

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { media, channels, loading } = useSearch(q, open);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('os:open-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('os:open-palette', onOpen); };
  }, []);

  useEffect(() => {
    if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [open]);

  const groups = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const pages = PAGES.filter((p) => !ql || p.label.toLowerCase().includes(ql)).map((p) => ({ key: `p-${p.to}`, to: p.to, title: p.label, icon: p.icon, sub: 'Page' }));
    const mediaItems = media.map((r) => ({
      key: `m-${r.media_type}-${r.id}`, to: `/${r.media_type}/${r.id}`, title: r.title || r.name,
      img: r.poster_path ? IMG(r.poster_path, 'w92') : '', sub: `${r.media_type === 'tv' ? 'TV' : 'Movie'} · ${(r.release_date || r.first_air_date || '').slice(0, 4)}`,
    }));
    const chItems = channels.map((c) => ({
      key: `c-${c.id}`, to: `/livetv?play=${encodeURIComponent(c.id)}`, livetv: c, title: c.name,
      img: c.logo || fallbackLogo(c.name), sub: `${c.country_flag || ''} ${c.country_name || c.country} · ${c.alive_count} live`,
    }));
    return [
      { name: 'Movies & TV', items: mediaItems },
      { name: 'Live channels', items: chItems },
      { name: 'Pages', items: pages },
    ].filter((g) => g.items.length);
  }, [q, media, channels]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);
  useEffect(() => setSel(0), [flat.length]);
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  const go = (it) => {
    if (!it) return;
    setOpen(false);
    navigate(it.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(flat[sel]); }
  };

  if (!open) return null;
  let idx = -1;
  return (
    <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-0 sm:pt-[12vh] palette-fade" onClick={() => setOpen(false)} data-testid="command-palette">
      <div className="w-full sm:max-w-xl bg-[#101018] border border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden h-[100dvh] sm:h-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-white/5 shrink-0">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search movies, shows, live channels, pages…"
            data-testid="command-palette-input"
            className="flex-1 bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-zinc-400" data-testid="command-palette-loading" />}
          <button onClick={() => setOpen(false)} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-white/10 text-zinc-400 hover:text-white" data-testid="command-palette-close">ESC</button>
        </div>
        <div ref={listRef} className="overflow-y-auto sm:max-h-[60vh] flex-1 py-2" data-testid="command-palette-results">
          {!loading && q.trim() && flat.length === 0 && (
            <div className="py-10 text-center text-sm text-zinc-500" data-testid="command-palette-empty">No results for “{q}”</div>
          )}
          {groups.map((g) => (
            <div key={g.name} className="mb-1">
              <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wider text-zinc-500">{g.name}</div>
              {g.items.map((it) => {
                idx += 1;
                const i = idx;
                const Icon = it.icon;
                return (
                  <button
                    key={it.key}
                    data-idx={i}
                    data-testid={`command-palette-item-${it.key}`}
                    onMouseMove={() => setSel(i)}
                    onClick={() => go(it)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${sel === i ? 'bg-[#7c83ff]/15' : ''}`}
                  >
                    {Icon ? (
                      <span className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#a8aeff]" /></span>
                    ) : (
                      <img src={it.img || fallbackLogo(it.title)} alt="" onError={(e) => { e.currentTarget.src = fallbackLogo(it.title); }} className={`${it.livetv ? 'w-9 h-9 object-contain' : 'w-9 h-12 object-cover'} rounded bg-white/5 shrink-0`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{it.title}</div>
                      <div className="text-[11px] text-zinc-400 truncate">{it.sub}</div>
                    </div>
                    {sel === i && <CornerDownLeft className="w-3.5 h-3.5 text-zinc-500 hidden sm:block" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="hidden sm:flex items-center gap-4 px-4 h-9 border-t border-white/5 text-[11px] text-zinc-500">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
