import React, { useEffect, useMemo, useState } from 'react';
import { Clapperboard, Search, ExternalLink, Youtube, Archive, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import LogoTile, { favicon } from '../components/LogoTile';
import { j } from '../lib/livetv';

const ARCHIVES = [{ name: 'NASCAR Classics', url: 'https://classics.nascar.com/', sport: 'Motorsport' }];

const ReplayCard = ({ it, testId }) => (
  <a href={it.url} target="_blank" rel="noopener noreferrer" data-testid={testId}
    className="flex items-start gap-3 p-3 rounded-xl bg-[#0d0d14] border border-white/5 hover:border-[#7c83ff]/40 hover:bg-white/5 transition-colors">
    <LogoTile src={it.logo || (it.kind === 'youtube' ? '' : favicon(it.url))} name={it.name} className="w-11 h-11 rounded-full" />
    <div className="min-w-0 flex-1">
      <div className="text-sm font-semibold text-white line-clamp-2">{it.name}</div>
      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300">{it.sport}</span>
        {it.kind === 'youtube' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-300 inline-flex items-center gap-1"><Youtube className="w-3 h-3" /> YouTube</span>
        )}
      </div>
      {it.description && <div className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{it.description}</div>}
    </div>
    <ExternalLink className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-1" />
  </a>
);

export default function ReplaysPage() {
  const [data, setData] = useState({ items: [], counts: {}, updated_at: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sport, setSport] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    j('/replays').then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  const tabs = useMemo(() => Object.entries(data.counts || {}).sort((a, b) => b[1] - a[1]), [data.counts]);
  const shown = useMemo(() => data.items.filter((it) => (!sport || it.sport === sport)
    && (!q.trim() || `${it.name} ${it.description}`.toLowerCase().includes(q.trim().toLowerCase()))), [data.items, sport, q]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-24 pb-14">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <Clapperboard className="w-7 h-7 text-[#7c83ff]" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" data-testid="replays-title">Sports Replays</h1>
        </div>
        <p className="text-sm text-zinc-400 mb-1">Full matches and highlights from official league and broadcaster channels.</p>
        <p className="text-xs text-zinc-500 mb-5" data-testid="replays-updated">
          {data.updated_at ? `Last updated ${new Date(data.updated_at).toLocaleString()}` : loading ? 'Loading…' : 'Not synced yet'}
        </p>

        <section className="mb-6" data-testid="replays-archives">
          <div className="flex items-center gap-2 mb-2"><Archive className="w-4 h-4 text-[#7c83ff]" /><h2 className="text-base md:text-lg font-bold">Official archives</h2></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {ARCHIVES.map((a) => <ReplayCard key={a.url} it={{ ...a, kind: 'web' }} testId="replays-archive-nascar" />)}
          </div>
        </section>

        <div className="relative mb-3 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search leagues, teams, broadcasters" data-testid="replays-search-input"
            className="w-full h-11 pl-10 pr-4 rounded-full bg-white/5 border border-white/10 text-base sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
          {[['', data.items.length], ...tabs].map(([k, n]) => (
            <button key={k || 'all'} onClick={() => setSport(k)} data-testid={`replays-tab-${k || 'all'}`}
              className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-semibold border transition-colors ${sport === k ? 'bg-[#7c83ff] border-[#7c83ff] text-white' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}>
              {k || 'All'} <span className="opacity-60 text-xs ml-0.5">{n}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-7 h-7 animate-spin text-zinc-500" /></div>
        ) : error ? (
          <div className="py-16 text-center text-sm text-red-300" data-testid="replays-error">Could not load replays right now. Please try again later.</div>
        ) : shown.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500" data-testid="replays-empty">No channels match your search.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2" data-testid="replays-grid">
            {shown.map((it, i) => <ReplayCard key={it.id} it={it} testId={`replays-card-${i}`} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
