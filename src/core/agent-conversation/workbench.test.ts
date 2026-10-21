import { expect, it } from 'vitest';
import { createLesson } from './fixtures';
import { replay } from './flow';
import {
  interactionGate,
  buildActivities,
  currentTransfer,
  activityTransfers,
  transferHistory,
} from './workbench';

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
  expect(transfers.find((t) => t.kind === 'result')?.from).toBe('tool-call_skill-result');
  expect(transfers.find((t) => t.kind === 'continuation')?.from).toBe('agent-result-call_skill');
  expect(transfers.find((t) => t.kind === 'call')?.to).toBe('agent-call-call_skill');
});

it('AC-003: 选中未确认的工具卡只恢复调度，已执行卡恢复完整关联', () => {
  const lesson = createLesson(5, 'normal');
  const ready = lesson.events.findIndex((e) => e.type === 'local.tool_start');
  const before = replay(lesson, ready);
  const pending = activityTransfers(lesson, ready, 'server-call-call_skill');
  expect(pending.map((t) => t.kind)).toEqual(['call', 'dispatch']);
  expect(replay(lesson, ready)).toEqual(before);
  const links = activityTransfers(lesson, lesson.events.length, 'server-call-call_skill');
  expect(links.map((t) => t.kind)).toEqual(['call', 'dispatch', 'execute', 'result']);
  expect(links[2].to).toBe('file-skills/project-summary/SKILL.md');
  expect(links[3].from).toBe('tool-call_skill-result');
  expect(replay(lesson, lesson.events.length).executionCount).toBe(2);
});
it('AC-003: 请求/工具结果/回答卡恢复对应聊天连接', () => {
  const lesson = createLesson(5, 'normal'),
    end = lesson.events.length;
  expect(activityTransfers(lesson, end, 'server-request-1')[0].from).toBe('composer');
  const result = activityTransfers(lesson, end, 'server-request-3');
  expect(result[0].from).toBe('agent-result-call_file');
  expect(result.some((t) => t.to === 'file-notes/project.md')).toBe(true);
  expect(activityTransfers(lesson, end, 'server-answer-3')[0].to).toBe('answer');
  expect(activityTransfers(lesson, end, 'missing')).toEqual([]);
});

it('AC-001: 累计连接按首次语义传递编号，增量不重复，前缀稳定', () => {
  const lesson = createLesson(5, 'normal');
  const end = transferHistory(lesson, lesson.events.length);
  expect(end.map((t) => t.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  expect(end.map((t) => t.kind)).toEqual([
    'request',
    'call',
    'dispatch',
    'execute',
    'result',
    'continuation',
    'call',
    'dispatch',
    'execute',
    'result',
    'continuation',
    'text',
  ]);
  for (let cursor = 0; cursor <= lesson.events.length; cursor++) {
    const prefix = transferHistory(lesson, cursor);
    expect(prefix).toEqual(end.slice(0, prefix.length));
  }
  expect(end.filter((t) => t.kind === 'text')).toHaveLength(1);
  expect(transferHistory(lesson, 0)).toEqual([]);
});
it('AC-001: 失败结果标签与中断历史不冒充额外执行', () => {
  const failed = createLesson(5, 'file-error');
  expect(
    transferHistory(failed, failed.events.length).find(
      (t) => t.kind === 'result' && t.from === 'tool-call_file-result',
    )?.label,
  ).toBe('返回错误');
  const interrupted = createLesson(5, 'interrupted');
  expect(
    transferHistory(interrupted, interrupted.events.length).filter((t) => t.kind === 'execute'),
  ).toHaveLength(2);
});
