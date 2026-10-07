import React, { useState } from 'react';

export const favicon = (url) => {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`; } catch { return ''; }
};

export const initials = (name = '') =>
  name.replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

// Real logo when we have one, neutral initials tile otherwise (never a guessed logo).
export default function LogoTile({ src, name, className = 'w-10 h-10', testId }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span data-testid={testId} className={`${className} shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[11px] font-black text-[#a8aeff]`}>
        {initials(name)}
      </span>
    );
  }
  return <img data-testid={testId} src={src} alt="" loading="lazy" onError={() => setBroken(true)} className={`${className} shrink-0 rounded-lg object-contain bg-white/5 border border-white/10 p-1`} />;
}
