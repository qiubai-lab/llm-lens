// Complete scenario objects and exact field locations. See technical design's latest section.
import { calls, instruction, results, tools, type Protocol } from './lesson';
export type Direction = 'request' | 'response';
export type JsonPath = readonly (string | number)[];
const question = '上海天气如何？再帮我查一下杭州。';
const text = '上海 22°C，晴。我再查一下杭州。';
const args = JSON.stringify({ city: '杭州' });
const model = { chat: 'openai-demo', responses: 'openai-demo', anthropic: 'claude-demo' };
export const documents = {
  request: {
    chat: {
      model: model.chat,
      messages: [
        { role: 'developer', content: instruction },
        { role: 'user', content: question },
        calls.chat,
        results.chat,
      ],
      tools: [tools.chat],
      tool_choice: 'auto',
      stream: false,
    },
    responses: {
      model: model.responses,
      instructions: instruction,
      input: [{ role: 'user', content: question }, calls.responses, results.responses],
      tools: [tools.responses],
      tool_choice: 'auto',
      parallel_tool_calls: false,
      max_output_tokens: 256,
      store: false,
      stream: false,
    },
    anthropic: {
      model: model.anthropic,
      max_tokens: 256,
      system: instruction,
      messages: [{ role: 'user', content: question }, calls.anthropic, results.anthropic],
      tools: [tools.anthropic],
      tool_choice: { type: 'auto' },
      stream: false,
    },
  },
  response: {
    chat: {
      id: 'chatcmpl_hangzhou_demo',
      object: 'chat.completion',
      created: 1792530000,
      model: model.chat,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
            refusal: null,
            annotations: [],
            tool_calls: [
              {
                id: 'call_hangzhou_demo',
                type: 'function',
                function: { name: 'get_weather', arguments: args },
              },
            ],
          },
          logprobs: null,
          finish_reason: 'tool_calls',
        },
      ],
      usage: {
        prompt_tokens: 120,
        completion_tokens: 40,
        total_tokens: 160,
        prompt_tokens_details: { cached_tokens: 0, audio_tokens: 0 },
        completion_tokens_details: {
          reasoning_tokens: 0,
          audio_tokens: 0,
          accepted_prediction_tokens: 0,
          rejected_prediction_tokens: 0,
        },
      },
      service_tier: 'default',
      system_fingerprint: null,
    },
    responses: {
      id: 'resp_hangzhou_demo',
      object: 'response',
      access_programs: null,
      created_at: 1792530000,
      status: 'completed',
      completed_at: 1792530001,
      error: null,
      incomplete_details: null,
      instructions: instruction,
      max_output_tokens: 256,
      model: model.responses,
      output: [
        {
          type: 'message',
          id: 'msg_hangzhou_demo',
          status: 'completed',
          role: 'assistant',
          content: [{ type: 'output_text', text, annotations: [], logprobs: [] }],
        },
        {
          type: 'function_call',
          id: 'fc_hangzhou_demo',
          call_id: 'call_hangzhou_demo',
          name: 'get_weather',
          arguments: args,
          status: 'completed',
        },
      ],
      parallel_tool_calls: false,
      previous_response_id: null,
      reasoning: { effort: null, summary: null },
      store: false,
      temperature: 1,
      text: { format: { type: 'text' } },
      tool_choice: 'auto',
      tools: [tools.responses],
      top_p: 1,
      truncation: 'disabled',
      usage: {
        input_tokens: 120,
        input_tokens_details: { cached_tokens: 0, cache_write_tokens: 0 },
        output_tokens: 40,
        output_tokens_details: { reasoning_tokens: 0 },
        total_tokens: 160,
      },
      user: null,
      metadata: {},
    },
    anthropic: {
      id: 'msg_hangzhou_demo',
      type: 'message',
      role: 'assistant',
      model: model.anthropic,
      content: [
        { type: 'text', text },
        {
          type: 'tool_use',
          id: 'toolu_hangzhou_demo',
          name: 'get_weather',
          input: { city: '杭州' },
        },
      ],
      stop_reason: 'tool_use',
      stop_sequence: null,
      usage: {
        input_tokens: 120,
        output_tokens: 40,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
  },
} as const;
export type FieldFocus = {
  id: string;
  title: string;
  description: string;
  paths: Record<Protocol, JsonPath>;
};
export const focusItems: Record<Direction, FieldFocus[]> = {
  request: [
    {
      id: 'user',
      title: '用户输入',
      description: '同一个问题，在三个请求对象中分别放在哪里。',
      paths: {
        chat: ['messages', 1, 'content'],
        responses: ['input', 0, 'content'],
        anthropic: ['messages', 0, 'content'],
      },
    },
    {
      id: 'instruction',
      title: '指令',
      description: 'Chat 的 developer 消息，对照 Responses 的 instructions 与 Messages 的 system。',
      paths: { chat: ['messages', 0], responses: ['instructions'], anthropic: ['system'] },
    },
    {
      id: 'tools',
      title: '工具声明',
      description: '对比函数定义的嵌套方式，以及 parameters / input_schema。',
      paths: { chat: ['tools', 0], responses: ['tools', 0], anthropic: ['tools', 0] },
    },
    {
      id: 'call',
      title: '历史工具调用',
      description: '请求保留之前查询上海的调用，供模型把工具结果与调用关联。',
      paths: {
        chat: ['messages', 2, 'tool_calls', 0],
        responses: ['input', 1],
        anthropic: ['messages', 1, 'content', 0],
      },
    },
    {
      id: 'result',
      title: '工具结果',
      description: '应用已执行上海查询；三种结果格式都通过调用 ID 配对。',
      paths: {
        chat: ['messages', 3],
        responses: ['input', 2],
        anthropic: ['messages', 2, 'content', 0],
      },
    },
    {
      id: 'model',
      title: '模型',
      description: '模型名为教学占位符，具体参数支持需要与实际模型匹配。',
      paths: { chat: ['model'], responses: ['model'], anthropic: ['model'] },
    },
  ],
  response: [
    {
      id: 'text',
      title: '文本回答',
      description: '同一响应可以包含文字和工具调用；这里先报告上海，再请求查询杭州。',
      paths: {
        chat: ['choices', 0, 'message', 'content'],
        responses: ['output', 0, 'content', 0, 'text'],
        anthropic: ['content', 0, 'text'],
      },
    },
    {
      id: 'call',
      title: '工具调用',
      description:
        '杭州调用尚待应用执行。Chat / Responses 的 arguments 是字符串，Messages 的 input 是对象。',
      paths: {
        chat: ['choices', 0, 'message', 'tool_calls', 0],
        responses: ['output', 1],
        anthropic: ['content', 1],
      },
    },
    {
      id: 'status',
      title: '结束状态',
      description:
        'Responses 的 completed 表示本次生成已结束；输出含 function_call 时，应用仍需执行工具。',
      paths: {
        chat: ['choices', 0, 'finish_reason'],
        responses: ['status'],
        anthropic: ['stop_reason'],
      },
    },
    {
      id: 'usage',
      title: '用量',
      description: '对比 usage 字段结构；数值为教学示例，不代表真实分词或计费。',
      paths: { chat: ['usage'], responses: ['usage'], anthropic: ['usage'] },
    },
    {
      id: 'id',
      title: '响应 ID',
      description: '响应 ID、输出条目 ID 与工具调用 ID 是不同层级的标识。',
      paths: { chat: ['id'], responses: ['id'], anthropic: ['id'] },
    },
  ],
};
export function pointer(path: JsonPath) {
  return '/' + path.map((x) => String(x).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
}
export function pathLabel(path: JsonPath) {
  return path.reduce<string>(
    (s, p) => (typeof p === 'number' ? `${s}[${p}]` : `${s ? s + '.' : ''}${p}`),
    '',
  );
}
export type JsonLine = { text: string; path: JsonPath };
export function jsonLines(value: unknown): JsonLine[] {
  const lines: JsonLine[] = [];
  function visit(v: unknown, path: JsonPath, depth: number, prefix: string, comma: boolean) {
    const indent = '  '.repeat(depth),
      suffix = comma ? ',' : '';
    if (v !== null && typeof v === 'object') {
      const array = Array.isArray(v),
        entries = array ? v.map((child, i) => [i, child] as const) : Object.entries(v);
      const open = array ? '[' : '{',
        close = array ? ']' : '}';
      if (!entries.length) {
        lines.push({ text: `${indent}${prefix}${open}${close}${suffix}`, path });
        return;
      }
      lines.push({ text: `${indent}${prefix}${open}`, path });
      entries.forEach(([key, child], i) =>
        visit(
          child,
          [...path, key],
          depth + 1,
          array ? '' : `${JSON.stringify(key)}: `,
          i < entries.length - 1,
        ),
      );
      lines.push({ text: `${indent}${close}${suffix}`, path });
    } else {
      const encoded = JSON.stringify(v);
      if (encoded === undefined) throw new TypeError('Expected a JSON value');
      lines.push({ text: `${indent}${prefix}${encoded}${suffix}`, path });
    }
  }
  visit(value, [], 0, '', false);
  return lines;
}
export function withinPath(path: JsonPath, target: JsonPath) {
  return target.length > 0 && target.every((segment, i) => path[i] === segment);
}
