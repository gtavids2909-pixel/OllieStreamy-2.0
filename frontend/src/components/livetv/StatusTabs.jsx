import React from 'react';
import { Radio, Trophy, Tv } from 'lucide-react';

export const PRIMARY_CATEGORIES = ['News', 'Sports', 'Movies', 'Series/Entertainment', 'Kids', 'Music', 'Documentary',
  'Lifestyle/Cooking', 'Religious', 'Education', 'Business', 'Weather', 'Shopping', 'General', 'Other'];

const STATUS = [
  ['live', 'Live now'],
  ['offline', 'Off-air / scheduled'],
  ['all', 'All'],
];

export default function StatusTabs({ tab, setTab, status, setStatus, counts }) {
  return (
    <div className="mb-5 space-y-3">
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-full sm:w-fit" role="tablist" data-testid="livetv-main-tabs">
        {[['channels', 'Channels', Tv], ['sports', 'Sports', Trophy]].map(([k, label, Icon]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} data-testid={`livetv-tab-${k}`}
            className={`flex-1 sm:flex-none h-10 px-5 rounded-lg text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors ${tab === k ? 'bg-[#7c83ff] text-white' : 'text-zinc-300 hover:bg-white/5'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }} role="tablist" data-testid="livetv-status-tabs">
        {STATUS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={status === k} onClick={() => setStatus(k)} data-testid={`livetv-status-${k}`}
            className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-semibold border inline-flex items-center gap-1.5 transition-colors ${
              status === k ? 'bg-white text-[#0a0a0f] border-white' : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10'}`}>
            {k === 'live' && <Radio className={`w-3.5 h-3.5 ${status === k ? 'text-red-500' : 'text-red-400'}`} />}
            {label}
            <span className="text-xs opacity-60 tabular-nums" data-testid={`livetv-status-count-${k}`}>{counts?.[k] != null ? counts[k].toLocaleString() : '…'}</span>
          </button>
        ))}
      </div>
      {status === 'offline' && (
        <p className="text-xs text-zinc-500">Off-air channels are re-checked every 15 minutes and when you open them — they move to "Live now" as soon as a stream works.</p>
      )}
    </div>
  );
}
