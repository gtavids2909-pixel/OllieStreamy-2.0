import React from 'react';

const TONES = {
  default: 'text-white',
  green: 'text-green-400',
  red: 'text-red-400',
  amber: 'text-amber-300',
};

export default function StatCard({ label, value, tone = 'default', sub, testId }) {
  return (
    <div className="rounded-xl bg-[#101018] border border-white/5 p-4" data-testid={testId}>
      <div className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`text-2xl font-black tabular-nums mt-1 ${TONES[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-1 truncate">{sub}</div>}
    </div>
  );
}
