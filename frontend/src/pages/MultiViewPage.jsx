import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { LayoutGrid, Plus, Share2, Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import MultiTile from '../components/multiview/MultiTile';
import AddChannelDialog from '../components/multiview/AddChannelDialog';

const KEY = 'os_multiview';
const MAX = 4;

const initialIds = (params) => {
  const fromUrl = (params.get('c') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (fromUrl.length) return [...new Set(fromUrl)].slice(0, MAX);
  try { return (JSON.parse(localStorage.getItem(KEY) || '[]') || []).slice(0, MAX); } catch { return []; }
};

export default function MultiViewPage() {
  const [params, setParams] = useSearchParams();
  const [ids, setIds] = useState(() => initialIds(params));
  const [audio, setAudio] = useState(0);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (_e) { /* ignore */ }
    setParams(ids.length ? { c: ids.join(',') } : {}, { replace: true });
  }, [ids, setParams]);

  const add = (id) => {
    setIds((cur) => (cur.includes(id) || cur.length >= MAX ? cur : [...cur, id]));
    setAdding(false);
  };
  const remove = (i) => {
    setIds((cur) => cur.filter((_, k) => k !== i));
    setAudio((a) => (a === i ? 0 : a > i ? a - 1 : a));
  };
  const closeAdd = useCallback(() => setAdding(false), []);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'OllieStreamy Multi-View', url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    } catch (_e) { /* cancelled */ }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 lg:px-8 pt-24 pb-14">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <LayoutGrid className="w-7 h-7 text-[#7c83ff]" />
          <h1 className="text-3xl md:text-4xl font-black tracking-tight" data-testid="multiview-title">Multi-View</h1>
          <span className="text-xs text-zinc-400 tabular-nums" data-testid="multiview-count">{ids.length} / {MAX}</span>
        </div>
        <p className="text-zinc-400 text-sm mb-5">Watch up to four live channels at once. Tap a tile to move the sound to it.</p>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setAdding(true)}
            disabled={ids.length >= MAX}
            data-testid="multiview-add-btn"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#7c83ff] hover:bg-[#9097ff] text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add channel
          </button>
          {ids.length > 0 && (
            <button onClick={share} data-testid="multiview-share-btn" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />} {copied ? 'Link copied' : 'Share'}
            </button>
          )}
        </div>

        {ids.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#101018] py-16 px-6 text-center" data-testid="multiview-empty">
            <LayoutGrid className="w-10 h-10 mx-auto text-[#7c83ff]/60 mb-3" />
            <div className="font-semibold mb-1">No channels yet</div>
            <div className="text-sm text-zinc-400 mb-5">Add a channel to start your wall, or browse <Link to="/livetv" className="text-[#a8aeff] hover:text-white">Live TV</Link>.</div>
            <button onClick={() => setAdding(true)} data-testid="multiview-empty-add-btn" className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#7c83ff] hover:bg-[#9097ff] text-white text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add your first channel
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" data-testid="multiview-grid">
            {ids.map((id, i) => (
              <MultiTile key={id} id={id} index={i} active={audio === i} onActivate={() => setAudio(i)} onRemove={() => remove(i)} />
            ))}
          </div>
        )}
      </main>
      <Footer />
      <AddChannelDialog open={adding} onClose={closeAdd} onPick={add} exclude={ids} />
    </div>
  );
}
