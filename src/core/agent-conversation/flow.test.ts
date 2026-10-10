import { describe, expect, it } from 'vitest';
import { createLesson, projectText, skillText } from './fixtures';
import { replay } from './flow';

describe('Agent 数据流契约', () => {
  it('AC-002: 两次读取、三轮请求，内容与 call_id 贯穿结果和历史', () => {
    const lesson = createLesson(5, 'normal');
    const state = replay(lesson, lesson.events.length);
    expect(state.requests).toHaveLength(3);
    expect(state.calls.map((c) => c.result)).toEqual([skillText, projectText]);
    expect(state.calls.every((c) => c.status === 'succeeded')).toBe(true);
    const last = state.requests[2].body.input;
    for (const call of state.calls) {
      expect(last).toContainEqual({
        type: 'function_call_output',
        call_id: call.callId,
        output: call.result,
      });
      expect(last.some((i) => i.type === 'function_call' && i.call_id === call.callId)).toBe(true);
    }
    expect(state.task).toBe('finished');
    expect(state.answer).toContain('GitHub Pages');
    expect(JSON.stringify(state.requests[0])).not.toContain(projectText);
    expect(JSON.stringify(state.requests[0])).not.toContain(skillText);
  });
  it('AC-003: 不完整参数不执行，工具响应完成仍有待办任务', () => {
    const lesson = createLesson(3, 'normal');
    const delta = lesson.events.findIndex(
      (e) => e.type === 'response.function_call_arguments.delta',
    );
    expect(replay(lesson, delta + 1).calls[0].status).toBe('assembling');
    expect(replay(lesson, delta + 1).executionCount).toBe(0);
    const completed = lesson.events.findIndex((e) => e.type === 'response.completed');
    const state = replay(lesson, completed + 1);
    expect(state.response).toBe('completed');
    expect(state.task).toBe('active');
    expect(state.executionCount).toBe(0);
  });
  it('AC-004: 回看与重建确定，重复执行事件不会重复读取', () => {
    const lesson = createLesson(5, 'normal');
    const full = replay(lesson, lesson.events.length);
    replay(lesson, 8);
    expect(replay(lesson, lesson.events.length)).toEqual(full);
    const withDuplicate = {
      ...lesson,
      events: lesson.events.flatMap((e) => (e.type === 'local.tool_result' ? [e, e] : [e])),
    };
    expect(replay(withDuplicate, withDuplicate.events.length).executionCount).toBe(2);
  });
  it('AC-003: done 不重复追加，参数流不是回答正文', () => {
    const lesson = createLesson(5, 'normal');
    const state = replay(lesson, lesson.events.length);
    const done = lesson.events.find((e) => e.type === 'response.output_text.done')!;
    expect(state.answer).toBe(done.data.text);
    expect(state.answer).not.toContain('"path"');
  });
  it('AC-006: 文件错误被回传，流中断保留部分回答', () => {
    const failed = createLesson(3, 'file-error');
    const failure = replay(failed, failed.events.length);
    expect(failure.calls[0].status).toBe('failed');
    expect(
      failure.requests[1].body.input.some(
        (i) => i.type === 'function_call_output' && String(i.output).includes('FILE_NOT_FOUND'),
      ),
    ).toBe(true);
    expect(failure.task).toBe('blocked');
    const interrupted = createLesson(5, 'interrupted');
    const state = replay(interrupted, interrupted.events.length);
    expect(state.answer.length).toBeGreaterThan(0);
    expect(state.response).toBe('interrupted');
    expect(state.task).toBe('blocked');
  });
});

it('AC-003: 非法路径或过早执行步骤不产生文件内容', () => {
  const lesson = createLesson(3, 'normal');
  const start = lesson.events.find((e) => e.type === 'local.tool_start')!;
  const premature = {
    ...lesson,
    events: lesson.events.flatMap((e) =>
      e.type === 'response.function_call_arguments.delta' ? [e, start] : [e],
    ),
  };
  const untilDone = premature.events.findIndex((e) => e.type === 'response.output_item.done');
  expect(replay(premature, untilDone).executionCount).toBe(0);
  const invalid = {
    ...lesson,
    events: lesson.events.map((e) =>
      e.type === 'response.output_item.done' &&
      (e.data.item as { type: string }).type === 'function_call'
        ? {
            ...e,
            data: {
              ...e.data,
              item: { ...(e.data.item as object), arguments: '{"path":"../../private.md"}' },
            },
          }
        : e,
    ),
  };
  const state = replay(invalid, invalid.events.length);
  expect(state.executionCount).toBe(0);
  expect(state.calls[0].result).toBeUndefined();
  expect(state.task).toBe('blocked');
});
