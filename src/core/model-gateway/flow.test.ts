import { describe, expect, it } from 'vitest';
import {
  channels,
  createEvents,
  replayGateway,
  selectChannel,
  upstreamBody,
  conversionChannel,
  type Scenario,
} from './flow';

const end = (scenario: Scenario, random = 0.2) => {
  const events = createEvents(scenario, random);
  return replayGateway(events, events.length, scenario === 'quota' ? 50 : 1000);
};
describe('gateway routing and request lifecycle', () => {
  it('uses weights only within the selected priority and falls back by priority', () => {
    expect(selectChannel(channels, 1, 0.2)?.id).toBe('A');
    expect(selectChannel(channels, 1, 0.85)?.id).toBe('B');
    expect(selectChannel(channels, 2, 0.2)?.id).toBe('C');
    expect(selectChannel([], 1, 0.2)).toBeUndefined();
  });
  it.each(['denied', 'forbidden', 'limited', 'unavailable', 'quota'] as Scenario[])(
    '%s stops before any upstream attempt or reservation',
    (scenario) => {
      const state = end(scenario);
      expect(state.attempts).toEqual([]);
      expect(state.billing).toBe('none');
      expect(state.response).toBe('rejected');
      expect(state.available).toBe(scenario === 'quota' ? 50 : 1000);
      expect(state.answer).toBe('');
    },
  );
  it('reserves before sending and settles the difference exactly once', () => {
    const events = createEvents('normal');
    const reserved = events.findIndex((e) => e.kind === 'reserved');
    expect(reserved).toBeLessThan(events.findIndex((e) => e.kind === 'started'));
    expect(replayGateway(events, reserved + 1)).toMatchObject({
      available: 900,
      reserved: 100,
      charged: 0,
    });
    const final = replayGateway([...events, ...events], events.length * 2);
    expect(final).toMatchObject({
      available: 960,
      reserved: 0,
      charged: 40,
      returned: 60,
      response: 'completed',
    });
    expect(final.answer).toBe('模型网关统一接入不同模型服务，并管理访问、路由和用量。');
    expect(final.attempts).toHaveLength(1);
  });
  it('retries under one billing lifecycle and preserves the failed attempt', () => {
    const events = createEvents('retry');
    expect(events.filter((e) => e.kind === 'received')).toHaveLength(1);
    expect(events.filter((e) => e.kind === 'reserved')).toHaveLength(1);
    expect(end('retry').attempts).toEqual([
      { channel: 'A', status: 'failed' },
      { channel: 'C', status: 'completed' },
    ]);
    expect(end('retry').available).toBe(960);
    const adapted = events.find((e) => e.kind === 'adapted' && e.channel?.id === 'C');
    expect(adapted?.channel?.protocol).toBe('Messages');
    expect(adapted?.detail).toMatchObject({ endpoint: '/v1/messages' });
    expect(JSON.stringify(upstreamBody(channels[2]))).not.toContain('stream_options');
  });
  it('respects single-attempt binding and refunds only the selected pre-output failures', () => {
    expect(end('strict').attempts).toHaveLength(1);
    expect(end('exhausted').attempts).toHaveLength(2);
    for (const scenario of ['strict', 'exhausted'] as const)
      expect(end(scenario)).toMatchObject({
        response: 'rejected',
        billing: 'refunded',
        reserved: 0,
        available: 1000,
        charged: 0,
      });
  });
  it('keeps partial output and uncertain accounting separate on interruption', () => {
    expect(end('interrupted')).toMatchObject({
      answer: '模型网关统一接入不同模型服务，',
      response: 'interrupted',
      billing: 'uncertain',
      available: 900,
      reserved: 100,
    });
    expect(
      createEvents('interrupted').some((e) => e.kind === 'settled' || e.kind === 'refunded'),
    ).toBe(false);
  });
  it('converts only the selected sample fields and keeps history pure', () => {
    expect(upstreamBody(conversionChannel)).toMatchObject({
      model: 'claude-demo',
      stream: true,
      messages: [{ role: 'user', content: '用一句话解释模型网关。' }],
    });
    expect(JSON.stringify(upstreamBody(conversionChannel))).not.toContain('stream_options');
    const events = createEvents('convert');
    const copy = JSON.stringify(events);
    const final = replayGateway(events, events.length);
    replayGateway(events, 4);
    expect(replayGateway(events, events.length)).toEqual(final);
    expect(JSON.stringify(events)).toBe(copy);
  });
});
