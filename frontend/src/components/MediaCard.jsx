import React from 'react';
import { Link } from 'react-router-dom';
import { Star, Calendar, Info } from 'lucide-react';
import { IMG } from '../lib/tmdb';

export default function MediaCard({ item, type }) {
  // The item's own media_type from TMDB is authoritative; the row's `type` is only a fallback
  const mediaType =
    item.media_type ||
    type ||
    (item.first_air_date || item.name || item.number_of_seasons ? 'tv' : 'movie');
  const title = item.title || item.name;
  const date = item.release_date || item.first_air_date || '';
  const year = date ? date.slice(0, 4) : '';
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const poster = item.poster_path || item.backdrop_path;

  return (
    <Link
      to={`/${mediaType}/${item.id}`}
      className="group relative shrink-0 w-[170px] sm:w-[180px] rounded-xl overflow-hidden bg-[#15151f] border border-white/5 hover:border-[#7c83ff]/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#7c83ff]/10"
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-[#0d0d14]">
        {poster ? (
          <img
            src={IMG(poster, 'w342')}
            alt={title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs px-2 text-center">
            {title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
          <p className="text-xs text-zinc-200 line-clamp-4">{item.overview}</p>
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur text-[10px] uppercase tracking-wide text-zinc-100 font-semibold">
          {mediaType === 'tv' ? 'TV' : 'Movie'}
        </div>
        {rating && (
          <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur flex items-center gap-1 text-[11px] font-semibold text-amber-400">
            <Star className="w-3 h-3 fill-amber-400" />
            {rating}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white line-clamp-1">{title}</h3>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {year || 'TBA'}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[#7c83ff]">
            <Info className="w-3 h-3" /> Details
          </span>
        </div>
      </div>
    </Link>
  );
}
