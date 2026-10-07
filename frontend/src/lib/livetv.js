// Shared Live-TV helpers: API access + favourites / recently-watched storage.
export const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export async function j(path, opts) {
  const r = await fetch(`${API}${path}`, opts);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export const proxyFull = (proxyUrl) => `${BACKEND}${proxyUrl}`;

export const fallbackLogo = (name = '') =>
  `https://ui-avatars.com/api/?background=15151f&color=a8aeff&bold=true&name=${encodeURIComponent(name.slice(0, 2))}`;

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const FAV_KEY = 'os_livetv_favs';
const RECENT_KEY = 'os_livetv_recent';
const listeners = new Set();

const read = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch (_e) { /* ignore */ }
  listeners.forEach((cb) => cb());
};

// Keep only the fields a card needs so storage stays small.
const slim = (c) => ({
  id: c.id, name: c.name, logo: c.logo || '', country: c.country || '',
  country_flag: c.country_flag || '', categories: (c.categories || []).slice(0, 2),
  alive_count: c.alive_count ?? 0, hd: !!c.hd,
});

export const getFavs = () => read(FAV_KEY);
export const getRecent = () => read(RECENT_KEY);
export const isFav = (id) => getFavs().some((c) => c.id === id);

export function toggleFav(c) {
  const favs = getFavs();
  write(FAV_KEY, favs.some((x) => x.id === c.id) ? favs.filter((x) => x.id !== c.id) : [slim(c), ...favs].slice(0, 100));
}

export function pushRecent(c) {
  write(RECENT_KEY, [slim(c), ...getRecent().filter((x) => x.id !== c.id)].slice(0, 20));
}

export function onLiveStoreChange(cb) {
  listeners.add(cb);
  const onStorage = (e) => (e.key === FAV_KEY || e.key === RECENT_KEY) && cb();
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
}
