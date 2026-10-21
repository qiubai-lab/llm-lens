import { expect, it } from 'vitest';
import { parseRoute } from './route';
it('AC-004: 分享位置与非法 hash 有安全回退', () => {
  expect(parseRoute('#/token/4')).toEqual({ page: 'token', scene: 3 });
  for (const hash of ['', '#/token/0', '#/token/7', '#/token/NaN', '#/unknown'])
    expect(parseRoute(hash)).toEqual({ page: 'home' });
});

it('AC-005: Agent 深链接与非法幕次', () => {
  expect(parseRoute('#/agent')).toEqual({ page: 'agent', scene: 0 });
  for (let n = 1; n <= 6; n++)
    expect(parseRoute(`#/agent/${n}`)).toEqual({ page: 'agent', scene: 0 });
  for (const hash of ['#/agent/0', '#/agent/7', '#/agent/NaN'])
    expect(parseRoute(hash)).toEqual({ page: 'home' });
});

it('gateway is an independent continuous topic', () => {
  expect(parseRoute('#/gateway')).toEqual({ page: 'gateway', scene: 0 });
  expect(parseRoute('#/gateway/')).toEqual({ page: 'gateway', scene: 0 });
  expect(parseRoute('#/gateway/1')).toEqual({ page: 'home' });
});
