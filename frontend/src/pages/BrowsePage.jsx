import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MediaCard from '../components/MediaCard';
import { tmdb } from '../lib/tmdb';
import { Loader2 } from 'lucide-react';

export default function BrowsePage({ type = 'movie', title = 'Movies' }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState('all');
  const [sort, setSort] = useState('popularity.desc');
  const [genres, setGenres] = useState([]);
  const [params] = useSearchParams();
  const trending = params.get('trending') === '1';

  useEffect(() => {
    (async () => {
      try {
        const g = type === 'tv' ? await tmdb.genresTv() : await tmdb.genresMovie();
        setGenres(g.genres || []);
      } catch {}
    })();
  }, [type]);

  const load = useCallback(
    async (p, reset = false) => {
      setLoading(true);
      try {
        let data;
        if (trending) {
          data = await tmdb.trending('week');
          data.results = (data.results || []).filter((x) =>
            type === 'tv' ? x.media_type === 'tv' : x.media_type === 'movie'
          );
        } else {
          const opts = { sort_by: sort, page: p };
          if (genre !== 'all') opts.with_genres = genre;
          data = type === 'tv' ? await tmdb.discoverTv(opts) : await tmdb.discoverMovies(opts);
        }
        setItems((prev) => (reset ? data.results || [] : [...prev, ...(data.results || [])]));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    },
    [type, genre, sort, trending]
  );

  useEffect(() => {
    setPage(1);
    load(1, true);
  }, [genre, sort, type, trending, load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-24 pb-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">{title}</h1>
            <p className="text-zinc-400 text-sm mt-1">
              Browse and discover {type === 'tv' ? 'TV shows' : 'movies'} powered by TMDB
            </p>
          </div>
          {!trending && (
            <div className="flex flex-wrap gap-2">
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"
              >
                <option value="all" className="bg-[#101018]">All Genres</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id} className="bg-[#101018]">
                    {g.name}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white"
              >
                <option value="popularity.desc" className="bg-[#101018]">Popularity ↓</option>
                <option value="vote_average.desc" className="bg-[#101018]">Rating ↓</option>
                <option value="primary_release_date.desc" className="bg-[#101018]">Newest</option>
                <option value="revenue.desc" className="bg-[#101018]">Revenue ↓</option>
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((it) => (
            <MediaCard
              key={`${it.media_type || type}-${it.id}`}
              item={it}
              type={it.media_type || type}
            />
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          {!trending && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-6 py-3 rounded-lg bg-[#7c83ff] hover:bg-[#9097ff] text-white font-semibold inline-flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Load More
            </button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
