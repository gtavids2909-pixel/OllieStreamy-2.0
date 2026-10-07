import React, { useEffect, useState } from 'react';
import { Flame, TrendingUp, Film, Tv, Star, Clock, Swords, Smile } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import Row from '../components/Row';
import { tmdb } from '../lib/tmdb';

export default function HomePage() {
  const [trending, setTrending] = useState([]);
  const [popularMovies, setPopularMovies] = useState([]);
  const [popularTv, setPopularTv] = useState([]);
  const [topMovies, setTopMovies] = useState([]);
  const [topTv, setTopTv] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [action, setAction] = useState([]);
  const [comedyTv, setComedyTv] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [a, b, c, d, e, f, g, h] = await Promise.all([
          tmdb.trending('week'),
          tmdb.popularMovies(),
          tmdb.popularTv(),
          tmdb.topRatedMovies(),
          tmdb.topRatedTv(),
          tmdb.upcoming(),
          tmdb.discoverMovies({ with_genres: 28, sort_by: 'popularity.desc' }),
          tmdb.discoverTv({ with_genres: 35, sort_by: 'popularity.desc' }),
        ]);
        setTrending(a.results || []);
        setPopularMovies(b.results || []);
        setPopularTv(c.results || []);
        setTopMovies(d.results || []);
        setTopTv(e.results || []);
        setUpcoming(f.results || []);
        setAction(g.results || []);
        setComedyTv(h.results || []);
      } catch (err) {
        console.error('Home load error', err);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <Hero items={trending} />
      <main className="max-w-[1600px] mx-auto -mt-12 relative z-10">
        <Row title="Trending Now" items={trending} icon={Flame} />
        <Row title="Popular Movies" items={popularMovies} type="movie" icon={Film} />
        <Row title="Popular TV Shows" items={popularTv} type="tv" icon={Tv} />
        <Row title="Top Rated Movies" items={topMovies} type="movie" icon={Star} />
        <Row title="Top Rated TV Shows" items={topTv} type="tv" icon={Star} />
        <Row title="Upcoming Movies" items={upcoming} type="movie" icon={Clock} />
        <Row title="Action Movies" items={action} type="movie" icon={Swords} />
        <Row title="Comedy Series" items={comedyTv} type="tv" icon={Smile} />
      </main>
      <Footer />
    </div>
  );
}
