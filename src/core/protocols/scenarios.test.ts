import { expect, it } from 'vitest';
import {
  conversationDocuments as full,
  conversationIncremental as delta,
  conversationFocus,
  conversationIncrementalTarget,
  conversationComments,
} from './scenarios';

it('keeps conversation samples free of tool calls with matching text and completion states', () => {
  const text = full.response.chat.choices[0].message.content;
  expect(full.response.responses.output[0].content[0].text).toBe(text);
  expect(full.response.anthropic.content[0].text).toBe(text);
  expect(full.response.chat.choices[0].finish_reason).toBe('stop');
  expect(full.response.anthropic.stop_reason).toBe('end_turn');
  expect(full.response.responses.status).toBe('completed');
  expect(JSON.stringify(full)).not.toMatch(/"function_call"|"tool_use"|"tool_calls"|file_path|README/);
  for (const request of Object.values(full.request)) expect(request).not.toHaveProperty('tools');
  expect(conversationFocus.request.map((item) => item.id)).toEqual([
    'user',
    'history',
    'instruction',
    'model',
  ]);
  expect(conversationFocus.response.map((item) => item.id)).not.toContain('call');
});
it('continues the same conversation using only the new user message', () => {
  expect(delta.request.input).toEqual([full.request.responses.input[2]]);
  expect(delta.response.previous_response_id).toBe(delta.request.previous_response_id);
  expect(delta.response.id).not.toBe(delta.request.previous_response_id);
  expect(delta.response.output).toEqual(full.response.responses.output);
  expect(delta.request.store).toBe(true);
});
it('resolves all ordinary and incremental navigation and tooltip paths', () => {
  function resolve(value: unknown, path: readonly (string | number)[]) {
    return path.reduce<unknown>((v, k) => (v as Record<string | number, unknown>)[k], value);
  }
  for (const direction of ['request', 'response'] as const) {
    for (const field of conversationFocus[direction]) {
      for (const protocol of ['chat', 'responses', 'anthropic'] as const) {
        expect(resolve(full[direction][protocol], field.paths[protocol])).not.toBeUndefined();
      }
      expect(
        resolve(
          delta[direction],
          conversationIncrementalTarget(direction, field.id, field.paths.responses),
        ),
      ).not.toBeUndefined();
    }
    for (const pointer of Object.keys(conversationComments[direction])) {
      expect(resolve(delta[direction], pointer.slice(1).split('/'))).not.toBeUndefined();
    }
  }
});
