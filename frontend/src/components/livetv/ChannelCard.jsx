import React from 'react';
import { Radio } from 'lucide-react';
import FavButton from './FavButton';
import LogoTile from '../LogoTile';

export const HdBadge = ({ testId }) => (
  <span data-testid={testId} className="shrink-0 px-1 py-px rounded text-[9px] font-black tracking-wide bg-[#7c83ff]/20 text-[#c3c7ff] border border-[#7c83ff]/30">
    HD
  </span>
);

export default function ChannelCard({ ch, active, onPick, testPrefix = 'livetv-channel', className = '' }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`${testPrefix}-${ch.id}`}
      onClick={() => onPick(ch)}
      onKeyDown={(e) => e.key === 'Enter' && onPick(ch)}
      className={`flex items-center gap-3 p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${className} ${
        active ? 'bg-[#7c83ff]/15 border-[#7c83ff]/40' : 'bg-[#0d0d14] border-white/5 hover:border-[#7c83ff]/30 hover:bg-white/5'
      }`}
    >
      <LogoTile src={ch.logo} name={ch.name} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white flex items-center gap-1.5 min-w-0">
          <span className="truncate">{ch.name}</span>
          {ch.hd && <HdBadge testId={`${testPrefix}-hd-${ch.id}`} />}
        </div>
        <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 truncate">
          <Radio className={`w-2.5 h-2.5 shrink-0 ${ch.offline ? 'text-amber-400' : ch.alive_count ? 'text-green-400' : 'text-zinc-400'}`} />
          <span className="truncate">
            {ch.offline
              ? 'Off-air · checks every 15 min'
              : ch.alive_count ? `${ch.alive_count} live` : ch.stream_count ? `${ch.stream_count} server${ch.stream_count === 1 ? '' : 's'}` : `${ch.country_flag || ''} ${ch.country || ''}`}
            {ch.categories?.length ? ` · ${ch.categories.slice(0, 2).join(', ')}` : ''}
          </span>
        </div>
      </div>
      <FavButton channel={ch} testId={`${testPrefix}-fav-${ch.id}`} />
    </div>
  );
}
