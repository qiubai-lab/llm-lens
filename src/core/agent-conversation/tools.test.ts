// QB-20261013-agent-tools AC-001/003/004: simulated operations and read-only inspection.
import { expect, it } from 'vitest';
import { createLesson, projectPath } from './fixtures';
import { replay } from './flow';
import { toolDefinitions } from './tools';
import { activitySnapshot, visibleTransfers, isToolTransfer, activeToolCall } from './workbench';

it('三个工具可用，保存任务列目录、读取并写入，结果进入续请求', () => {
  const lesson = createLesson(5, 'normal', 'save-summary');
  const end = replay(lesson, lesson.events.length);
  expect(toolDefinitions.map((t) => t.name)).toEqual(['read_file', 'write_file', 'list_directory']);
  expect(end.calls.map((c) => c.name)).toEqual([
    'list_directory',
    'read_file',
    'read_file',
    'write_file',
  ]);
  expect(end.requests).toHaveLength(5);
  expect(end.requests.every((r) => r.body.tools.length === 3)).toBe(true);
  expect(JSON.parse(end.calls[0].result!).entries).toEqual([{ name: 'project.md', type: 'file' }]);
  expect(end.files['notes/summary.md']).toContain('GitHub Pages');
  expect(end.requests.at(-1)?.body.input).toContainEqual({
    type: 'function_call_output',
    call_id: 'call_write',
    output: end.calls.at(-1)?.result,
  });
});

it('写入结果之前没有新文件，重复结果不重复执行，重建恢复初态', () => {
  const lesson = createLesson(5, 'normal', 'save-summary');
  const result = lesson.events.findIndex(
    (e) => e.type === 'local.tool_result' && e.data.call_id === 'call_write',
  );
  expect(replay(lesson, result).files['notes/summary.md']).toBeUndefined();
  const duplicated = {
    ...lesson,
    events: lesson.events.flatMap((e) => (e.type === 'local.tool_result' ? [e, e] : [e])),
  };
  const end = replay(duplicated, duplicated.events.length);
  expect(end.executionCount).toBe(4);
  expect(replay(lesson, 0).files['notes/summary.md']).toBeUndefined();
});

it('越界写入或非法参数不会修改文件', () => {
  const lesson = createLesson(5, 'normal', 'save-summary');
  for (const args of [
    { path: projectPath, content: '覆盖原文件' },
    { path: 'notes/summary.md', content: 42 },
    { path: '../private.md', content: '越界' },
  ]) {
    const invalid = {
      ...lesson,
      events: lesson.events.map((e) => {
        const item = e.data.item as { name?: string } | undefined;
        return e.type === 'response.output_item.done' && item?.name === 'write_file'
          ? { ...e, data: { ...e.data, item: { ...item, arguments: JSON.stringify(args) } } }
          : e;
      }),
    };
    const end = replay(invalid, invalid.events.length);
    expect(end.files['notes/summary.md']).toBeUndefined();
    expect(end.files[projectPath]).toBe(replay(lesson, 0).files[projectPath]);
    expect(end.executionCount).toBe(3);
    expect(end.task).toBe('blocked');
  }
});

it('缺失文件失败后不执行写入', () => {
  const lesson = createLesson(5, 'file-error', 'save-summary');
  const end = replay(lesson, lesson.events.length);
  expect(end.calls.some((c) => c.name === 'write_file')).toBe(false);
  expect(end.files['notes/summary.md']).toBeUndefined();
  expect(end.task).toBe('blocked');
});

it('操作线跨续请求保留，任务结束清除，历史查看只恢复当时快照', () => {
  const lesson = createLesson(5, 'normal', 'save-summary');
  const result = lesson.events.findIndex(
    (e) => e.type === 'local.tool_result' && e.data.call_id === 'call_file',
  );
  const nextRequest = lesson.events.findIndex((e, i) => i > result && e.type === 'local.request');
  const local = (cursor: number, id?: string) =>
    visibleTransfers(lesson, cursor, id).filter(isToolTransfer);
  expect(local(result + 1).some((t) => t.kind === 'execute')).toBe(true);
  expect(local(result + 2).some((t) => t.kind === 'execute')).toBe(true);
  expect(local(nextRequest + 1).map((t) => [t.kind, t.from])).toEqual([
    ['dispatch', 'agent-call-call_file'],
    ['execute', 'tool-call_file-execute'],
    ['result', 'tool-call_file-result'],
  ]);
  expect(local(lesson.events.length)).toEqual([]);
  const final = replay(lesson, lesson.events.length);
  expect(local(lesson.events.length, 'server-call-call_file').map((t) => t.kind)).toEqual([
    'dispatch',
    'execute',
    'result',
  ]);
  expect(
    activitySnapshot(lesson, lesson.events.length, 'server-call-call_file').files[
      'notes/summary.md'
    ],
  ).toBeUndefined();
  expect(
    activitySnapshot(lesson, lesson.events.length, 'server-call-call_write').files[
      'notes/summary.md'
    ],
  ).toBe(final.files['notes/summary.md']);
  expect(replay(lesson, lesson.events.length)).toEqual(final);
});

it('确认前没有工作区操作线，确认后连接，下一完整调用就绪才替换旧工具', () => {
  const lesson = createLesson(5, 'normal');
  const firstStart = lesson.events.findIndex((e) => e.type === 'local.tool_start');
  const firstResult = lesson.events.findIndex((e) => e.type === 'local.tool_result');
  const nextReady = lesson.events.findIndex(
    (e) => e.type === 'response.completed' && e.round === 2,
  );
  const nextStart = lesson.events.findIndex(
    (e) => e.type === 'local.tool_start' && e.data.call_id === 'call_file',
  );
  const operations = (cursor: number, selected?: string) =>
    visibleTransfers(lesson, cursor, selected).filter((t) => t.kind === 'execute');
  expect(activeToolCall(lesson, firstStart)?.callId).toBe('call_skill');
  expect(operations(firstStart)).toEqual([]);
  expect(operations(firstStart, 'server-call-call_skill')).toEqual([]);
  expect(operations(firstStart + 1).map((t) => t.from)).toEqual(['tool-call_skill-execute']);
  expect(visibleTransfers(lesson, firstStart + 1).some((t) => t.kind === 'result')).toBe(false);
  for (let cursor = firstResult + 1; cursor <= nextReady; cursor++) {
    expect(activeToolCall(lesson, cursor)?.callId).toBe('call_skill');
    expect(operations(cursor).map((t) => t.from)).toEqual(['tool-call_skill-execute']);
    expect(visibleTransfers(lesson, cursor).find((t) => t.kind === 'dispatch')?.to).toBe(
      'tool-call_skill-dispatch',
    );
    expect(
      visibleTransfers(lesson, cursor)
        .filter((t) => t.kind === 'result')
        .map((t) => t.from),
    ).toEqual(['tool-call_skill-result']);
  }
  expect(activeToolCall(lesson, nextReady + 1)?.callId).toBe('call_file');
  expect(visibleTransfers(lesson, nextReady + 1).find((t) => t.kind === 'dispatch')?.to).toBe(
    'tool-call_file-dispatch',
  );
  expect(operations(nextReady + 1)).toEqual([]);
  expect(visibleTransfers(lesson, nextReady + 1).some((t) => t.kind === 'result')).toBe(false);
  expect(operations(nextStart)).toEqual([]);
  expect(operations(nextStart + 1).map((t) => [t.from, t.to])).toEqual([
    ['tool-call_file-execute', 'file-notes/project.md'],
  ]);
});

it('最后一次操作保留至回答过程，完成或中断清除，写入确认后才连接父目录', () => {
  for (const branch of ['normal', 'interrupted'] as const) {
    const lesson = createLesson(5, branch);
    const answer = lesson.events.findIndex((e) => e.type === 'response.output_text.delta');
    expect(activeToolCall(lesson, answer + 1)?.callId).toBe('call_file');
    expect(
      visibleTransfers(lesson, answer + 1)
        .filter((t) => t.kind === 'execute')
        .map((t) => t.from),
    ).toEqual(['tool-call_file-execute']);
    expect(activeToolCall(lesson, lesson.events.length)).toBeUndefined();
    expect(visibleTransfers(lesson, lesson.events.length).filter(isToolTransfer)).toEqual([]);
    expect(activeToolCall(lesson, 0)).toBeUndefined();
  }
  const saving = createLesson(5, 'normal', 'save-summary');
  const start = saving.events.findIndex(
    (e) => e.type === 'local.tool_start' && e.data.call_id === 'call_write',
  );
  expect(visibleTransfers(saving, start).filter((t) => t.kind === 'execute')).toEqual([]);
  expect(visibleTransfers(saving, start + 1).find((t) => t.kind === 'execute')?.to).toBe(
    'directory-notes',
  );
  expect(replay(saving, start + 1).files['notes/summary.md']).toBeUndefined();
});

it('Agent 内的工具调度和结果为内部连接，操作指向工作区', () => {
  const lesson = createLesson(5, 'normal');
  const links = visibleTransfers(lesson, lesson.events.length, 'server-call-call_file').filter(
    isToolTransfer,
  );
  expect(links.map((t) => [t.kind, t.fromArea, t.toArea])).toEqual([
    ['dispatch', 'chat', 'chat'],
    ['execute', 'chat', 'local'],
    ['result', 'chat', 'chat'],
  ]);
  expect([links[0].to, links[1].from, links[2].from]).toEqual([
    'tool-call_file-dispatch',
    'tool-call_file-execute',
    'tool-call_file-result',
  ]);
});
