// Subtitle helpers: SRT -> WebVTT, cue parsing, persisted style prefs.
const PREF_KEY = 'os_sub_style';
export const DEFAULT_STYLE = { size: 'M', color: 'white', bg: 'semi' };

export function getSubStyle() {
  try { return { ...DEFAULT_STYLE, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') }; } catch { return DEFAULT_STYLE; }
}
export function setSubStyle(s) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(s)); } catch (_e) { /* ignore */ }
}

export function srtToVtt(text) {
  const body = text.replace(/\r/g, '').replace(/^\uFEFF/, '')
    .replace(/(\d{1,2}:\d{2}:\d{2}),(\d{1,3})/g, '$1.$2');
  return body.trim().startsWith('WEBVTT') ? body : `WEBVTT\n\n${body}`;
}

const toSec = (t) => {
  const p = t.trim().split(':').map(Number);
  return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
};

export function parseVtt(vtt) {
  const cues = [];
  vtt.replace(/\r/g, '').split(/\n{2,}/).forEach((block) => {
    const lines = block.split('\n');
    const ti = lines.findIndex((l) => l.includes('-->'));
    if (ti < 0) return;
    const [a, b] = lines[ti].split('-->');
    const start = toSec(a);
    const end = toSec(b.trim().split(/\s+/)[0]);
    const txt = lines.slice(ti + 1).join('\n').trim();
    if (txt && Number.isFinite(start) && Number.isFinite(end)) cues.push({ start, end, text: txt });
  });
  return cues;
}

export const fmtTime = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const sign = s < 0 ? '-' : '';
  const a = Math.abs(Math.round(s));
  const h = Math.floor(a / 3600);
  const m = Math.floor((a % 3600) / 60);
  const sec = String(a % 60).padStart(2, '0');
  return h ? `${sign}${h}:${String(m).padStart(2, '0')}:${sec}` : `${sign}${m}:${sec}`;
};
