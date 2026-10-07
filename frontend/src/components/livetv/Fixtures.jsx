import React, { useEffect, useState } from 'react';
import { CalendarDays, Loader2, Tv } from 'lucide-react';
import { j } from '../../lib/livetv';
import { initials } from '../LogoTile';

const FIX_SPORTS = [
  ['Soccer', 'Football'], ['Basketball', 'Basketball'], ['American Football', 'American Football'], ['Baseball', 'Baseball'],
  ['Ice Hockey', 'Hockey'], ['Cricket', 'Cricket'], ['Motorsport', 'Motorsport'], ['Fighting', 'Combat'],
];

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Badge = ({ src, name }) => {
  const [bad, setBad] = useState(false);
  return src && !bad
    ? <img src={src} alt="" loading="lazy" onError={() => setBad(true)} className="w-8 h-8 object-contain shrink-0" />
    : <span className="w-8 h-8 shrink-0 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-[#a8aeff]">{initials(name)}</span>;
};

const kickoff = (e) => {
  if (!e.timestamp) return e.time ? e.time.slice(0, 5) : '';
  const d = new Date(`${e.timestamp}${/Z|[+-]\d\d:?\d\d$/.test(e.timestamp) ? '' : 'Z'}`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const statusOf = (s = '') => {
  const v = s.toUpperCase();
  if (['FT', 'AET', 'PEN', 'MATCH FINISHED', 'FINISHED', 'AOT'].includes(v)) return { label: 'FT', cls: 'bg-white/10 text-zinc-300' };
  if (['1H', '2H', 'HT', 'ET', 'LIVE', 'IN PROGRESS', 'Q1', 'Q2', 'Q3', 'Q4', 'OT', 'BT', 'P'].includes(v)) return { label: v === 'HT' ? 'HT' : 'LIVE', cls: 'bg-red-500/20 text-red-300' };
  if (['PST', 'CANC', 'POSTPONED', 'CANCELLED', 'ABD'].includes(v)) return { label: 'OFF', cls: 'bg-amber-500/15 text-amber-300' };
  return null;
};

export default function Fixtures({ onChannels }) {
  const [sport, setSport] = useState('Soccer');
  const [state, setState] = useState({ loading: true, events: [], error: false });

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, events: [], error: false });
    j(`/sports/fixtures?sport=${encodeURIComponent(sport)}&date=${todayISO()}`)
      .then((d) => !cancelled && setState({ loading: false, events: d.events || [], error: false }))
      .catch(() => !cancelled && setState({ loading: false, events: [], error: true }));
    return () => { cancelled = true; };
  }, [sport]);

  const chip = FIX_SPORTS.find(([k]) => k === sport)[1];
  return (
    <section className="mb-6" data-testid="fixtures-section">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="w-4 h-4 text-[#7c83ff]" />
        <h2 className="text-base md:text-lg font-bold">Today's fixtures</h2>
        <span className="text-[11px] text-zinc-500">via TheSportsDB</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
        {FIX_SPORTS.map(([k, label]) => (
          <button key={k} onClick={() => setSport(k)} data-testid={`fixtures-sport-${label.toLowerCase().replace(/\s+/g, '-')}`}
            className={`shrink-0 h-8 px-3 rounded-full text-xs font-semibold border transition-colors ${sport === k ? 'bg-[#7c83ff] border-[#7c83ff] text-white' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl bg-[#101018] border border-white/5 divide-y divide-white/5 max-h-[460px] overflow-y-auto" data-testid="fixtures-list">
        {state.loading && <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-500" /></div>}
        {!state.loading && state.error && <div className="py-8 text-center text-sm text-red-300" data-testid="fixtures-error">Fixtures are unavailable right now.</div>}
        {!state.loading && !state.error && !state.events.length && <div className="py-8 text-center text-sm text-zinc-500" data-testid="fixtures-empty">No {chip.toLowerCase()} fixtures listed for today.</div>}
        {state.events.map((e) => {
          const st = statusOf(e.status);
          const hasTeams = e.home && e.away;
          return (
            <div key={e.id} className="p-3" data-testid={`fixture-${e.id}`}>
              <div className="flex items-center gap-2 text-[11px] text-zinc-500 mb-2">
                <span className="truncate flex-1">{e.league}</span>
                {st && <span className={`px-1.5 py-0.5 rounded font-bold ${st.cls}`} data-testid={`fixture-status-${e.id}`}>{st.label}</span>}
                <span className="tabular-nums text-zinc-300">{kickoff(e)}</span>
              </div>
              {hasTeams ? (
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="flex items-center gap-2 min-w-0"><Badge src={e.home_badge} name={e.home} /><span className="text-sm font-semibold truncate">{e.home}</span></div>
                  <span className="text-sm font-black tabular-nums text-zinc-300 px-1">{e.home_score != null && e.away_score != null ? `${e.home_score} – ${e.away_score}` : 'vs'}</span>
                  <div className="flex items-center gap-2 min-w-0 justify-end"><span className="text-sm font-semibold truncate text-right">{e.away}</span><Badge src={e.away_badge} name={e.away} /></div>
                </div>
              ) : <div className="text-sm font-semibold">{e.event}</div>}
              <button onClick={() => onChannels(chip)} data-testid={`fixture-channels-${e.id}`} className="mt-2 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-zinc-300 hover:bg-white/10">
                <Tv className="w-3 h-3" /> Channels
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
