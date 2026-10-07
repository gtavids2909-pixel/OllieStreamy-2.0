// Shared user preferences (persisted to localStorage). Used across pages
// so the Samsung-TV / popup-blocker toggle can live in the Navbar and stay
// in sync with the player.

const SAFE_KEY = 'fs_safe_mode';
const listeners = new Set();

function isSmartTvUA() {
  try {
    const ua = (navigator.userAgent || '').toLowerCase();
    return (
      ua.includes('tizen') ||
      ua.includes('smart-tv') ||
      ua.includes('smarttv') ||
      ua.includes('webos') ||
      ua.includes('web0s')
    );
  } catch {
    return false;
  }
}

export function getSafeMode() {
  try {
    const v = localStorage.getItem(SAFE_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
    return isSmartTvUA();
  } catch {
    return isSmartTvUA();
  }
}

export function setSafeMode(next) {
  try {
    localStorage.setItem(SAFE_KEY, next ? '1' : '0');
  } catch (_e) { /* ignore */ }
  listeners.forEach((cb) => {
    try { cb(next); } catch (_e) { /* ignore */ }
  });
}

export function onSafeModeChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// --------------------------  Recently-watched episodes  ---------------------
// Per-TMDB-show cache of `{s, e, ts}` entries so the Kids random picker can
// avoid repeats for at least 14 days.
const RECENT_KEY = 'fs_recent_eps';
const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

function readRecent() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeRecent(obj) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(obj));
  } catch (_e) { /* ignore */ }
}

export function getRecentEpisodes(tmdbId) {
  const all = readRecent();
  const list = all[String(tmdbId)] || [];
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  return list.filter((x) => x.ts >= cutoff);
}

export function recordEpisode(tmdbId, season, episode) {
  const all = readRecent();
  const key = String(tmdbId);
  const cutoff = Date.now() - RECENT_WINDOW_MS;
  const existing = (all[key] || []).filter((x) => x.ts >= cutoff);
  // Keep unique by (s,e); refresh timestamp if replayed
  const filtered = existing.filter((x) => !(x.s === season && x.e === episode));
  filtered.push({ s: season, e: episode, ts: Date.now() });
  all[key] = filtered.slice(-200); // cap size per show
  writeRecent(all);
}

/**
 * Pick a random (season, episode) pair that hasn't been watched in the last
 * 14 days. Falls back to the oldest previously-watched episode if every
 * episode has already been consumed within the window.
 *
 * seasons: array of TMDB season objects `{ season_number, episode_count }`.
 * Season 0 (Specials) is filtered out.
 */
export function pickRandomEpisode(tmdbId, seasons) {
  const validSeasons = (seasons || []).filter(
    (s) => s && s.season_number > 0 && s.episode_count > 0
  );
  if (validSeasons.length === 0) return { season: 1, episode: 1 };

  // Build full pool of (s,e) pairs
  const pool = [];
  validSeasons.forEach((s) => {
    for (let e = 1; e <= s.episode_count; e++) {
      pool.push({ season: s.season_number, episode: e });
    }
  });

  const recent = getRecentEpisodes(tmdbId);
  const recentSet = new Set(recent.map((r) => `${r.s}-${r.e}`));
  const fresh = pool.filter((p) => !recentSet.has(`${p.season}-${p.episode}`));

  if (fresh.length > 0) {
    return fresh[Math.floor(Math.random() * fresh.length)];
  }
  // All watched recently — replay the oldest one.
  const sorted = [...recent].sort((a, b) => a.ts - b.ts);
  const oldest = sorted[0];
  return oldest ? { season: oldest.s, episode: oldest.e } : pool[0];
}
