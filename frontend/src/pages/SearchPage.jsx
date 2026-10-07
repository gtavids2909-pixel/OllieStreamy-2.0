import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MediaCard from '../components/MediaCard';
import { tmdb } from '../lib/tmdb';

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    tmdb
      .search(q)
      .then((d) =>
        setItems(
          (d.results || []).filter(
            (r) => r.media_type !== 'person' && (r.poster_path || r.backdrop_path)
          )
        )
      )
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-24 pb-12">
        <h1 className="text-3xl font-black mb-2">Search Results</h1>
        <p className="text-zinc-400 mb-6">
          {loading ? 'Searching' : `${items.length} results`} for{' '}
          <span className="text-white font-semibold">"{q}"</span>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((it) => (
            <MediaCard
              key={`${it.media_type}-${it.id}`}
              item={it}
              type={it.media_type}
            />
          ))}
        </div>
        {!loading && items.length === 0 && q && (
          <div className="text-center text-zinc-400 py-20">No results found</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
