import React from 'react';
import ChannelCard from './ChannelCard';

export default function ChannelStrip({ title, icon: Icon, items, onPick, activeId, testId, action }) {
  if (!items?.length) return null;
  return (
    <section className="mb-5" data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-[#7c83ff]" />}
        <h2 className="text-base md:text-lg font-bold">{title}</h2>
        <span className="text-xs text-zinc-500">{items.length}</span>
        <div className="ml-2 h-[2px] flex-1 bg-gradient-to-r from-[#7c83ff]/40 to-transparent" />
        {action}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 snap-x scroll-px-4 lg:scroll-px-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: 'none' }}>
        {items.map((ch) => (
          <ChannelCard
            key={ch.id}
            ch={ch}
            active={activeId === ch.id}
            onPick={(c) => onPick(c, items)}
            testPrefix={`${testId}-item`}
            className="snap-start shrink-0 w-[250px]"
          />
        ))}
      </div>
    </section>
  );
}
