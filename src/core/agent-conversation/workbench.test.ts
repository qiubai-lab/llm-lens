import { expect, it } from 'vitest';
import { createLesson } from './fixtures';
import { replay } from './flow';
import { interactionGate, buildActivities, currentTransfer } from './workbench';

it('AC-002: 每章从发送开始，工具执行仅在完整调用之后可交互', () => {
  for (let scene = 0; scene < 6; scene++)
    expect(createLesson(scene, 'normal').initialCursor).toBe(0);
  const lesson = createLesson(2, 'normal');
  const start = lesson.events.findIndex((e) => e.type === 'local.tool_start');
  expect(start).toBeGreaterThan(0);
  expect(interactionGate(lesson, start)?.callId).toBe('call_file');
  expect(replay(lesson, start).executionCount).toBe(0);
  expect(interactionGate(lesson, start - 1)).toBeUndefined();
  expect(interactionGate(lesson, start + 1)).toBeUndefined();
});
it('AC-003: 服务端行为卡依序追加，参数与正文更新同一张卡', () => {
  const lesson = createLesson(5, 'normal');
  const cards = buildActivities(lesson, lesson.events.length);
  expect(cards.map((c) => c.kind)).toEqual([
    'request',
    'call',
    'request',
    'call',
    'request',
    'answer',
  ]);
  expect(cards.filter((c) => c.kind === 'call').map((c) => c.callId)).toEqual([
    'call_skill',
    'call_file',
  ]);
  expect(cards.at(-1)?.content).toContain('GitHub Pages');
});
it('AC-004: 发送、调用、执行、结果、续请求和正文连接对应数据锚点', () => {
  const lesson = createLesson(5, 'normal');
  const transfers = lesson.events.flatMap((e, i) => {
    const value = currentTransfer(lesson, i + 1);
    return value?.id === e.id ? [value] : [];
  });
  for (const kind of ['request', 'call', 'execute', 'result', 'continuation', 'text'])
    expect(transfers.some((t) => t.kind === kind)).toBe(true);
  expect(transfers.find((t) => t.kind === 'result')?.from).toBe('terminal-call_skill');
  expect(transfers.find((t) => t.kind === 'continuation')?.from).toBe('agent-result-call_skill');
  expect(transfers.find((t) => t.kind === 'call')?.to).toBe('agent-call-call_skill');
});
