import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Clapperboard, Loader2 } from 'lucide-react';
import ChannelCard from './ChannelCard';
import Fixtures from './Fixtures';
import CuratedSports from './CuratedSports';
import { j } from '../../lib/livetv';

export const SPORTS = ['Football', 'Basketball', 'American Football', 'Baseball', 'Hockey', 'Cricket', 'Motorsport', 'Combat', 'Tennis', 'Rugby', 'Golf', 'Other'];

export default function SportsHub({ tick, status, counts, sport, setSport, onPick, activeId }) {
  const [state, setState] = useState({ loading: true, items: [], total: 0 });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    const qs = new URLSearchParams({ status, page_size: '60' });
    if (sport) qs.set('sport', sport); else qs.set('pcat', 'Sports');
    j(`/livetv/channels?${qs}`)
      .then((d) => !cancelled && setState({ loading: false, items: d.items || [], total: d.total || 0 }))
      .catch(() => !cancelled && setState({ loading: false, items: [], total: 0 }));
    return () => { cancelled = true; };
  }, [status, sport, tick]);

  const jump = (s) => {
    setSport(s);
    setTimeout(() => document.getElementById('sports-channels')?.scrollIntoView({ block: 'start' }), 50);
  };

  return (
    <div data-testid="sports-hub">
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }} data-testid="sport-chips">
        {['', ...SPORTS].map((s) => (
          <button key={s || 'all'} onClick={() => setSport(s)} data-testid={`sport-chip-${(s || 'all').toLowerCase().replace(/\s+/g, '-')}`}
            className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-semibold border transition-colors ${sport === s ? 'bg-[#7c83ff] border-[#7c83ff] text-white' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}>
            {s || 'All sports'}{s && counts?.[s] != null && <span className="opacity-60 text-xs ml-1">{counts[s]}</span>}
          </button>
        ))}
      </div>

      <Fixtures onChannels={jump} />

      <section id="sports-channels" className="mb-6 scroll-mt-24">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-[#7c83ff]" />
          <h2 className="text-base md:text-lg font-bold">{sport || 'Sports'} channels</h2>
          <span className="text-xs text-zinc-500" data-testid="sports-channels-total">{state.total}</span>
          <Link to="/replays" data-testid="sports-replays-link" className="ml-auto inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10">
            <Clapperboard className="w-3.5 h-3.5" /> Replays
          </Link>
        </div>
        {state.loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>
        ) : state.items.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-500 rounded-2xl bg-[#101018] border border-white/5" data-testid="sports-channels-empty">No {sport.toLowerCase() || 'sports'} channels in this view. Try the "All" tab.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2" data-testid="sports-channels-grid">
            {state.items.map((ch) => <ChannelCard key={ch.id} ch={ch} active={activeId === ch.id} onPick={(c) => onPick(c, state.items)} testPrefix="sports-channel" />)}
          </div>
        )}
      </section>

      <div className="mt-8"><CuratedSports /></div>
    </div>
  );
}
