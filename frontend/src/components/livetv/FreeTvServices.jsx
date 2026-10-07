import React from 'react';
import { ExternalLink, Tv2 } from 'lucide-react';
import LogoTile, { favicon } from '../LogoTile';

const SERVICES = [
  { name: 'Pluto TV', url: 'https://pluto.tv/live-tv' },
  { name: 'Xumo Play', url: 'https://play.xumo.com/networks' },
  { name: 'Samsung TV Plus', url: 'https://www.samsungtvplus.com/' },
  { name: 'Tubi', url: 'https://tubitv.com' },
  { name: 'SHOWROOM', url: 'https://www.showroom-live.com/' },
  { name: 'Famelack', url: 'https://famelack.com/' },
  { name: 'Easy Web TV', url: 'https://zhangboheng.github.io/Easy-Web-TV-M3u8/routes/tv.html' },
];

export default function FreeTvServices() {
  return (
    <section className="mb-6" data-testid="free-tv-services">
      <div className="flex items-center gap-2 mb-2">
        <Tv2 className="w-4 h-4 text-[#7c83ff]" />
        <h2 className="text-base md:text-lg font-bold">Free TV services</h2>
        <div className="ml-2 h-[2px] flex-1 bg-gradient-to-r from-[#7c83ff]/40 to-transparent" />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
        {SERVICES.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            data-testid={`free-tv-${s.name.toLowerCase().replace(/\s+/g, '-')}`}
            className="shrink-0 flex items-center gap-2.5 pl-2 pr-3 py-2 rounded-xl bg-[#0d0d14] border border-white/5 hover:border-[#7c83ff]/40 hover:bg-white/5 transition-colors"
          >
            <LogoTile src={favicon(s.url)} name={s.name} className="w-8 h-8" />
            <span className="text-sm font-semibold whitespace-nowrap">{s.name}</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
          </a>
        ))}
      </div>
    </section>
  );
}
