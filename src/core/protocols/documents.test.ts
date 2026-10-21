import { describe, expect, it } from 'vitest';
import { documents, focusItems, jsonLines, pointer, withinPath } from './documents';
import { protocols, tools, calls } from './lesson';

describe('complete protocol documents and exact navigation', () => {
  for (const direction of ['request', 'response'] as const) {
    for (const p of protocols) {
      it(`${direction}/${p.id} preserves the full object and resolves every focus`, () => {
        const data = documents[direction][p.id];
        const lines = jsonLines(data);
        expect(JSON.parse(lines.map((l) => l.text).join('\n'))).toEqual(data);
        for (const focus of focusItems[direction]) {
          const path = focus.paths[p.id];
          let target: unknown = data;
          for (const key of path) target = (target as Record<string | number, unknown>)[key];
          expect(target, focus.id).not.toBeUndefined();
          const selected = lines.filter((l) => withinPath(l.path, path));
          expect(selected.length).toBeGreaterThan(0);
          expect(selected[0].path).toEqual(path);
        }
      });
    }
  }
  it('distinguishes repeated fields and escaped keys', () => {
    const lines = jsonLines({
      'a/b': { '~': [1, null, true] },
      messages: [{ content: 'first' }, { content: 'second' }],
    });
    expect(
      lines
        .filter((l) => withinPath(l.path, ['messages', 1, 'content']))
        .map((l) => l.text)
        .join(''),
    ).toContain('second');
    expect(
      lines
        .filter((l) => withinPath(l.path, ['messages', 1, 'content']))
        .map((l) => l.text)
        .join(''),
    ).not.toContain('first');
    expect(pointer(['a/b', '~', 0])).toBe('/a~1b/~0/0');
    expect(JSON.parse(lines.map((l) => l.text).join('\n'))['a/b']['~']).toEqual([1, null, true]);
  });
  it('pairs prior tool results and keeps new calls separate from executed calls', () => {
    const { request: r, response: s } = documents;
    expect(r.chat.messages[3].tool_call_id).toBe(r.chat.messages[2].tool_calls[0].id);
    expect(r.responses.input[2].call_id).toBe(r.responses.input[1].call_id);
    expect(r.anthropic.messages[2].content[0].tool_use_id).toBe(
      r.anthropic.messages[1].content[0].id,
    );
    expect(s.chat.choices[0].message.tool_calls[0].id).not.toBe(r.chat.messages[3].tool_call_id);
    expect(s.responses.output[1].call_id).not.toBe(r.responses.input[2].call_id);
    expect(s.anthropic.content[1].id).not.toBe(r.anthropic.messages[2].content[0].tool_use_id);
    expect(s.chat.choices[0].finish_reason).toBe('tool_calls');
    expect(s.anthropic.stop_reason).toBe('tool_use');
    expect(s.responses.output[1].type).toBe('function_call');
    expect(s.responses).not.toHaveProperty('output_text');
    for (const p of protocols) expect(r[p.id].stream).toBe(false);
  });
});

it('uses matching read contracts and distinct realistic-format identities', () => {
  const { request, response } = documents;
  expect([request.chat.model, request.responses.model, request.anthropic.model]).toEqual([
    'deepseek',
    'gpt6',
    'claude-ops',
  ]);
  expect([tools.chat.function.name, tools.responses.name, tools.anthropic.name]).toEqual([
    'read',
    'read',
    'read',
  ]);
  const first = { file_path: '/workspace/README.md', offset: 1, limit: 100 };
  const next = { file_path: '/workspace/package.json', offset: 1, limit: 100 };
  expect(JSON.parse(calls.responses.arguments)).toEqual(first);
  expect(JSON.parse(response.chat.choices[0].message.tool_calls[0].function.arguments)).toEqual(
    next,
  );
  expect(JSON.parse(response.responses.output[1].arguments)).toEqual(next);
  expect(response.anthropic.content[1].input).toEqual(next);
  expect(response.responses.id).toMatch(/^resp_[a-f0-9]+$/);
  expect(response.anthropic.id).toMatch(/^msg_[A-Za-z0-9]+$/);
  expect(response.anthropic.content[1].id).toMatch(/^toolu_[A-Za-z0-9]+$/);
  expect(JSON.stringify(documents)).not.toMatch(/demo|get_weather|temperature_c/);
});
