import React, { useEffect, useRef, useState } from 'react';
import { Captions, Upload, Check, Minus, Plus } from 'lucide-react';
import { getSubStyle, setSubStyle, srtToVtt, parseVtt } from '../../lib/subtitles';

const CUSTOM_LABEL = 'Loaded file';

const listTracks = (video) => Array.from(video?.textTracks || [])
  .map((t, i) => ({ t, i }))
  .filter(({ t }) => t.kind === 'subtitles' || t.kind === 'captions');

const Seg = ({ value, options, onChange, testId }) => (
  <div className="flex gap-1" data-testid={testId}>
    {options.map(([k, label]) => (
      <button key={k} onClick={() => onChange(k)} data-testid={`${testId}-${k}`}
        className={`flex-1 h-7 px-2 rounded text-[11px] font-semibold ${value === k ? 'bg-[#7c83ff] text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'}`}>{label}</button>
    ))}
  </div>
);

export default function CaptionsMenu({ videoRef, hlsRef, style, onStyle }) {
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const [active, setActive] = useState(-1);
  const [delay, setDelay] = useState(0);
  const [fileCues, setFileCues] = useState(null);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    const v = videoRef.current;
    const bump = () => setTick((t) => t + 1);
    v?.textTracks?.addEventListener?.('addtrack', bump);
    v?.textTracks?.addEventListener?.('removetrack', bump);
    return () => { v?.textTracks?.removeEventListener?.('addtrack', bump); v?.textTracks?.removeEventListener?.('removetrack', bump); };
  }, [videoRef]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const select = (idx) => {
    const v = videoRef.current;
    const hls = hlsRef?.current;
    listTracks(v).forEach(({ t, i }) => { t.mode = i === idx ? 'showing' : 'disabled'; });
    if (hls) {
      const t = idx >= 0 ? v.textTracks[idx] : null;
      const hi = t ? (hls.subtitleTracks || []).findIndex((s) => s.name === t.label || s.lang === t.language) : -1;
      hls.subtitleTrack = hi;
      hls.subtitleDisplay = hi >= 0;
    }
    setActive(idx);
  };

  // (Re)build the loaded-file track whenever cues or the sync delay change.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !fileCues || !window.VTTCue) return;
    let track = Array.from(v.textTracks).find((t) => t.label === CUSTOM_LABEL);
    if (!track) track = v.addTextTrack('subtitles', CUSTOM_LABEL, 'und');
    Array.from(track.cues || []).forEach((c) => track.removeCue(c));
    fileCues.forEach((c) => {
      const s = Math.max(0, c.start + delay);
      const e = Math.max(s + 0.1, c.end + delay);
      track.addCue(new window.VTTCue(s, e, c.text));
    });
    const idx = Array.from(v.textTracks).indexOf(track);
    listTracks(v).forEach(({ t, i }) => { t.mode = i === idx ? 'showing' : 'disabled'; });
    setActive(idx);
  }, [fileCues, delay, videoRef]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr('');
    try {
      const text = await f.text();
      const cues = parseVtt(/\.srt$/i.test(f.name) ? srtToVtt(text) : text);
      if (!cues.length) throw new Error('empty');
      setDelay(0);
      setFileCues(cues);
    } catch (_e) {
      setErr('Could not read that file. Use a .srt or .vtt subtitle file.');
    }
  };

  const update = (patch) => { const next = { ...style, ...patch }; setSubStyle(next); onStyle(next); };
  const tracks = listTracks(videoRef.current);

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Subtitles" data-testid="player-cc-btn"
        className={`w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-white/10 ${active >= 0 ? 'text-[#a8aeff]' : 'text-white'}`}>
        <Captions className="w-5 h-5" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-11 z-40 w-64 max-h-[60vh] overflow-y-auto rounded-xl border border-white/10 bg-[#101018] shadow-2xl p-2 text-sm" data-testid="player-cc-menu">
          <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wider text-zinc-500">Subtitles</div>
          <button onClick={() => select(-1)} data-testid="player-cc-off" className="w-full flex items-center justify-between px-2 h-8 rounded hover:bg-white/5">
            Off {active < 0 && <Check className="w-4 h-4 text-[#a8aeff]" />}
          </button>
          {tracks.map(({ t, i }) => (
            <button key={i} onClick={() => select(i)} data-testid={`player-cc-track-${i}`} className="w-full flex items-center justify-between px-2 h-8 rounded hover:bg-white/5 text-left">
              <span className="truncate">{t.label || t.language || (t.kind === 'captions' ? `Captions ${i + 1}` : `Track ${i + 1}`)}</span>
              {active === i && <Check className="w-4 h-4 text-[#a8aeff] shrink-0" />}
            </button>
          ))}
          {!tracks.length && <div className="px-2 py-1 text-[11px] text-zinc-500" data-testid="player-cc-none">This stream has no built-in subtitles.</div>}
          <button onClick={() => fileRef.current?.click()} data-testid="player-cc-load-file" className="mt-1 w-full flex items-center gap-2 px-2 h-8 rounded bg-white/5 hover:bg-white/10">
            <Upload className="w-4 h-4" /> Load subtitle file (.srt / .vtt)
          </button>
          <input ref={fileRef} type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" className="hidden" onChange={onFile} data-testid="player-cc-file-input" />
          {err && <div className="px-2 pt-1 text-[11px] text-red-300">{err}</div>}
          {fileCues && (
            <div className="mt-2 px-2 flex items-center justify-between" data-testid="player-cc-delay">
              <span className="text-[11px] text-zinc-400">Sync delay</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setDelay((d) => d - 0.5)} className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 inline-flex items-center justify-center" aria-label="Subtitles earlier" data-testid="player-cc-delay-minus"><Minus className="w-3 h-3" /></button>
                <span className="w-12 text-center text-xs tabular-nums" data-testid="player-cc-delay-value">{delay > 0 ? '+' : ''}{delay.toFixed(1)}s</span>
                <button onClick={() => setDelay((d) => d + 0.5)} className="w-7 h-7 rounded bg-white/5 hover:bg-white/10 inline-flex items-center justify-center" aria-label="Subtitles later" data-testid="player-cc-delay-plus"><Plus className="w-3 h-3" /></button>
              </div>
            </div>
          )}
          <div className="mt-3 px-2 pb-1 space-y-2 border-t border-white/5 pt-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Style</div>
            <Seg value={style.size} onChange={(size) => update({ size })} options={[['S', 'Small'], ['M', 'Medium'], ['L', 'Large']]} testId="player-cc-size" />
            <Seg value={style.color} onChange={(color) => update({ color })} options={[['white', 'White'], ['yellow', 'Yellow']]} testId="player-cc-color" />
            <Seg value={style.bg} onChange={(bg) => update({ bg })} options={[['none', 'No background'], ['semi', 'Shaded']]} testId="player-cc-bg" />
          </div>
        </div>
      )}
    </div>
  );
}

export const cueCss = (scope, style) => {
  const size = { S: '0.9em', M: '1.2em', L: '1.6em' }[style.size] || '1.2em';
  const color = style.color === 'yellow' ? '#ffe14d' : '#ffffff';
  const bg = style.bg === 'none' ? 'transparent' : 'rgba(0,0,0,0.6)';
  return `.${scope} video::cue{font-size:${size};color:${color};background-color:${bg};text-shadow:0 1px 2px rgba(0,0,0,.9);}`;
};

export { getSubStyle };
