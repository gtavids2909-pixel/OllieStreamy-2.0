import React, { useEffect, useId, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Loader2 } from 'lucide-react';
import SeekBar from './player/SeekBar';
import CaptionsMenu, { cueCss, getSubStyle } from './player/CaptionsMenu';

// Every live-TV URL goes through /api/livetv/proxy (never ends in ".m3u8"), so use
// hls.js whenever MSE exists, native HLS on Safari/iOS, and report fatal errors
// so the caller can auto-advance to the next mirror.
export default function HlsVideo({ url, onFatal, onMutedChange, muted = true, controls = true, enhanced = false, startTimeout = 20000, videoRef: extRef, testId = 'livetv-hls-video', className = 'aspect-video' }) {
  const innerRef = useRef(null);
  const videoRef = extRef || innerRef;
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [subStyle, setSubStyleState] = useState(getSubStyle);
  const hlsRef = useRef(null);
  const scope = `osv-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;
    setErr(null);
    setLoading(true);

    let hls;
    let dead = false;
    const fail = (msg) => {
      if (dead) return;
      dead = true;
      let host = url;
      try { host = new URL(atob((new URL(url).searchParams.get('u') || '').replace(/-/g, '+').replace(/_/g, '/'))).host; } catch (_e) { /* keep url */ }
      console.warn(`[OllieStreamy] stream failed (${msg}) host=${host}`);
      setErr(msg);
      setLoading(false);
      if (onFatal) onFatal();
    };

    const onPlaying = () => setLoading(false);
    const onNativeError = () => fail('Playback failed. Trying next server…');
    video.addEventListener('playing', onPlaying);
    video.addEventListener('error', onNativeError);

    const startTimer = setTimeout(() => {
      if (video.readyState < 2) fail('Stream is not responding. Trying next server…');
    }, startTimeout);

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        manifestLoadingMaxRetry: 2,
        levelLoadingMaxRetry: 2,
        fragLoadingMaxRetry: 3,
        backBufferLength: 30,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.LEVEL_LOADED, (_e, d) => setLive(!!d?.details?.live));
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const p = video.play();
        if (p && p.catch) p.catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try { hls.recoverMediaError(); return; } catch (_e) { /* fall through */ }
        }
        fail('Playback failed. Trying next server…');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      fail('This browser cannot play live streams.');
    }

    return () => {
      dead = true;
      clearTimeout(startTimer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('error', onNativeError);
      try { hls?.destroy(); } catch (_e) { /* ignore */ }
      hlsRef.current = null;
      try { video.pause(); video.removeAttribute('src'); video.load(); } catch (_e) { /* ignore */ }
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted, videoRef]);

  const box = (
    <div className={`relative bg-black os-video-box ${className}`}>
      <video
        ref={videoRef}
        controls={controls && !enhanced}
        playsInline
        autoPlay
        muted={muted}
        onVolumeChange={(e) => onMutedChange?.(e.currentTarget.muted)}
        className="absolute inset-0 w-full h-full"
        data-testid={testId}
      />
      {loading && !err && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="w-8 h-8 text-white/70 animate-spin" />
        </div>
      )}
      {err && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="text-sm text-red-300 bg-black/70 px-3 py-2 rounded">{err}</div>
        </div>
      )}
    </div>
  );
  if (!enhanced) return box;
  return (
    <div className={`${scope} flex flex-col bg-black`} data-player-shell>
      <style>{cueCss(scope, subStyle)}</style>
      {box}
      <div className="flex items-center bg-[#08080c] pr-1" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 min-w-0"><SeekBar videoRef={videoRef} hlsRef={hlsRef} live={live} /></div>
        <CaptionsMenu videoRef={videoRef} hlsRef={hlsRef} style={subStyle} onStyle={setSubStyleState} />
      </div>
    </div>
  );
}
