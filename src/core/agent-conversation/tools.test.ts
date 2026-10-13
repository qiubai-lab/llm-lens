// QB-20261013-agent-tools AC-001/003/004: simulated operations and read-only inspection.
import { expect, it } from 'vitest';
import { createLesson, projectPath } from './fixtures';
import { replay } from './flow';
import { toolDefinitions } from './tools';
import { activitySnapshot, visibleTransfers } from './workbench';

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

it('工具连接跨增量保留、next step 隐藏、历史查看只恢复当时快照', () => {
  const lesson = createLesson(5, 'normal', 'save-summary');
  const result = lesson.events.findIndex(
    (e) => e.type === 'local.tool_result' && e.data.call_id === 'call_file',
  );
  const nextRequest = lesson.events.findIndex((e, i) => i > result && e.type === 'local.request');
  const local = (cursor: number, id?: string) =>
    visibleTransfers(lesson, cursor, id).filter(
      (t) => t.fromArea === 'local' || t.toArea === 'local',
    );
  expect(local(result + 1).some((t) => t.kind === 'execute')).toBe(true);
  expect(local(result + 2).some((t) => t.kind === 'execute')).toBe(true);
  expect(local(nextRequest + 1)).toEqual([]);
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
