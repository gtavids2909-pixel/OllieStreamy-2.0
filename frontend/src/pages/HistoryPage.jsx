import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MediaCard from '../components/MediaCard';
import { History, Trash2 } from 'lucide-react';
import { IMG } from '../lib/tmdb';

export default function HistoryPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem('fs_watch_history') || '[]'));
    } catch {
      setItems([]);
    }
  }, []);

  const clearAll = () => {
    localStorage.removeItem('fs_watch_history');
    setItems([]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-24 pb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <History className="w-7 h-7 text-[#7c83ff]" />
            <h1 className="text-3xl font-black">Watch History</h1>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-zinc-200 hover:bg-white/10 text-sm"
            >
              <Trash2 className="w-4 h-4" /> Clear History
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 text-zinc-400">
            Nothing here yet. Start watching to build your history.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {items.map((it) => (
              <MediaCard key={`${it.type}-${it.id}`} item={it} type={it.type} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
