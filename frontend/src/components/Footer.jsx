import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-[#070710]">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2">
          <div className="flex items-center gap-1 mb-3">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-[#7c83ff] to-[#a78bff] bg-clip-text text-transparent">
              Ollie
            </span>
            <span className="text-2xl font-extrabold text-white">Streamy</span>
          </div>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed">
            OllieStreamy lets you watch movies and TV shows online in high quality. Fast streaming,
            clean UI, and a smooth playback experience.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Browse</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><Link to="/movies" className="hover:text-white">Movies</Link></li>
            <li><Link to="/tv" className="hover:text-white">TV Shows</Link></li>
            <li><Link to="/trending" className="hover:text-white">Trending</Link></li>
            <li><Link to="/replays" data-testid="footer-link-replays" className="hover:text-white">Replays</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Company</h4>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li><Link to="/about" data-testid="footer-link-about" className="hover:text-white">About</Link></li>
            <li><Link to="/contact" data-testid="footer-link-contact" className="hover:text-white">Contact</Link></li>
            <li><Link to="/privacy" data-testid="footer-link-privacy" className="hover:text-white">Privacy</Link></li>
            <li><Link to="/terms" data-testid="footer-link-terms" className="hover:text-white">Terms</Link></li>
            <li><Link to="/dmca" data-testid="footer-link-dmca" className="hover:text-white">DMCA</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} OllieStreamy. Data provided by TMDB.
      </div>
    </footer>
  );
}
