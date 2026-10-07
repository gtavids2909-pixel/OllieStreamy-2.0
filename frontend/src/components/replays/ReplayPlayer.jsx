import React, { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';

export default function ReplayPlayer({ item, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center sm:p-6" onClick={onClose} data-testid="replay-player">
      <div className="w-full max-w-5xl bg-[#101018] sm:rounded-2xl border border-white/10 overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 sm:px-4 h-12 border-b border-white/5">
          <span className="w-2 h-2 rounded-full bg-[#7c83ff] shrink-0" />
          <div className="text-sm font-semibold truncate flex-1" data-testid="replay-player-title">{item.name}</div>
          <a href={item.url} target="_blank" rel="noopener noreferrer" data-testid="replay-player-open-youtube"
            className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-semibold">
            <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Open on YouTube</span>
          </a>
          <button onClick={onClose} aria-label="Close player" data-testid="replay-player-close" className="shrink-0 w-9 h-9 rounded-full hover:bg-white/10 inline-flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          <iframe
            key={item.embed}
            src={`${item.embed}&autoplay=1&rel=0`}
            title={item.name}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            data-testid="replay-player-iframe"
          />
        </div>
        <div className="px-4 py-3 text-xs text-zinc-400">
          Plays the channel's latest uploads, newest first. Use the playlist icon in the player to pick an older match.
          {item.description ? <span className="block mt-1 text-zinc-500">{item.description}</span> : null}
        </div>
      </div>
    </div>
  );
}
