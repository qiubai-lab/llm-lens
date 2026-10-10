import { scenes } from '../core/lesson';
export type Route = { page: 'home' } | { page: 'token' | 'agent'; scene: number };
export function parseRoute(hash: string): Route {
  const match = /^#\/(token|agent)\/(\d+)$/.exec(hash);
  if (match) {
    const n = Number(match[2]);
    if (n >= 1 && n <= scenes.length) return { page: match[1] as 'token' | 'agent', scene: n - 1 };
  }
  return { page: 'home' };
}
export const sceneHref = (scene: number, page: 'token' | 'agent' = 'token') =>
  `#/${page}/${scene + 1}`;
