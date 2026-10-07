import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Server, ChevronDown, ChevronUp, Cast, Maximize2, ExternalLink, Info } from 'lucide-react';
import Hls from 'hls.js';
import { tmdb, getServers } from '../lib/tmdb';
import { getSafeMode, onSafeModeChange } from '../lib/prefs';

// --- Cast / Screen-Mirror Mode ------------------------------------------------
// A distraction-free full-viewport player. Screen mirroring on smart TVs / phones
// often blanks cross-origin iframes when they are embedded inside a larger page,
// so this route strips ALL page chrome and makes the video the entire page.
// Instructions overlay auto-hides after 6s so it doesn't get mirrored either.

export default function CastPage() {
  const { type, id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const s = Number(params.get('s') || 1) || 1;
  const e = Number(params.get('e') || 1) || 1;
  const rawUrl = params.get('u') || null; // live-TV channels pass their embed URL here
  const rawTitle = params.get('title') || null;
  const isHls = params.get('hls') === '1';
  const isLive = type === 'live' && !!rawUrl;

  const [data, setData] = useState(null);
  const [imdbId, setImdbId] = useState(null);
  const [serverIdx, setServerIdx] = useState(() => {
    try {
      const saved = Number(localStorage.getItem('fs_server_idx'));
      return Number.isFinite(saved) && saved >= 0 ? saved : 0;
    } catch { return 0; }
  });
  const [showChrome, setShowChrome] = useState(true);
  const [showTips, setShowTips] = useState(true);
  const [safeMode, setSafeModeLocal] = useState(getSafeMode());
  useEffect(() => onSafeModeChange(setSafeModeLocal), []);
  const wrapperRef = useRef(null);

  // Auto-hide the "how to mirror" tips after 6 seconds so the TV never captures them.
  useEffect(() => {
    const t = setTimeout(() => setShowTips(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // Hide top / bottom bars after a few seconds of inactivity; cursor movement reveals.
  useEffect(() => {
    let hideT;
    const arm = () => {
      setShowChrome(true);
      clearTimeout(hideT);
      hideT = setTimeout(() => setShowChrome(false), 4000);
    };
    arm();
    window.addEventListener('mousemove', arm);
    window.addEventListener('touchstart', arm);
    window.addEventListener('keydown', arm);
    return () => {
      clearTimeout(hideT);
      window.removeEventListener('mousemove', arm);
      window.removeEventListener('touchstart', arm);
      window.removeEventListener('keydown', arm);
    };
  }, []);

  // Fetch metadata for title + IMDb fallback. Skip entirely for live-TV channels.
  useEffect(() => {
    if (isLive) {
      setData({ title: rawTitle || 'Live TV' });
      return;
    }
    (async () => {
      try {
        const d = type === 'tv' ? await tmdb.tvDetails(id) : await tmdb.movieDetails(id);
        setData(d);
        setImdbId(d?.external_ids?.imdb_id || null);
      } catch (_e) { /* ignore */ }
    })();
  }, [type, id, isLive, rawTitle]);

  // Ask the browser to enter fullscreen once the player mounts. This maximises
  // the surface the TV actually captures during screen mirroring.
  useEffect(() => {
    const t = setTimeout(() => {
      const el = wrapperRef.current;
      if (el && document.fullscreenEnabled && !document.fullscreenElement) {
        try { el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {}); } catch (_e) { /* ignore */ }
      }
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const servers = useMemo(
    () => (isLive ? [{ name: 'Live', url: rawUrl }] : getServers(type, id, s, e, imdbId)),
    [isLive, rawUrl, type, id, s, e, imdbId]
  );

  const pickServer = (i) => {
    setServerIdx(i);
    try { localStorage.setItem('fs_server_idx', String(i)); } catch (_e) { /* ignore */ }
  };

  const nextServer = () => pickServer((serverIdx + 1) % servers.length);

  const title = data?.title || data?.name || '';
  const active = servers[serverIdx] || servers[0];

  const goBack = () => {
    if (isLive) { navigate('/sports'); return; }
    // Back to detail page with playing=1 so the user lands right on the player.
    const back = location.state?.from
      || `/${type}/${id}${type === 'tv' ? `?play=1&s=${s}&e=${e}` : '?play=1'}`;
    navigate(back);
  };

  const requestFs = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    }
  };

  return (
    <div
      ref={wrapperRef}
      data-testid="cast-page-root"
      className="fixed inset-0 bg-black text-white overflow-hidden"
      style={{ cursor: showChrome ? 'default' : 'none' }}
    >
      {/* The iframe fills the entire viewport — nothing else is in front of it.
          This is the single most important detail for smart-TV mirroring:
          the iframe IS the page, so the TV captures its pixels directly. */}
      {isHls && active ? (
        <HlsFullscreen url={active.url} />
      ) : active ? (
        <iframe
          key={`${active.url}-${serverIdx}-${safeMode ? 'safe' : 'std'}`}
          src={active.url}
          title={title || 'Player'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="no-referrer"
          {...(safeMode
            ? { sandbox: 'allow-scripts allow-same-origin allow-forms allow-presentation allow-orientation-lock' }
            : {})}
          className="absolute inset-0 w-screen h-screen border-0"
          data-testid="cast-iframe"
        />
      ) : null}

      {/* Top bar (auto-hides) */}
      <div
        className={`absolute top-0 left-0 right-0 z-40 transition-opacity duration-300 ${
          showChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-b from-black/80 to-transparent px-4 py-3 flex items-center gap-3">
          <button
            onClick={goBack}
            data-testid="cast-back"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Exit cast mode
          </button>
          <div className="text-sm font-semibold truncate">
            <Cast className="w-4 h-4 inline mr-1.5 text-[#7c83ff]" />
            {title}
            {!isLive && type === 'tv' && (
              <span className="text-zinc-400 font-normal ml-2">· S{s} E{e}</span>
            )}
            {isLive && (
              <span className="text-red-400 font-normal ml-2 text-xs">· LIVE</span>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={requestFs}
              data-testid="cast-fullscreen"
              className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur"
              aria-label="Fullscreen"
              title="Enter fullscreen (best for mirroring)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {active && (
              <a
                href={active.url}
                target="_blank"
                rel="noreferrer"
                data-testid="cast-open-tab"
                className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur"
                aria-label="Open player in new tab"
                title="Open player in a new tab (also mirrors well)"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* First-load mirroring tips overlay — auto-dismisses after 6s */}
      {showTips && (
        <div
          data-testid="cast-tips"
          className="absolute inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none"
        >
          <div className="max-w-lg rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 px-5 py-4 shadow-2xl">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-[#7c83ff]" />
              <div className="text-sm font-bold">Screen mirror tips</div>
            </div>
            <ol className="text-[13px] text-zinc-300 space-y-1 list-decimal list-inside">
              <li>Start screen mirroring from your phone / laptop first.</li>
              <li>Then tap the video once — most TVs need a tap to unblank cross-origin video.</li>
              <li>If the TV shows only a load symbol, tap <span className="font-semibold text-white">Next server</span> below until it loads.</li>
              <li>Fullscreen (top-right) gives the cleanest mirror.</li>
            </ol>
          </div>
        </div>
      )}

      {/* Bottom bar: server picker + next-server (auto-hides) */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-40 transition-opacity duration-300 ${
          showChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-gradient-to-t from-black/85 to-transparent px-4 pt-16 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <button
                onClick={nextServer}
                data-testid="cast-next-server"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7c83ff] hover:bg-[#9097ff] text-white font-semibold text-sm shadow-lg"
              >
                <Server className="w-4 h-4" /> Next server
              </button>
              <span className="text-xs text-zinc-300">
                Playing on <span className="font-semibold text-white">{active?.name || '—'}</span>
                <span className="text-zinc-500"> · {serverIdx + 1}/{servers.length}</span>
              </span>
              <span className="ml-auto text-[11px] text-zinc-400">
                {safeMode ? 'Popup blocker: ON' : 'Popup blocker: OFF'} · Navbar → Settings
              </span>
            </div>
            <ServerStrip servers={servers} idx={serverIdx} onPick={pickServer} />
          </div>
        </div>
      </div>
    </div>
  );
}

function HlsFullscreen({ url }) {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      video.src = url;
    }
    const p = video.play();
    if (p && p.catch) p.catch(() => {});
    return () => {
      try { hls?.destroy(); } catch (_e) { /* ignore */ }
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (_e) { /* ignore */ }
    };
  }, [url]);
  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay
      muted
      className="absolute inset-0 w-screen h-screen bg-black"
      data-testid="cast-hls-video"
    />
  );
}

function ServerStrip({ servers, idx, onPick }) {  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg bg-black/60 backdrop-blur border border-white/10 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider text-zinc-300 hover:bg-white/5"
        data-testid="cast-servers-toggle"
      >
        <span className="flex items-center gap-2"><Server className="w-3.5 h-3.5" /> All servers ({servers.length})</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 p-3">
          {servers.map((sv, i) => (
            <button
              key={sv.name}
              onClick={() => onPick(i)}
              data-testid={`cast-server-${i}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                idx === i
                  ? 'bg-[#7c83ff] border-[#7c83ff] text-white'
                  : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'
              }`}
            >
              {sv.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
