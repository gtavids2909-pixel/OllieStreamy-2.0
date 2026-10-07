// Virtual 2000s Kids TV channel — YouTube-backed, plays scheduled shows
// like a linear broadcaster (you tune in and see what's on now).
// Times are 24h local. Each slot targets ~30 min; the player computes an
// offset from slot start so it feels live.

export const NOSTALGIA_2000S = [
  // --- Morning block ---
  { start: '06:00', title: 'Bananas in Pyjamas (Classic)', ytId: 'kHW9UtvbAv0', duration: 1500 },
  { start: '06:30', title: 'Play School (2000s)', ytId: 'lNoCPrTGDYc', duration: 1500 },
  { start: '07:00', title: 'The Wiggles - Big Red Car Show', ytId: 'iA6VDsMbSjQ', duration: 1800 },
  { start: '07:30', title: 'Bear in the Big Blue House', ytId: 'B_zsuXbnDS4', duration: 1500 },
  { start: '08:00', title: 'Bob the Builder', ytId: 'wUdyHQzOtBs', duration: 600 },
  { start: '08:15', title: 'Postman Pat (Classic)', ytId: '7NF3XyphYT4', duration: 900 },
  { start: '08:30', title: 'Thomas & Friends (Classic)', ytId: 'l-KGPZS4z9U', duration: 600 },
  { start: '08:45', title: 'Rugrats', ytId: 'JsjJfCFVCK4', duration: 1300 },
  // --- Midday ---
  { start: '09:15', title: 'Barney & Friends', ytId: 'K8vITNs4qYM', duration: 1500 },
  { start: '09:45', title: 'Blue\'s Clues (Classic)', ytId: 'M8sfBpx9Q4o', duration: 1500 },
  { start: '10:15', title: 'Dora the Explorer (2000s)', ytId: 'QdSKmiZmDKI', duration: 1400 },
  { start: '10:45', title: 'Hi-5', ytId: 'YZP7X8xk4WM', duration: 1500 },
  { start: '11:15', title: 'Boohbah', ytId: '4Q1E7HgIhBs', duration: 1500 },
  { start: '11:45', title: 'Tweenies', ytId: 'i7CGD-jvR6Y', duration: 1200 },
  // --- Afternoon ---
  { start: '12:15', title: 'Bananas in Pyjamas', ytId: 'kHW9UtvbAv0', duration: 1500 },
  { start: '12:45', title: 'Little Einsteins', ytId: 'jm38U-mZ1RE', duration: 1500 },
  { start: '13:15', title: 'The Wiggles', ytId: 'iA6VDsMbSjQ', duration: 1800 },
  { start: '13:45', title: 'Play School', ytId: 'lNoCPrTGDYc', duration: 1500 },
  { start: '14:15', title: 'Sesame Street (2000s)', ytId: 'oPFgpNqftMc', duration: 1500 },
  { start: '14:45', title: 'Postman Pat', ytId: '7NF3XyphYT4', duration: 900 },
  { start: '15:00', title: 'Bob the Builder', ytId: 'wUdyHQzOtBs', duration: 600 },
  { start: '15:15', title: 'Thomas & Friends', ytId: 'l-KGPZS4z9U', duration: 600 },
  { start: '15:30', title: 'Rugrats', ytId: 'JsjJfCFVCK4', duration: 1300 },
  { start: '16:00', title: 'Hey Arnold!', ytId: 'C3XyOKzeh3Y', duration: 1500 },
  { start: '16:30', title: 'Kim Possible', ytId: 'nBu5uMY1_2s', duration: 1500 },
  { start: '17:00', title: 'The Powerpuff Girls (Classic)', ytId: 'oo6d5Ky5RGE', duration: 1500 },
  { start: '17:30', title: 'Dexter\'s Laboratory', ytId: 'p8bnrGXKD3g', duration: 900 },
  // --- Bedtime & night block ---
  { start: '18:00', title: 'Giggle and Hoot (Bedtime)', ytId: 'PZDjpH5F9zk', duration: 1200 },
  { start: '18:30', title: 'In the Night Garden', ytId: 'F7HqjS8bJ_M', duration: 1500 },
  { start: '19:00', title: 'Teletubbies (Classic)', ytId: 'RRr5PB2ZfHo', duration: 1500 },
  { start: '19:30', title: 'Bear in the Big Blue House - Goodbye Song', ytId: 'a25wnMZaeuo', duration: 300 },
  { start: '19:35', title: 'Rosie & Jim', ytId: 'PdvxLBzWmKM', duration: 900 },
  { start: '19:50', title: 'Fifi and the Flowertots (Bedtime)', ytId: 'GdI0iODeeGE', duration: 1200 },
  { start: '20:10', title: 'Boobah - Sleep', ytId: '4Q1E7HgIhBs', duration: 1200 },
  { start: '20:30', title: 'In the Night Garden - Bedtime Special', ytId: 'F7HqjS8bJ_M', duration: 1500 },
  { start: '21:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '22:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '23:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '00:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '01:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '02:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '03:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '04:00', title: 'Overnight Lullabies', ytId: 'LU_hPBGjssg', duration: 3600 },
  { start: '05:00', title: 'Wake Up Play School', ytId: 'lNoCPrTGDYc', duration: 1500 },
  { start: '05:30', title: 'The Wiggles - Morning', ytId: 'iA6VDsMbSjQ', duration: 1800 },
];

// Compute what's on right now, next up, and how many seconds we are into current slot.
export function getNostalgiaLive() {
  const list = NOSTALGIA_2000S;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const secs = mins * 60 + now.getSeconds();
  const toSecs = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 3600 + m * 60;
  };
  let currentIdx = -1;
  for (let i = 0; i < list.length; i++) {
    if (toSecs(list[i].start) <= secs) currentIdx = i;
  }
  if (currentIdx === -1) currentIdx = list.length - 1;
  const nextIdx = (currentIdx + 1) % list.length;
  const offset = Math.max(0, secs - toSecs(list[currentIdx].start));
  return {
    now: list[currentIdx],
    next: list[nextIdx],
    offset: Math.min(offset, list[currentIdx].duration - 5),
  };
}
