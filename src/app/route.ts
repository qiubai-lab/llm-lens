import { scenes } from '../core/lesson';
export type Route = { page: 'home' } | { page: 'token'; scene: number };
export function parseRoute(hash: string): Route {
  const match = /^#\/token\/(\d+)$/.exec(hash);
  if (match) {
    const n = Number(match[1]);
    if (n >= 1 && n <= scenes.length) return { page: 'token', scene: n - 1 };
  }
  return { page: 'home' };
}
export const sceneHref = (scene: number) => `#/token/${scene + 1}`;
