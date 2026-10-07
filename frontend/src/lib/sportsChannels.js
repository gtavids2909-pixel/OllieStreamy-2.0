// -----------------------------------------------------------------------------
// Live-TV channel catalog for Sports + Live Movies.
// Each channel is served by multiple third-party iframe providers so if one
// mirror is blocked / down, the user can switch to another.
//
// URL patterns we build from (slugs confirmed from live pages):
//   sportsbite.org   ->  https://sportsbite.org/watch/channel/{kebab-slug}
//   streamsports99   ->  https://streamsports99.ru/live-tv/{Name%20With%20Spaces}__us
//   iptv-web.app     ->  https://iptv-web.app/{CC}/{ChannelName}.{cc}/
//   ntv.st           ->  https://ntv.st/channel/{slug}/{numericId}
//   famelack.com     ->  https://famelack.com/tv/{cc}/{opaqueId}
// -----------------------------------------------------------------------------

const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Build the generic server list every channel gets. Pass overrides when a
// provider needs a specific slug/path (ntv.st, famelack need explicit ids).
function serversFor({
  name,
  // sportsbite.org slug — default to kebab of name
  sportsbiteSlug,
  // streamsports99 label — default to the name itself (space-encoded)
  streamsportsLabel,
  // iptv-web.app country code + localized name
  iptvCountry,
  iptvName,
  iptvCode,
  // explicit overrides for the opaque-id providers
  ntvSt,            // { slug, id }
  famelack,         // { cc, id }
}) {
  const list = [];
  const sb = sportsbiteSlug || kebab(name);
  list.push({ name: 'SportsBite', url: `https://sportsbite.org/watch/channel/${sb}` });

  const ssLabel = streamsportsLabel || name;
  list.push({
    name: 'StreamSports99',
    url: `https://streamsports99.ru/live-tv/${encodeURIComponent(ssLabel)}__us`,
  });

  if (iptvCountry && iptvName && iptvCode) {
    list.push({
      name: 'IPTV-Web',
      url: `https://iptv-web.app/${iptvCountry}/${iptvName}.${iptvCode}/`,
    });
  }
  if (ntvSt?.slug && ntvSt?.id) {
    list.push({ name: 'NTV.ST', url: `https://ntv.st/channel/${ntvSt.slug}/${ntvSt.id}` });
  }
  if (famelack?.cc && famelack?.id) {
    list.push({ name: 'Famelack', url: `https://famelack.com/tv/${famelack.cc}/${famelack.id}` });
  }
  return list;
}

export const CATEGORIES = [
  { key: 'cricket',    name: 'Cricket',       emoji: '🏏' },
  { key: 'soccer',     name: 'Soccer',        emoji: '⚽' },
  { key: 'nfl',        name: 'NFL',           emoji: '🏈' },
  { key: 'nba',        name: 'Basketball',    emoji: '🏀' },
  { key: 'baseball',   name: 'Baseball',      emoji: '⚾' },
  { key: 'f1',         name: 'Motorsports',   emoji: '🏎️' },
  { key: 'combat',     name: 'UFC / Boxing',  emoji: '🥊' },
  { key: 'tennis',     name: 'Tennis',        emoji: '🎾' },
  { key: 'golf',       name: 'Golf',          emoji: '⛳' },
  { key: 'wwe',        name: 'Wrestling',     emoji: '🤼' },
  { key: 'multi',      name: 'Multi-Sport',   emoji: '📺' },
  { key: 'news',       name: 'Sports News',   emoji: '📰' },
  { key: 'movies',     name: 'Live Movies',   emoji: '🎬' },
];

// Each channel: { name, categories: [key, ...], country, logo (optional), desc }
// `servers` is derived from serversFor() + per-channel overrides.
const RAW_CHANNELS = [
  // -------------------  CRICKET  -------------------
  {
    name: 'Sony Sports Network',
    categories: ['cricket', 'multi'],
    country: 'IN',
    desc: 'Cricket, UFC, La Liga and more — India’s multi-sport home.',
    sportsbiteSlug: 'sony-sports-network',
    iptv: { c: 'IN', n: 'SonyTenHD', code: 'in' },
  },
  { name: 'Sony Ten 1',  categories: ['cricket'], country: 'IN', desc: 'Cricket, boxing, football.',
    ntvSt: { slug: 'phoenix', id: '885' }, iptv: { c: 'IN', n: 'SonyTen1', code: 'in' } },
  { name: 'Sony Ten 2',  categories: ['cricket'], country: 'IN', desc: 'Cricket & WWE.',
    iptv: { c: 'IN', n: 'SonyTen2', code: 'in' } },
  { name: 'Sony Ten 3',  categories: ['cricket'], country: 'IN', desc: 'Hindi cricket commentary.',
    iptv: { c: 'IN', n: 'SonyTen3', code: 'in' } },
  { name: 'Sony Ten 4',  categories: ['cricket'], country: 'IN', desc: 'Tamil / Telugu cricket.',
    iptv: { c: 'IN', n: 'SonyTen4', code: 'in' } },
  { name: 'Sony Ten 5',  categories: ['cricket', 'wwe'], country: 'IN', desc: 'WWE and more.',
    iptv: { c: 'IN', n: 'SonyTen5', code: 'in' } },
  { name: 'Star Sports 1',  categories: ['cricket'], country: 'IN', desc: 'IPL, international cricket.',
    sportsbiteSlug: 'star-sports-1', iptv: { c: 'IN', n: 'StarSports1', code: 'in' } },
  { name: 'Star Sports 2',  categories: ['cricket', 'multi'], country: 'IN', desc: 'Cricket, kabaddi, tennis.',
    iptv: { c: 'IN', n: 'StarSports2', code: 'in' } },
  { name: 'Star Sports Select 1',  categories: ['soccer', 'multi'], country: 'IN', desc: 'EPL and more.',
    iptv: { c: 'IN', n: 'StarSportsSelect1', code: 'in' } },
  { name: 'Willow Cricket', categories: ['cricket'], country: 'US', desc: 'US-based 24/7 cricket.',
    streamsportsLabel: 'Willow Cricket' },
  { name: 'Willow Xtra', categories: ['cricket'], country: 'US', desc: 'Overflow cricket channel.',
    streamsportsLabel: 'Willow Xtra' },
  { name: 'Astro Cricket', categories: ['cricket'], country: 'MY', desc: 'Malaysia’s cricket feed.',
    streamsportsLabel: 'Astro Cricket' },
  { name: 'PTV Sports', categories: ['cricket', 'multi'], country: 'PK', desc: 'Pakistan multi-sport.',
    sportsbiteSlug: 'ptv-sports' },
  { name: 'Fox Cricket', categories: ['cricket'], country: 'AU', desc: 'Australian cricket home.',
    sportsbiteSlug: 'fox-cricket' },
  { name: 'SuperSport Cricket', categories: ['cricket'], country: 'ZA', desc: 'South Africa cricket.',
    sportsbiteSlug: 'supersport-cricket' },

  // -------------------  SOCCER / FOOTBALL  -------------------
  { name: 'Sky Sports Football', categories: ['soccer'], country: 'UK', desc: 'EFL, EPL build-up.',
    sportsbiteSlug: 'sky-sports-football' },
  { name: 'Sky Sports Premier League', categories: ['soccer'], country: 'UK', desc: 'Live Premier League.',
    sportsbiteSlug: 'sky-sports-premier-league' },
  { name: 'TNT Sports 1', categories: ['soccer', 'multi'], country: 'UK', desc: 'Champions League, boxing.',
    sportsbiteSlug: 'tnt-sports-1' },
  { name: 'TNT Sports 2', categories: ['soccer', 'multi'], country: 'UK', desc: 'Secondary TNT feed.',
    sportsbiteSlug: 'tnt-sports-2' },
  { name: 'beIN Sports 1', categories: ['soccer'], country: 'US', desc: 'Spanish, French football.',
    sportsbiteSlug: 'bein-sports-1' },
  { name: 'beIN Sports 2', categories: ['soccer'], country: 'US', desc: 'La Liga, Ligue 1.',
    sportsbiteSlug: 'bein-sports-2' },
  { name: 'ESPN FC', categories: ['soccer'], country: 'US', desc: 'Soccer talk and highlights.',
    sportsbiteSlug: 'espn-fc' },
  { name: 'La Liga TV', categories: ['soccer'], country: 'ES', desc: '24/7 Spanish football.',
    sportsbiteSlug: 'laliga-tv' },
  { name: 'Setanta Sports 1', categories: ['soccer', 'combat'], country: 'IE', desc: 'EPL, boxing.',
    sportsbiteSlug: 'setanta-sports-1' },

  // -------------------  NFL  -------------------
  { name: 'NFL Network', categories: ['nfl'], country: 'US', desc: '24/7 NFL games & news.',
    sportsbiteSlug: 'nfl-network' },
  { name: 'NFL RedZone', categories: ['nfl'], country: 'US', desc: 'Every touchdown, every Sunday.',
    sportsbiteSlug: 'nfl-redzone' },

  // -------------------  NBA / BASKETBALL  -------------------
  { name: 'NBA TV', categories: ['nba'], country: 'US', desc: 'League-pass, classic games.',
    sportsbiteSlug: 'nba-tv' },

  // -------------------  BASEBALL  -------------------
  { name: 'MLB Network', categories: ['baseball'], country: 'US', desc: '24/7 Major League Baseball.',
    sportsbiteSlug: 'mlb-network' },

  // -------------------  MOTORSPORTS / F1  -------------------
  { name: 'Sky Sports F1', categories: ['f1'], country: 'UK', desc: 'Every F1 race weekend.',
    sportsbiteSlug: 'sky-sports-f1' },
  { name: 'Motorsport.tv', categories: ['f1'], country: 'INT', desc: 'MotoGP, WEC and more.',
    sportsbiteSlug: 'motorsport-tv' },

  // -------------------  COMBAT  -------------------
  { name: 'UFC Fight Pass', categories: ['combat'], country: 'US', desc: 'UFC & archives.',
    sportsbiteSlug: 'ufc-fight-pass' },
  { name: 'DAZN', categories: ['combat'], country: 'US', desc: 'Boxing & MMA.',
    sportsbiteSlug: 'dazn' },

  // -------------------  TENNIS  -------------------
  { name: 'Tennis Channel', categories: ['tennis'], country: 'US', desc: 'ATP, WTA, Grand Slams.',
    sportsbiteSlug: 'tennis-channel' },
  { name: 'Sky Sports Tennis', categories: ['tennis'], country: 'UK', desc: 'UK tennis coverage.',
    sportsbiteSlug: 'sky-sports-tennis' },

  // -------------------  GOLF  -------------------
  { name: 'Golf Channel', categories: ['golf'], country: 'US', desc: 'PGA tour and more.',
    sportsbiteSlug: 'golf-channel' },
  { name: 'Sky Sports Golf', categories: ['golf'], country: 'UK', desc: 'PGA, DP World Tour, Majors.',
    sportsbiteSlug: 'sky-sports-golf' },

  // -------------------  WWE / WRESTLING  -------------------
  { name: 'WWE Network', categories: ['wwe'], country: 'US', desc: 'Raw, SmackDown, PLE replays.',
    sportsbiteSlug: 'wwe-network' },

  // -------------------  MULTI-SPORT  -------------------
  { name: 'ESPN', categories: ['multi'], country: 'US', desc: 'Flagship US sports channel.',
    sportsbiteSlug: 'espn' },
  { name: 'ESPN 2', categories: ['multi'], country: 'US', desc: 'Overflow US sports.',
    sportsbiteSlug: 'espn-2' },
  { name: 'ESPN 3', categories: ['multi'], country: 'US', desc: 'ESPN overflow events.',
    sportsbiteSlug: 'espn-3' },
  { name: 'Fox Sports 1', categories: ['multi', 'nfl'], country: 'US', desc: 'NFL, UFC, MLB.',
    sportsbiteSlug: 'fox-sports-1' },
  { name: 'Fox Sports 2', categories: ['multi'], country: 'US', desc: 'Soccer, racing.',
    sportsbiteSlug: 'fox-sports-2' },
  { name: 'Sky Sports Main Event', categories: ['multi'], country: 'UK', desc: 'Biggest live event.',
    sportsbiteSlug: 'sky-sports-main-event' },
  { name: 'Sky Sports Action', categories: ['multi'], country: 'UK', desc: 'NFL, rugby, boxing.',
    sportsbiteSlug: 'sky-sports-action' },
  { name: 'Sky Sports Arena', categories: ['multi'], country: 'UK', desc: 'Darts, netball, NBA.',
    sportsbiteSlug: 'sky-sports-arena' },

  // -------------------  SPORTS NEWS  -------------------
  { name: 'Sky Sports News', categories: ['news'], country: 'UK', desc: '24/7 sports headlines.',
    sportsbiteSlug: 'sky-sports-news' },
  { name: 'ESPN News', categories: ['news'], country: 'US', desc: 'Breaking US sports.',
    sportsbiteSlug: 'espn-news' },

  // -------------------  LIVE MOVIE CHANNELS  -------------------
  { name: 'HBO', categories: ['movies'], country: 'US', desc: 'Prestige originals and films.',
    sportsbiteSlug: 'hbo' },
  { name: 'HBO 2', categories: ['movies'], country: 'US', desc: 'HBO overflow.',
    sportsbiteSlug: 'hbo-2' },
  { name: 'Cinemax', categories: ['movies'], country: 'US', desc: 'Action and blockbusters.',
    sportsbiteSlug: 'cinemax' },
  { name: 'Showtime', categories: ['movies'], country: 'US', desc: 'Originals and movies.',
    sportsbiteSlug: 'showtime' },
  { name: 'Starz', categories: ['movies'], country: 'US', desc: 'Starz originals and films.',
    sportsbiteSlug: 'starz' },
  { name: 'TCM', categories: ['movies'], country: 'US', desc: 'Turner Classic Movies.',
    sportsbiteSlug: 'tcm' },
  { name: 'FXM', categories: ['movies'], country: 'US', desc: 'Fox movies channel.',
    sportsbiteSlug: 'fxm' },
  { name: 'Movies Now', categories: ['movies'], country: 'IN', desc: 'Hollywood in India.',
    sportsbiteSlug: 'movies-now' },
  { name: '&flix', categories: ['movies'], country: 'IN', desc: 'Hollywood blockbusters IN.',
    sportsbiteSlug: 'and-flix' },
  { name: 'Polimer TV', categories: ['movies'], country: 'IN', desc: 'Tamil GEC + movies.',
    iptv: { c: 'IN', n: 'PolimerTV', code: 'in' },
    famelack: { cc: 'in', id: 'dWV1CU8Rzdsj5g' } },
];

export const CHANNELS = RAW_CHANNELS.map((c) => ({
  ...c,
  slug: kebab(c.name),
  logo: `https://ui-avatars.com/api/?background=15151f&color=a8aeff&bold=true&size=128&name=${encodeURIComponent(
    c.name.split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || c.name.slice(0, 2),
  )}`,
  servers: serversFor({
    name: c.name,
    sportsbiteSlug: c.sportsbiteSlug,
    streamsportsLabel: c.streamsportsLabel,
    iptvCountry: c.iptv?.c,
    iptvName: c.iptv?.n,
    iptvCode: c.iptv?.code,
    ntvSt: c.ntvSt,
    famelack: c.famelack,
  }),
}));

export function channelsByCategory(key) {
  return CHANNELS.filter((c) => c.categories.includes(key));
}
