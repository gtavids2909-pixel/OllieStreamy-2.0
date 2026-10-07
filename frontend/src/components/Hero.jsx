import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info, Star, Calendar } from 'lucide-react';
import { IMG } from '../lib/tmdb';

export default function Hero({ items }) {
  const [idx, setIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!items?.length) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % Math.min(items.length, 5)), 7000);
    return () => clearInterval(t);
  }, [items]);

  if (!items?.length) {
    return <div className="h-[60vh] md:h-[85vh] bg-[#0a0a0f] animate-pulse" />;
  }

  const slides = items.slice(0, 5);
  const current = slides[idx];
  const type = current.media_type || (current.title ? 'movie' : 'tv');
  const title = current.title || current.name;

  return (
    <div className="relative w-full h-[70vh] md:h-[88vh] overflow-hidden">
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            i === idx ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <img
            src={IMG(s.backdrop_path || s.poster_path, 'original')}
            alt=""
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/50 to-transparent" />
        </div>
      ))}

      <div className="absolute inset-0 flex items-end pb-20 md:pb-28">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 w-full">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-1 text-[11px] font-bold tracking-widest uppercase rounded-md bg-[#7c83ff] text-white">
                {type === 'tv' ? 'TV Show' : 'Movie'}
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-black/50 backdrop-blur text-zinc-200">
                <Calendar className="w-3 h-3" />
                {(current.release_date || current.first_air_date || '').slice(0, 4) || 'TBA'}
              </span>
              {current.vote_average ? (
                <span className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-black/50 backdrop-blur text-amber-400 font-semibold">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {current.vote_average.toFixed(1)}
                </span>
              ) : null}
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-4 drop-shadow-2xl">
              {title}
            </h1>
            <p className="text-zinc-200 text-sm md:text-base leading-relaxed line-clamp-3 mb-6 max-w-xl">
              {current.overview}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate(`/${type}/${current.id}?play=1`)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#7c83ff] hover:bg-[#9097ff] text-white font-semibold transition-colors"
              >
                <Play className="w-5 h-5 fill-white" /> Play Now
              </button>
              <button
                onClick={() => navigate(`/${type}/${current.id}`)}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur text-white font-semibold border border-white/10 transition-colors"
              >
                <Info className="w-5 h-5" /> More Info
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? 'w-8 bg-[#7c83ff]' : 'w-4 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
