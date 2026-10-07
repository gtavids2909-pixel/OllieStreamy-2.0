import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, RotateCw } from 'lucide-react';
import { fmtTime } from '../../lib/subtitles';

const EDGE = 10; // seconds from the end that still counts as "live"

function useVideoState(videoRef) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const bump = () => setTick((t) => t + 1);
    const evs = ['timeupdate', 'progress', 'durationchange', 'play', 'pause', 'seeking', 'seeked', 'loadedmetadata'];
    evs.forEach((e) => v.addEventListener(e, bump));
    return () => evs.forEach((e) => v.removeEventListener(e, bump));
  }, [videoRef]);
  return videoRef.current;
}

export function seekBy(video, delta) {
  if (!video?.seekable?.length) return;
  const s = video.seekable.start(0);
  const e = video.seekable.end(video.seekable.length - 1);
  video.currentTime = Math.min(e, Math.max(s, video.currentTime + delta));
}

export function togglePlay(video) {
  if (!video) return;
  if (video.paused) { const p = video.play(); if (p?.catch) p.catch(() => {}); } else video.pause();
}

export default function SeekBar({ videoRef, hlsRef, live }) {
  const v = useVideoState(videoRef);
  const trackRef = useRef(null);
  const [drag, setDrag] = useState(null); // fraction while dragging
  const [hover, setHover] = useState(null); // {x, frac}

  const range = () => {
    if (!v?.seekable?.length) return null;
    const s = v.seekable.start(0);
    const e = v.seekable.end(v.seekable.length - 1);
    return e - s > 5 ? [s, e] : null;
  };
  const win = range();
  const isLive = live || (v && !Number.isFinite(v.duration));

  const fracAt = useCallback((clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }, []);

  const onDown = (e) => {
    if (!win) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag(fracAt(e.clientX));
  };
  const onMove = (e) => {
    if (!win) return;
    const f = fracAt(e.clientX);
    setHover({ x: f * 100, frac: f });
    if (drag != null) setDrag(f);
  };
  const onUp = (e) => {
    if (drag == null || !win) return;
    const f = fracAt(e.clientX);
    v.currentTime = win[0] + f * (win[1] - win[0]);
    setDrag(null);
    if (e.pointerType !== 'mouse') setHover(null);
  };

  const goLive = () => {
    const sync = hlsRef?.current?.liveSyncPosition;
    if (win) v.currentTime = Number.isFinite(sync) ? sync : win[1] - 3;
    if (v.paused) togglePlay(v);
  };

  const cur = v?.currentTime || 0;
  const frac = win ? (drag ?? (cur - win[0]) / (win[1] - win[0])) : 0;
  const atEdge = !win || win[1] - cur < EDGE;
  const tipTime = (f) => (win ? (isLive ? win[0] + f * (win[1] - win[0]) - win[1] : win[0] + f * (win[1] - win[0])) : 0);

  const buffered = [];
  if (win && v?.buffered) {
    for (let i = 0; i < v.buffered.length; i += 1) {
      const a = Math.max(win[0], v.buffered.start(i));
      const b = Math.min(win[1], v.buffered.end(i));
      if (b > a) buffered.push([(a - win[0]) / (win[1] - win[0]), (b - win[0]) / (win[1] - win[0])]);
    }
  }

  const btn = 'w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full text-white hover:bg-white/10 active:scale-95 transition-[background-color,transform]';
  return (
    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 bg-[#08080c] border-t border-white/5 select-none" data-testid="player-seekbar">
      <button onClick={() => togglePlay(v)} className={btn} aria-label={v?.paused ? 'Play' : 'Pause'} data-testid="player-play-btn">
        {v?.paused ? <Play className="w-4 h-4" fill="currentColor" /> : <Pause className="w-4 h-4" fill="currentColor" />}
      </button>
      {win && (
        <>
          <button onClick={() => seekBy(v, -10)} className={btn} aria-label="Back 10 seconds" data-testid="player-back10-btn"><RotateCcw className="w-4 h-4" /></button>
          <button onClick={() => seekBy(v, 10)} disabled={isLive && atEdge} className={`${btn} disabled:opacity-30`} aria-label="Forward 10 seconds" data-testid="player-fwd10-btn"><RotateCw className="w-4 h-4" /></button>
          <div
            ref={trackRef}
            className="relative flex-1 h-8 flex items-center cursor-pointer touch-none group/seek"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={() => drag == null && setHover(null)}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(frac * 100)}
            data-testid="player-seek-track"
          >
            <div className="relative w-full h-1.5 group-hover/seek:h-2 rounded-full bg-white/15 transition-[height] overflow-hidden">
              {buffered.map(([a, b]) => <div key={a} className="absolute inset-y-0 bg-white/25" style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }} />)}
              <div className="absolute inset-y-0 left-0 bg-[#7c83ff]" style={{ width: `${frac * 100}%` }} />
            </div>
            <div className="absolute w-3.5 h-3.5 -ml-[7px] rounded-full bg-white shadow ring-2 ring-[#7c83ff]" style={{ left: `${frac * 100}%` }} data-testid="player-seek-thumb" />
            {(hover || drag != null) && (
              <div className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-white/10 text-[10px] tabular-nums text-white pointer-events-none" style={{ left: `${(drag ?? hover.frac) * 100}%` }} data-testid="player-seek-tooltip">
                {fmtTime(tipTime(drag ?? hover.frac))}
              </div>
            )}
          </div>
        </>
      )}
      {!win && <div className="flex-1" />}
      <span className="text-[11px] tabular-nums text-zinc-400 shrink-0 hidden sm:inline" data-testid="player-time">
        {isLive ? (win && !atEdge ? fmtTime(cur - win[1]) : '') : `${fmtTime(cur)} / ${fmtTime(v?.duration)}`}
      </span>
      {isLive && (atEdge ? (
        <span className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded bg-red-600 text-white text-[10px] font-black tracking-wider" data-testid="player-live-badge">
          <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
        </span>
      ) : (
        <button onClick={goLive} className="shrink-0 inline-flex items-center gap-1 px-2 h-7 rounded bg-white/10 hover:bg-red-600 text-white text-[10px] font-black tracking-wider transition-colors" data-testid="player-go-live-btn">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> GO LIVE
        </button>
      ))}
    </div>
  );
}
