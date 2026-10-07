import { useEffect, useState } from 'react';
import { getFavs, getRecent, onLiveStoreChange } from './livetv';

export default function useLiveStore() {
  const [state, setState] = useState(() => ({ favs: getFavs(), recent: getRecent() }));
  useEffect(() => onLiveStoreChange(() => setState({ favs: getFavs(), recent: getRecent() })), []);
  return state;
}
