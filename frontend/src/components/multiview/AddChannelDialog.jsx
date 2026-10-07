import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Loader2, Plus } from 'lucide-react';
import { j, fallbackLogo } from '../../lib/livetv';
import { HdBadge } from '../livetv/ChannelCard';

export default function AddChannelDialog({ open, onClose, onPick, exclude }) {
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: false, items: [], error: false });
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setTimeout(() => inputRef.current?.focus(), 30);
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ page_size: '30' });
        if (q.trim()) qs.set('q', q.trim());
        const d = await j(`/livetv/channels?${qs}`);
        if (!cancelled) setState({ loading: false, items: d.items || [], error: false });
      } catch (_e) {
        if (!cancelled) setState({ loading: false, items: [], error: true });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-start sm:pt-24 justify-center" onClick={onClose} data-testid="multiview-add-dialog">
      <div className="w-full sm:max-w-lg bg-[#101018] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-3 border-b border-white/5">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search live channels…"
            data-testid="multiview-search-input"
            className="flex-1 bg-transparent text-base text-white placeholder:text-zinc-500 focus:outline-none h-9"
          />
          <button onClick={onClose} aria-label="Close" data-testid="multiview-add-close" className="p-2 text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto p-2">
          {state.loading && <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>}
          {!state.loading && state.error && <div className="py-8 text-center text-sm text-red-300">Could not load channels. Try again.</div>}
          {!state.loading && !state.error && state.items.length === 0 && <div className="py-8 text-center text-sm text-zinc-500">No channels match “{q}”.</div>}
          {!state.loading && state.items.map((ch) => {
            const taken = exclude.includes(ch.id);
            return (
              <button
                key={ch.id}
                disabled={taken}
                onClick={() => onPick(ch.id)}
                data-testid={`multiview-result-${ch.id}`}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 text-left disabled:opacity-40"
              >
                <img src={ch.logo || fallbackLogo(ch.name)} onError={(e) => { e.currentTarget.src = fallbackLogo(ch.name); }} alt="" className="w-9 h-9 rounded object-contain bg-white/5 border border-white/10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white flex items-center gap-1.5"><span className="truncate">{ch.name}</span>{ch.hd && <HdBadge />}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{ch.country_flag} {ch.country_name || ch.country} · {ch.alive_count} live</div>
                </div>
                {taken ? <span className="text-[11px] text-zinc-500">Added</span> : <Plus className="w-4 h-4 text-[#a8aeff]" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
