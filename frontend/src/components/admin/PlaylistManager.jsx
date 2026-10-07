import React, { useCallback, useEffect, useState } from 'react';
import { ListPlus, Trash2, RefreshCw, Loader2 } from 'lucide-react';

export default function PlaylistManager({ call, onSynced }) {
  const [items, setItems] = useState([]);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setItems((await call('/admin/playlists')).items || []); } catch (e) { setMsg(e.message); }
  }, [call]);
  useEffect(() => { load(); }, [load]);

  const add = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy('add'); setMsg('');
    try { await call('/admin/playlists', { method: 'POST', body: JSON.stringify({ url: url.trim() }) }); setUrl(''); await load(); } catch (e2) { setMsg(e2.message); } finally { setBusy(''); }
  };
  const remove = async (u) => {
    setBusy(u);
    try { await call(`/admin/playlists?url=${encodeURIComponent(u)}`, { method: 'DELETE' }); await load(); } catch (e) { setMsg(e.message); } finally { setBusy(''); }
  };
  const syncNow = async () => {
    setBusy('sync'); setMsg('');
    try { await call('/admin/sync', { method: 'POST' }); setMsg('Sync started — results appear here in about a minute.'); onSynced?.(); } catch (e) { setMsg(e.message); } finally { setBusy(''); }
  };

  return (
    <section className="rounded-2xl bg-[#101018] border border-white/5 p-4" data-testid="admin-playlists-manager">
      <div className="flex items-center gap-2 mb-3">
        <ListPlus className="w-4 h-4 text-[#7c83ff]" />
        <div className="font-semibold">Extra .m3u playlists</div>
        <button onClick={syncNow} disabled={!!busy} data-testid="admin-playlists-sync-btn" className="ml-auto h-8 px-3 rounded-full bg-[#7c83ff] hover:bg-[#9097ff] text-white text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy === 'sync' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Sync now
        </button>
      </div>
      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 mb-3">
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/playlist.m3u" data-testid="admin-playlist-url-input"
          className="flex-1 h-10 px-4 rounded-full bg-white/5 border border-white/10 text-base sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60" />
        <button disabled={!url.trim() || !!busy} data-testid="admin-playlist-add-btn" className="h-10 px-5 rounded-full bg-white/10 hover:bg-white/15 text-sm font-semibold disabled:opacity-40">Add</button>
      </form>
      {items.length === 0 ? (
        <div className="text-sm text-zinc-500" data-testid="admin-playlists-empty">No extra playlists yet. The 5 defaults and $LIVETV_EXTRA_M3U are always included.</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it) => {
            const r = it.last_result;
            return (
              <li key={it.url} className="flex items-center gap-2 text-xs min-w-0" data-testid="admin-playlist-item">
                <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold ${!r ? 'bg-white/10 text-zinc-400' : r.ok ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300'}`}>
                  {!r ? 'NOT SYNCED' : r.ok ? `${r.entries} entries` : 'ERROR'}
                </span>
                <span className="truncate text-zinc-300 flex-1" title={r?.error || ''}>{it.url}</span>
                <button onClick={() => remove(it.url)} disabled={busy === it.url} aria-label="Remove playlist" data-testid="admin-playlist-remove-btn" className="shrink-0 w-8 h-8 rounded-full hover:bg-red-500/20 text-zinc-400 hover:text-red-300 inline-flex items-center justify-center">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {msg && <div className="mt-2 text-xs text-[#c3c7ff]" data-testid="admin-playlists-msg">{msg}</div>}
    </section>
  );
}
