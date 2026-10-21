import { scenes } from '../core/lesson';
export type Route = { page: 'home' } | { page: 'token' | 'agent' | 'gateway'; scene: number };
export function parseRoute(hash: string): Route {
  if (/^#\/gateway\/?$/.test(hash)) return { page: 'gateway', scene: 0 };
  if (/^#\/agent\/?$/.test(hash)) return { page: 'agent', scene: 0 };
  const match = /^#\/(token|agent)\/(\d+)$/.exec(hash);
  if (match) {
    const n = Number(match[2]);
    if (n >= 1 && n <= scenes.length)
      return {
        page: match[1] as 'token' | 'agent' | 'gateway',
        scene: match[1] === 'agent' ? 0 : n - 1,
      };
  }
  return { page: 'home' };
}
export const sceneHref = (scene: number, page: 'token' | 'agent' | 'gateway' = 'token') =>
  page !== 'token' ? `#/${page}` : `#/token/${scene + 1}`;
