import { describe, expect, it } from 'vitest';
import { documents, focusItems, jsonLines } from './documents';
import { incrementalDocuments, incrementalTarget, incrementalComments } from './incremental';

describe('Responses incremental continuation', () => {
  it('sends only new tool output and retains configuration needed for continuation', () => {
    const request = incrementalDocuments.request;
    expect(request.previous_response_id).toBe(
      'resp_06c4e7b9a1328f500169e2d74b8c03fa9d6e128457b0c35a21',
    );
    expect(request.input).toEqual([documents.request.responses.input[2]]);
    expect(request.input[0].call_id).toBe(documents.request.responses.input[1].call_id);
    expect(request.instructions).toBe(documents.request.responses.instructions);
    expect(request.tools).toEqual(documents.request.responses.tools);
    expect(request.store).toBe(true);
    expect(request.stream).toBe(false);
  });
  it('returns new output and a new reusable ID, without pretending historical input is free', () => {
    const response = incrementalDocuments.response;
    expect(response.output).toEqual(documents.response.responses.output);
    expect(response.previous_response_id).toBe(incrementalDocuments.request.previous_response_id);
    expect(response.id).not.toBe(response.previous_response_id);
    expect(response.store).toBe(true);
    expect(response.usage).toEqual(documents.response.responses.usage);
  });
  it('all focus paths and annotations resolve, including references for omitted history', () => {
    for (const direction of ['request', 'response'] as const) {
      const doc = incrementalDocuments[direction];
      for (const item of focusItems[direction]) {
        const path = incrementalTarget(direction, item.id, item.paths.responses);
        const value = path.reduce<unknown>(
          (value, key) => (value as Record<string | number, unknown>)[key],
          doc,
        );
        expect(value).not.toBeUndefined();
      }
      const lines = jsonLines(doc);
      expect(JSON.parse(lines.map((line) => line.text).join('\n'))).toEqual(doc);
      for (const path of Object.keys(incrementalComments[direction])) {
        const value = path
          .slice(1)
          .split('/')
          .reduce<unknown>((value, key) => (value as Record<string, unknown>)[key], doc);
        expect(value).not.toBeUndefined();
      }
    }
    expect(incrementalTarget('request', 'user', [])).toEqual(['previous_response_id']);
    expect(incrementalTarget('request', 'call', [])).toEqual(['previous_response_id']);
    expect(incrementalTarget('request', 'result', [])).toEqual(['input', 0]);
  });
});
