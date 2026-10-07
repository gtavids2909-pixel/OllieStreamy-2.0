import React from 'react';
import { Server, ExternalLink, SkipForward } from 'lucide-react';

const dot = (alive) => (alive === true ? 'bg-green-400' : alive === false ? 'bg-red-400/70' : 'bg-zinc-500');

export default function ServerPicker({ streams, idx, onPick, onNext }) {
  return (
    <div className="p-4" data-testid="livetv-server-picker">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <div className="text-xs uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Server className="w-3.5 h-3.5" /> Server {idx + 1} of {streams.length}
        </div>
        {streams.length > 1 && (
          <button onClick={onNext} data-testid="livetv-next-server-btn"
            className="ml-auto h-8 px-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold inline-flex items-center gap-1.5">
            <SkipForward className="w-3.5 h-3.5" /> Next server
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {streams.map((s, i) => (
          <div key={s.url + i} className={`flex items-stretch rounded-md overflow-hidden border ${idx === i ? 'border-[#7c83ff] ring-2 ring-[#7c83ff]/30' : 'border-white/10'}`}>
            <button
              onClick={() => onPick(i)}
              data-testid={`livetv-server-${i}`}
              aria-current={idx === i}
              className={`px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-1.5 ${idx === i ? 'bg-[#7c83ff] text-white' : 'bg-white/5 text-zinc-200 hover:bg-white/10'}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${dot(s.alive)}`} />
              {s.label || s.quality || `Mirror ${i + 1}`}
              {idx === i && <span className="text-[10px] font-bold uppercase opacity-80">· playing</span>}
            </button>
            <a href={s.url} target="_blank" rel="noreferrer" title="Open stream URL"
              className={`px-2 flex items-center justify-center border-l border-white/10 ${idx === i ? 'bg-[#7c83ff] text-white hover:bg-[#9097ff]' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
