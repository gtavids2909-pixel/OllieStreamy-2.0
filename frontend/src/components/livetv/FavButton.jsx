import React from 'react';
import { Star } from 'lucide-react';
import { toggleFav } from '../../lib/livetv';
import useLiveStore from '../../lib/useLiveStore';

export default function FavButton({ channel, testId, size = 'sm' }) {
  const { favs } = useLiveStore();
  const on = favs.some((c) => c.id === channel.id);
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={on}
      aria-label={on ? 'Remove from favourites' : 'Add to favourites'}
      title={on ? 'Remove from favourites' : 'Add to favourites'}
      data-testid={testId}
      onClick={(e) => { e.stopPropagation(); toggleFav(channel); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleFav(channel); } }}
      className={`${dim} shrink-0 inline-flex items-center justify-center rounded-full cursor-pointer transition-[background-color,transform] duration-150 active:scale-90 ${
        on ? 'text-amber-300 bg-amber-400/10 hover:bg-amber-400/20' : 'text-zinc-500 hover:text-white hover:bg-white/10'
      }`}
    >
      <Star className="w-4 h-4" fill={on ? 'currentColor' : 'none'} />
    </span>
  );
}
