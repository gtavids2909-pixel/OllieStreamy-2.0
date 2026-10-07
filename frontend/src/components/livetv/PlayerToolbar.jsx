import React, { useEffect, useState } from 'react';
import { SkipBack, SkipForward, Shuffle, Volume2, VolumeX, Maximize, PictureInPicture2, HelpCircle } from 'lucide-react';

const SHORTCUTS = [
  ['↑ / P', 'Previous channel'],
  ['↓ / N', 'Next channel'],
  ['R', 'Random channel'],
  ['← / →', 'Seek -/+ 10s'],
  ['Space', 'Play / pause'],
  ['M', 'Mute / unmute'],
  ['F', 'Fullscreen'],
];

const Btn = ({ onClick, label, testId, disabled, children, active }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    data-testid={testId}
    className={`h-9 min-w-9 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold border transition-[background-color,transform] duration-150 active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
      active ? 'bg-[#7c83ff] border-[#7c83ff] text-white' : 'bg-white/5 border-white/10 text-zinc-200 hover:bg-white/10'
    }`}
  >
    {children}
  </button>
);

export const pipSupported = () =>
  typeof document !== 'undefined' && !!document.pictureInPictureEnabled && !!HTMLVideoElement.prototype.requestPictureInPicture;

export default function PlayerToolbar({ videoRef, muted, onToggleMute, onFullscreen, onPrev, onNext, onRandom, canSurf, position }) {
  const [help, setHelp] = useState(false);
  const [pip, setPip] = useState(false);
  const pipOk = pipSupported();

  useEffect(() => {
    const on = () => setPip(true);
    const off = () => setPip(false);
    document.addEventListener('enterpictureinpicture', on, true);
    document.addEventListener('leavepictureinpicture', off, true);
    return () => {
      document.removeEventListener('enterpictureinpicture', on, true);
      document.removeEventListener('leavepictureinpicture', off, true);
    };
  }, []);

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch (_e) { /* stream not ready yet */ }
  };

  return (
    <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 border-b border-white/5 overflow-x-auto scrollbar-hide" data-testid="livetv-toolbar">
      <Btn onClick={onPrev} disabled={!canSurf} label="Previous channel" testId="livetv-prev-btn"><SkipBack className="w-4 h-4" /></Btn>
      <Btn onClick={onNext} disabled={!canSurf} label="Next channel" testId="livetv-next-btn"><SkipForward className="w-4 h-4" /></Btn>
      <Btn onClick={onRandom} label="Random channel" testId="livetv-random-btn"><Shuffle className="w-4 h-4" /><span className="hidden sm:inline">Random</span></Btn>
      {position && <span className="text-[11px] text-zinc-500 tabular-nums px-1 shrink-0" data-testid="livetv-surf-position">{position}</span>}
      <div className="ml-auto flex items-center gap-1.5">
        <Btn onClick={onToggleMute} label={muted ? 'Unmute' : 'Mute'} testId="livetv-mute-btn" active={!muted}>
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Btn>
        {pipOk && (
          <Btn onClick={togglePip} label="Picture-in-Picture" testId="livetv-pip-btn" active={pip}><PictureInPicture2 className="w-4 h-4" /></Btn>
        )}
        <Btn onClick={onFullscreen} label="Fullscreen" testId="livetv-fullscreen-btn"><Maximize className="w-4 h-4" /></Btn>
        <div className="relative hidden md:block" onMouseEnter={() => setHelp(true)} onMouseLeave={() => setHelp(false)}>
          <Btn onClick={() => setHelp((v) => !v)} label="Keyboard shortcuts" testId="livetv-shortcuts-btn"><HelpCircle className="w-4 h-4" /></Btn>
          {help && (
            <div role="tooltip" data-testid="livetv-shortcuts-tooltip" className="absolute right-0 top-11 z-30 w-56 rounded-xl border border-white/10 bg-[#101018] shadow-2xl p-3">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Keyboard shortcuts</div>
              {SHORTCUTS.map(([k, d]) => (
                <div key={k} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-zinc-300">{d}</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10 border border-white/10 text-[10px] font-mono text-white">{k}</kbd>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
