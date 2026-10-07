// Approximate daily schedules for kids channels — used to compute "on now" client-side.
// times are 24h local. Slots wrap over midnight where noted.
export const SCHEDULES = {
  'ABC Kids': [
    { start: '05:00', title: 'Bananas in Pyjamas' },
    { start: '05:30', title: 'Peppa Pig' },
    { start: '06:00', title: 'Bluey' },
    { start: '07:00', title: 'Play School' },
    { start: '07:30', title: 'Hey Duggee' },
    { start: '08:00', title: 'Bluey' },
    { start: '09:00', title: 'Play School' },
    { start: '09:30', title: 'Bananas in Pyjamas' },
    { start: '10:00', title: 'Sesame Street' },
    { start: '11:00', title: 'Kiri and Lou' },
    { start: '11:30', title: 'Peppa Pig' },
    { start: '12:00', title: 'Bluey' },
    { start: '13:00', title: 'Play School' },
    { start: '14:00', title: 'Hey Duggee' },
    { start: '15:00', title: 'Bananas in Pyjamas' },
    { start: '16:00', title: 'Bluey' },
    { start: '17:00', title: 'Play School' },
    { start: '17:30', title: 'Peppa Pig' },
    { start: '18:00', title: 'Giggle and Hoot' },
    { start: '18:30', title: 'Bedtime Stories with Giggle and Hoot' },
    { start: '19:00', title: 'Bluey (Bedtime)' },
    { start: '19:30', title: 'ABC Kids Overnight Lullabies' },
  ],
  'CBeebies': [
    { start: '06:00', title: 'Bing' },
    { start: '06:30', title: 'Hey Duggee' },
    { start: '07:00', title: 'Peppa Pig' },
    { start: '07:30', title: 'Bluey' },
    { start: '08:00', title: 'Numberblocks' },
    { start: '09:00', title: 'Waffle the Wonder Dog' },
    { start: '10:00', title: 'Something Special' },
    { start: '11:00', title: 'Old Jack\'s Boat' },
    { start: '12:00', title: 'Postman Pat' },
    { start: '13:00', title: 'Peppa Pig' },
    { start: '14:00', title: 'Sarah & Duck' },
    { start: '15:00', title: 'Hey Duggee' },
    { start: '16:00', title: 'Bluey' },
    { start: '17:00', title: 'Octonauts' },
    { start: '17:30', title: 'Bing' },
    { start: '18:00', title: 'Waybuloo' },
    { start: '18:30', title: 'In the Night Garden' },
    { start: '19:00', title: 'CBeebies Bedtime Stories' },
    { start: '19:30', title: 'Goodnight to CBeebies' },
  ],
  'Nick Jr.': [
    { start: '06:00', title: 'Paw Patrol' },
    { start: '07:00', title: 'Blaze and the Monster Machines' },
    { start: '08:00', title: 'Peppa Pig' },
    { start: '09:00', title: 'Bubble Guppies' },
    { start: '10:00', title: 'Dora the Explorer' },
    { start: '11:00', title: 'PAW Patrol' },
    { start: '12:00', title: 'Peppa Pig' },
    { start: '13:00', title: 'Blue\'s Clues & You' },
    { start: '14:00', title: 'Rubble & Crew' },
    { start: '15:00', title: 'Paw Patrol' },
    { start: '16:00', title: 'Peppa Pig' },
    { start: '17:00', title: 'Bubble Guppies' },
    { start: '18:00', title: 'Paw Patrol' },
    { start: '19:00', title: 'Peppa Pig Bedtime' },
    { start: '20:00', title: 'Nick Jr. Bedtime Stories' },
  ],
  'Disney Junior': [
    { start: '06:00', title: 'Mickey Mouse Clubhouse' },
    { start: '07:00', title: 'Bluey' },
    { start: '08:00', title: 'Minnie\'s Bow-Toons' },
    { start: '09:00', title: 'Puppy Dog Pals' },
    { start: '10:00', title: 'Mickey Mouse Funhouse' },
    { start: '11:00', title: 'Bluey' },
    { start: '12:00', title: 'Marvel\'s Spidey and His Amazing Friends' },
    { start: '13:00', title: 'Mickey Mouse Clubhouse' },
    { start: '14:00', title: 'Bluey' },
    { start: '15:00', title: 'Puppy Dog Pals' },
    { start: '16:00', title: 'Firebuds' },
    { start: '17:00', title: 'Bluey' },
    { start: '18:00', title: 'Minnie\'s Bow-Toons' },
    { start: '19:00', title: 'Mickey Mouse Bedtime' },
  ],
};

// Utility: return { now, next } for a channel based on current local time
export function getOnAir(channelName) {
  const list = SCHEDULES[channelName];
  if (!list) return null;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  // find current slot (latest start <= now)
  let currentIdx = -1;
  for (let i = 0; i < list.length; i++) {
    if (toMins(list[i].start) <= mins) currentIdx = i;
  }
  // if before first slot, show last slot (overnight)
  if (currentIdx === -1) currentIdx = list.length - 1;
  const nextIdx = (currentIdx + 1) % list.length;
  return { now: list[currentIdx], next: list[nextIdx] };
}
