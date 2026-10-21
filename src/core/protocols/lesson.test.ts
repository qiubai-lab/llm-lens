import { describe, expect, it } from 'vitest';
import {
  answer,
  calls,
  continuationFor,
  instruction,
  protocols,
  requestFor,
  results,
  streamFor,
  textFromEvent,
  tools,
  type Protocol,
} from './lesson';

describe('protocol teaching contracts', () => {
  it('places guidance and user input in the correct request fields', () => {
    expect(requestFor('chat')).toMatchObject({
      messages: [
        { role: 'developer', content: instruction },
        { role: 'user', content: '上海天气如何？' },
      ],
    });
    expect(requestFor('responses')).toMatchObject({
      instructions: instruction,
      input: [{ role: 'user' }],
    });
    expect(requestFor('anthropic')).toMatchObject({
      system: instruction,
      max_tokens: 256,
      messages: [{ role: 'user' }],
    });
    expect(tools.chat.function.parameters).toEqual(tools.responses.parameters);
    expect(tools.anthropic.input_schema).toEqual(tools.responses.parameters);
  });
  it.each(protocols.map((p) => p.id))(
    '%s extracts only text and reconstructs the same answer',
    (p) => {
      expect(
        streamFor(p)
          .map((e) => textFromEvent(p, e))
          .join(''),
      ).toBe(answer);
      for (const data of [
        { type: 'ping' },
        { type: 'error', error: { message: 'failed' } },
        { type: 'content_block_delta', delta: { type: 'input_json_delta', partial_json: '{}' } },
        { choices: [] },
      ]) {
        expect(textFromEvent(p, { data })).toBe('');
      }
    },
  );
  it('preserves tool identity and the string/object argument distinction', () => {
    expect(results.chat.tool_call_id).toBe(calls.chat.tool_calls[0].id);
    expect(results.responses.call_id).toBe(calls.responses.call_id);
    expect(results.responses.call_id).not.toBe(calls.responses.id);
    expect(results.anthropic.content[0].tool_use_id).toBe(calls.anthropic.content[0].id);
    expect(JSON.parse(calls.chat.tool_calls[0].function.arguments)).toEqual(
      calls.anthropic.content[0].input,
    );
    expect(JSON.parse(calls.responses.arguments)).toEqual(calls.anthropic.content[0].input);
    const chat = continuationFor('chat', true);
    const anthropic = continuationFor('anthropic', true);
    expect('messages' in chat ? chat.messages.slice(-2) : []).toEqual([calls.chat, results.chat]);
    expect('messages' in anthropic ? anthropic.messages.slice(-2) : []).toEqual([
      calls.anthropic,
      results.anthropic,
    ]);
  });
  it('replays client history or references a stored response while resending guidance', () => {
    for (const p of ['chat', 'anthropic'] as Protocol[]) {
      const next = continuationFor(p);
      expect('messages' in next ? next.messages.slice(-3).map((m) => m.role) : []).toEqual([
        'user',
        'assistant',
        'user',
      ]);
      expect(next).not.toHaveProperty('previous_response_id');
    }
    expect(continuationFor('responses')).toMatchObject({
      previous_response_id: 'resp_demo',
      instructions: instruction,
      input: [{ role: 'user', content: '适合散步吗？' }],
    });
    const before = JSON.stringify({ calls, results, tools });
    continuationFor('responses', true);
    streamFor('anthropic');
    requestFor('chat', true);
    expect(JSON.stringify({ calls, results, tools })).toBe(before);
  });
});
