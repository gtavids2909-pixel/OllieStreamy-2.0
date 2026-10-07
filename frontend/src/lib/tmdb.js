// TMDB API helper
const KEYS = [
  'c8dea14dc917687ac631a52620e4f7ad',
  '3cb41ecea3bf606c56552db3d17adefd',
];
let keyIdx = 0;
const getKey = () => KEYS[keyIdx % KEYS.length];

export const IMG = (path, size = 'w500') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : '';

const BASE = 'https://api.themoviedb.org/3';

async function fetchJson(url) {
  for (let attempt = 0; attempt < KEYS.length; attempt++) {
    try {
      const sep = url.includes('?') ? '&' : '?';
      const res = await fetch(`${url}${sep}api_key=${getKey()}`);
      if (res.status === 429 || res.status === 401) {
        keyIdx++;
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      keyIdx++;
      if (attempt === KEYS.length - 1) throw e;
    }
  }
}

export const tmdb = {
  trending: (window = 'week') => fetchJson(`${BASE}/trending/all/${window}`),
  popularMovies: (page = 1) => fetchJson(`${BASE}/movie/popular?page=${page}`),
  popularTv: (page = 1) => fetchJson(`${BASE}/tv/popular?page=${page}`),
  topRatedMovies: (page = 1) => fetchJson(`${BASE}/movie/top_rated?page=${page}`),
  topRatedTv: (page = 1) => fetchJson(`${BASE}/tv/top_rated?page=${page}`),
  upcoming: (page = 1) => fetchJson(`${BASE}/movie/upcoming?page=${page}`),
  nowPlaying: (page = 1) => fetchJson(`${BASE}/movie/now_playing?page=${page}`),
  discoverMovies: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`${BASE}/discover/movie?${qs}`);
  },
  discoverTv: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchJson(`${BASE}/discover/tv?${qs}`);
  },
  search: (query, page = 1) =>
    fetchJson(`${BASE}/search/multi?query=${encodeURIComponent(query)}&page=${page}`),
  movieDetails: (id) =>
    fetchJson(
      `${BASE}/movie/${id}?append_to_response=credits,videos,similar,recommendations,external_ids`
    ),
  tvDetails: (id) =>
    fetchJson(
      `${BASE}/tv/${id}?append_to_response=credits,videos,similar,recommendations,external_ids`
    ),
  tvSeason: (id, seasonNumber) =>
    fetchJson(`${BASE}/tv/${id}/season/${seasonNumber}`),
  externalIds: (type, id) => fetchJson(`${BASE}/${type}/${id}/external_ids`),
  genresMovie: () => fetchJson(`${BASE}/genre/movie/list`),
  genresTv: () => fetchJson(`${BASE}/genre/tv/list`),
  // Lightweight card-only fetch (no heavy append_to_response) for building rails
  tvCard: (id) => fetchJson(`${BASE}/tv/${id}`),
  movieCard: (id) => fetchJson(`${BASE}/movie/${id}`),
  // Videos (YouTube clips/trailers) — used as reliable fallback for kids playback
  tvVideos: (id) => fetchJson(`${BASE}/tv/${id}/videos`),
  movieVideos: (id) => fetchJson(`${BASE}/movie/${id}/videos`),
};

/**
 * Build a list of streaming embed servers.
 * Each provider has been mapped to its current public embed URL format.
 * Some accept TMDB IDs, some accept IMDb IDs — we pass the correct one to each.
 */
export const getServers = (type, tmdbId, season, episode, imdbId) => {
  const isTv = type === 'tv';
  const s = season || 1;
  const e = episode || 1;
  const tv = isTv ? `/${s}/${e}` : '';
  const tvQs = isTv ? `?s=${s}&e=${e}` : '';
  const tvAmp = isTv ? `&s=${s}&e=${e}` : '';

  const servers = [
    // VidSrc family — accepts TMDB directly
    {
      name: 'VidSrc',
      url: isTv
        ? `https://vidsrc.xyz/embed/tv?tmdb=${tmdbId}&season=${s}&episode=${e}`
        : `https://vidsrc.xyz/embed/movie?tmdb=${tmdbId}`,
    },
    {
      name: 'VidSrc.to',
      url: isTv
        ? `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`
        : `https://vidsrc.to/embed/movie/${tmdbId}`,
    },
    {
      name: 'VidSrc.cc',
      url: isTv
        ? `https://vidsrc.cc/v3/embed/tv/${tmdbId}/${s}/${e}?autoPlay=false`
        : `https://vidsrc.cc/v3/embed/movie/${tmdbId}?autoPlay=false`,
    },
    // VidRock — modern provider
    {
      name: 'VidRock',
      url: isTv
        ? `https://vidrock.net/tv/${tmdbId}/${s}/${e}`
        : `https://vidrock.net/movie/${tmdbId}`,
    },
    // VidLink
    {
      name: 'VidLink',
      url: isTv
        ? `https://vidlink.pro/tv/${tmdbId}/${s}/${e}`
        : `https://vidlink.pro/movie/${tmdbId}`,
    },
    // VidFast
    {
      name: 'VidFast',
      url: isTv
        ? `https://vidfast.pro/tv/${tmdbId}/${s}/${e}`
        : `https://vidfast.pro/movie/${tmdbId}`,
    },
    // VidBinge
    {
      name: 'VidBinge',
      url: isTv
        ? `https://vidbinge.dev/embed/tv/${tmdbId}/${s}/${e}`
        : `https://vidbinge.dev/embed/movie/${tmdbId}`,
    },
    // 2Embed
    {
      name: '2Embed',
      url: isTv
        ? `https://www.2embed.cc/embedtv/${tmdbId}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${tmdbId}`,
    },
    // AutoEmbed
    {
      name: 'AutoEmbed',
      url: isTv
        ? `https://player.autoembed.cc/embed/tv/${tmdbId}/${s}/${e}`
        : `https://player.autoembed.cc/embed/movie/${tmdbId}`,
    },
    // Embed.su
    {
      name: 'Embed.su',
      url: isTv
        ? `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`
        : `https://embed.su/embed/movie/${tmdbId}`,
    },
    // MoviesAPI
    {
      name: 'MoviesAPI',
      url: isTv
        ? `https://moviesapi.club/tv/${tmdbId}-${s}-${e}`
        : `https://moviesapi.club/movie/${tmdbId}`,
    },
    // SmashyStream
    {
      name: 'SmashyStream',
      url: isTv
        ? `https://player.smashy.stream/tv/${tmdbId}?s=${s}&e=${e}`
        : `https://player.smashy.stream/movie/${tmdbId}`,
    },
    // SuperEmbed (MultiEmbed) — supports both TMDB and IMDb
    {
      name: 'SuperEmbed',
      url: `https://multiembed.mov/directstream.php?video_id=${tmdbId}&tmdb=1${tvAmp}`,
    },
    // NontonGo
    {
      name: 'NontonGo',
      url: isTv
        ? `https://www.NontonGo.win/embed/tv/?id=${tmdbId}&s=${s}&e=${e}`
        : `https://www.NontonGo.win/embed/movie/?id=${tmdbId}`,
    },
  ];

  // IMDb-based fallbacks (only when we have the IMDb id)
  if (imdbId) {
    servers.push({
      name: 'VidSrc (IMDb)',
      url: isTv
        ? `https://vidsrc.xyz/embed/tv?imdb=${imdbId}&season=${s}&episode=${e}`
        : `https://vidsrc.xyz/embed/movie?imdb=${imdbId}`,
    });
    servers.push({
      name: '2Embed (IMDb)',
      url: isTv
        ? `https://www.2embed.cc/embedtvfull/${imdbId}&s=${s}&e=${e}`
        : `https://www.2embed.cc/embed/${imdbId}`,
    });
  }

  return servers;
};
