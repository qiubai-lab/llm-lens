import { expect, it } from 'vitest';
import { parseRoute } from './route';
it('AC-004: 分享位置与非法 hash 有安全回退', () => {
  expect(parseRoute('#/token/4')).toEqual({ page: 'token', scene: 3 });
  for (const hash of ['', '#/token/0', '#/token/7', '#/token/NaN', '#/unknown'])
    expect(parseRoute(hash)).toEqual({ page: 'home' });
});
