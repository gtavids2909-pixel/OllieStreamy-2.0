import React, { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import HlsVideo from '../HlsVideo';
import { proxyFull } from '../../lib/livetv';

export default function StreamTester({ call }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');

  const run = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true); setErr(''); setRes(null);
    try {
      setRes(await call('/admin/test-stream', { method: 'POST', body: JSON.stringify({ url: url.trim() }) }));
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl bg-[#101018] border border-white/5 p-4" data-testid="admin-stream-tester">
      <div className="flex items-center gap-2 mb-3 font-semibold"><FlaskConical className="w-4 h-4 text-[#7c83ff]" /> Test a stream</div>
      <form onSubmit={run} className="flex flex-col sm:flex-row gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…/playlist.m3u8"
          data-testid="admin-test-url-input"
          className="flex-1 h-11 px-4 rounded-full bg-white/5 border border-white/10 text-base sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#7c83ff]/60"
        />
        <button disabled={busy || !url.trim()} data-testid="admin-test-submit" className="h-11 px-5 rounded-full bg-[#7c83ff] hover:bg-[#9097ff] text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {busy ? 'Testing…' : 'Test'}
        </button>
      </form>
      {err && <div className="mt-3 text-sm text-red-300" data-testid="admin-test-error">{err}</div>}
      {res && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span data-testid="admin-test-badge" className={`px-2.5 py-1 rounded-full text-xs font-bold border ${res.alive ? 'bg-green-500/15 text-green-300 border-green-500/40' : 'bg-red-500/15 text-red-300 border-red-500/40'}`}>
              {res.alive ? 'ALIVE' : 'DEAD'}
            </span>
            <span className="text-sm text-zinc-300" data-testid="admin-test-reason">{res.reason}</span>
          </div>
          <div className="rounded-xl overflow-hidden border border-white/5">
            <HlsVideo key={res.proxy_url} url={proxyFull(res.proxy_url)} testId="admin-test-video" />
          </div>
        </div>
      )}
    </section>
  );
}
