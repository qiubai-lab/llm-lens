import { createContext, useContext, useSyncExternalStore } from 'react';
export const ReducedMotionContext = createContext(false);
export const useCalmMotion = () => useContext(ReducedMotionContext);
const query = '(prefers-reduced-motion: reduce)';
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
};
const snapshot = () => window.matchMedia(query).matches;
export const useSystemReducedMotion = () => useSyncExternalStore(subscribe, snapshot, () => false);
