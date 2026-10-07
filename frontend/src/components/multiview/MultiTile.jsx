import React, { useEffect, useState } from 'react';
import { X, Volume2, VolumeX, Loader2, AlertTriangle } from 'lucide-react';
import HlsVideo from '../HlsVideo';
import { j, proxyFull } from '../../lib/livetv';

export default function MultiTile({ id, index, active, onActivate, onRemove }) {
  const [ch, setCh] = useState(null);
  const [error, setError] = useState(false);
  const [serverIdx, setServerIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCh(null);
    setError(false);
    setServerIdx(0);
    j(`/livetv/channel/${encodeURIComponent(id)}`)
      .then((d) => !cancelled && setCh(d))
      .catch(() => !cancelled && setError(true));
    return () => { cancelled = true; };
  }, [id]);

  const stream = ch?.streams?.[serverIdx];

  return (
    <div
      data-testid={`multiview-tile-${index}`}
      onClick={onActivate}
      className={`group relative rounded-xl overflow-hidden bg-black border-2 cursor-pointer transition-colors ${
        active ? 'border-[#7c83ff] shadow-lg shadow-[#7c83ff]/20' : 'border-white/5 hover:border-white/20'
      }`}
    >
      {stream ? (
        <HlsVideo
          key={`${id}-${serverIdx}`}
          url={proxyFull(stream.proxy_url)}
          muted={!active}
          controls={false}
          enhanced={active}
          testId={`multiview-video-${index}`}
          onFatal={() => setServerIdx((i) => (i + 1 < (ch.streams?.length || 0) ? i + 1 : i))}
        />
      ) : (
        <div className="aspect-video flex flex-col items-center justify-center gap-2 text-sm text-zinc-400">
          {error || (ch && !ch.streams?.length) ? (
            <><AlertTriangle className="w-5 h-5 text-amber-400" /> Channel unavailable</>
          ) : (
            <Loader2 className="w-7 h-7 animate-spin text-white/60" />
          )}
        </div>
      )}
      <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-2 bg-gradient-to-b from-black/80 to-transparent">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${active ? 'bg-[#7c83ff] text-white' : 'bg-black/60 text-zinc-300'}`} data-testid={`multiview-audio-${index}`}>
          {active ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </span>
        <span className="text-xs font-semibold text-white truncate flex-1" data-testid={`multiview-tile-name-${index}`}>
          {ch ? `${ch.country_flag || ''} ${ch.name}` : 'Loading…'}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove channel"
          data-testid={`multiview-remove-${index}`}
          className="w-8 h-8 rounded-full bg-black/60 hover:bg-red-500/80 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {!active && stream && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] px-2 py-1 rounded-full bg-black/70 text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Tap for audio
        </div>
      )}
    </div>
  );
}
