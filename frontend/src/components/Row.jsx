import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MediaCard from './MediaCard';

export default function Row({ title, items, type, icon: Icon }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    const el = ref.current;
    el?.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el?.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [items]);

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.85), behavior: 'smooth' });
  };

  if (!items?.length) return null;

  return (
    <section className="relative px-4 lg:px-8 py-6 group/row">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-[#7c83ff]" />}
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">{title}</h2>
        <div className="ml-2 h-[2px] flex-1 bg-gradient-to-r from-[#7c83ff]/40 to-transparent" />
      </div>
      <div className="relative">
        {canLeft && (
          <button
            onClick={() => scroll(-1)}
            className="hidden md:flex absolute left-0 top-0 bottom-0 z-20 items-center justify-center w-12 bg-gradient-to-r from-[#0a0a0f] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <span className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-[#7c83ff]/40">
              <ChevronLeft className="w-5 h-5" />
            </span>
          </button>
        )}
        {canRight && (
          <button
            onClick={() => scroll(1)}
            className="hidden md:flex absolute right-0 top-0 bottom-0 z-20 items-center justify-center w-12 bg-gradient-to-l from-[#0a0a0f] to-transparent opacity-0 group-hover/row:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <span className="w-9 h-9 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-[#7c83ff]/40">
              <ChevronRight className="w-5 h-5" />
            </span>
          </button>
        )}
        <div
          ref={ref}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {items.map((it) => (
            <div key={`${type || it.media_type || 'm'}-${it.id}`} className="snap-start">
              <MediaCard item={it} type={type} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
