import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, RefreshCw, Activity, LogOut, Loader2, KeyRound, Clapperboard, Tags } from 'lucide-react';
import Navbar from '../components/Navbar';
import StatCard from '../components/admin/StatCard';
import StreamTester from '../components/admin/StreamTester';
import PlaylistManager from '../components/admin/PlaylistManager';
import { API } from '../lib/livetv';

const TOKEN_KEY = 'os_admin_token';

export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [draft, setDraft] = useState('');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  const call = useCallback(async (path, opts = {}, tk = token) => {
    const r = await fetch(`${API}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', 'X-Admin-Token': tk, ...(opts.headers || {}) } });
    if (r.status === 401) throw new Error('Invalid admin token');
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }, [token]);

  const load = useCallback(async (tk = token) => {
    if (!tk) return;
    setError('');
    try {
      setStats(await call('/admin/stats', {}, tk));
      sessionStorage.setItem(TOKEN_KEY, tk);
      setToken(tk);
    } catch (e) {
      setError(e.message);
      if (e.message === 'Invalid admin token') { sessionStorage.removeItem(TOKEN_KEY); setToken(''); setStats(null); }
    }
  }, [call, token]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const action = async (name, path, note) => {
    setBusy(name); setMsg('');
    try { const r = await call(path, { method: 'POST' }); setMsg(typeof note === 'function' ? note(r) : note); } catch (e) { setMsg(e.message); } finally { setBusy(''); }
  };

  const logout = () => { sessionStorage.removeItem(TOKEN_KEY); setToken(''); setStats(null); };

  if (!token || !stats) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Navbar />
        <main className="max-w-sm mx-auto px-4 pt-32">
          <form onSubmit={(e) => { e.preventDefault(); load(draft.trim()); }} className="bg-[#101018] border border-white/5 rounded-2xl p-6" data-testid="admin-login-form">
            <KeyRound className="w-8 h-8 text-[#7c83ff] mb-3" />
            <h1 className="text-xl font-black mb-1">Admin access</h1>
            <p className="text-sm text-zinc-400 mb-4">Enter the admin token to open the dashboard.</p>
            <input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Admin token" data-testid="admin-token-input"
              className="w-full h-11 px-4 rounded-lg bg-white/5 border border-white/10 text-base text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60 mb-3" />
            {error && <div className="text-sm text-red-300 mb-3" data-testid="admin-login-error">{error}</div>}
            <button disabled={!draft.trim()} data-testid="admin-token-submit" className="w-full h-11 rounded-lg bg-[#7c83ff] hover:bg-[#9097ff] text-white font-semibold disabled:opacity-40">Unlock</button>
          </form>
        </main>
      </div>
    );
  }

  const s = stats.streams || {};
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-4 lg:px-8 pt-24 pb-14 space-y-5" data-testid="admin-dashboard">
        <div className="flex items-center gap-3 flex-wrap">
          <ShieldCheck className="w-7 h-7 text-[#7c83ff]" />
          <h1 className="text-3xl font-black tracking-tight">Dev dashboard</h1>
          <button onClick={() => load()} data-testid="admin-refresh-stats" className="ml-auto h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <button onClick={logout} data-testid="admin-logout" className="h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold hover:bg-white/10 inline-flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Lock</button>
        </div>
        {error && <div className="text-sm text-red-300" data-testid="admin-error">{error}</div>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Channels" value={stats.channels.toLocaleString()} sub={`${stats.visible_channels.toLocaleString()} visible`} testId="admin-stat-channels" />
          <StatCard label="Countries" value={stats.countries} testId="admin-stat-countries" />
          <StatCard label="Alive streams" value={(s.alive || 0).toLocaleString()} tone="green" testId="admin-stat-alive" />
          <StatCard label="Dead streams" value={(s.dead || 0).toLocaleString()} tone="red" testId="admin-stat-dead" />
          <StatCard label="Unchecked" value={(s.unchecked || 0).toLocaleString()} tone="amber" testId="admin-stat-unchecked" />
          <StatCard label="Last sync" value={stats.last_sync ? new Date(stats.last_sync).toLocaleTimeString() : '—'} sub={stats.last_sync ? new Date(stats.last_sync).toLocaleDateString() : 'never'} testId="admin-stat-last-sync" />
        </div>
        <section className="rounded-2xl bg-[#101018] border border-white/5 p-4" data-testid="admin-playlists">
          <div className="font-semibold mb-2">Default playlists (last sync)</div>
          {stats.playlist_sources?.length ? (
            <ul className="space-y-1">
              {stats.playlist_sources.map((u) => {
                const bad = stats.failed_playlists.includes(u);
                return (
                  <li key={u} className="flex items-center gap-2 text-xs min-w-0">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded font-bold ${bad ? 'bg-red-500/15 text-red-300' : 'bg-green-500/15 text-green-300'}`}>{bad ? 'FAILED' : 'OK'}</span>
                    <span className="truncate text-zinc-300">{u}</span>
                  </li>
                );
              })}
            </ul>
          ) : <div className="text-sm text-zinc-500">No playlist report yet — run a forced sync.</div>}
        </section>
        <PlaylistManager call={call} onSynced={() => setTimeout(() => load(), 90000)} />
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <button onClick={() => action('sync', '/admin/sync', 'Forced sync started in the background (takes ~1 min, probe ~15 min).')} disabled={!!busy} data-testid="admin-force-sync-btn"
            className="h-11 px-5 rounded-full bg-[#7c83ff] hover:bg-[#9097ff] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Force sync
          </button>
          <button onClick={() => action('probe', '/admin/probe-priority', 'Priority probe started in the background.')} disabled={!!busy} data-testid="admin-probe-btn"
            className="h-11 px-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === 'probe' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />} Run priority probe
          </button>
          <button onClick={() => action('replays', '/admin/replays/rescan', (r) => (r.ok ? `Replays rescanned: ${r.count} channels.` : r.error))} disabled={!!busy} data-testid="admin-replays-rescan-btn"
            className="h-11 px-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === 'replays' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clapperboard className="w-4 h-4" />} Rescan replays now
          </button>
          <button onClick={() => action('cats', '/admin/reannotate', (r) => `Re-classified ${r.channels} channels; ${r.logos_fixed} shared logos cleared.`)} disabled={!!busy} data-testid="admin-reannotate-btn"
            className="h-11 px-5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
            {busy === 'cats' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tags className="w-4 h-4" />} Re-classify channels
          </button>
        </div>
        {msg && <div className="text-sm text-[#c3c7ff]" data-testid="admin-action-msg">{msg}</div>}
        <StreamTester call={call} />
      </main>
    </div>
  );
}
