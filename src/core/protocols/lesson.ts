// Technical contract: docs/demos/protocols/TECHNICAL_DESIGN.md.
export const protocolTopic = {
  id: 'protocols',
  title: '模型协议',
  subtitle: '同一任务，三种表达',
  duration: '约 4 分钟',
  scenes: [{ short: '三种协议对照' }],
};
export const protocols = [
  {
    id: 'chat',
    name: 'Chat Completions',
    vendor: 'OPENAI',
    endpoint: '/v1/chat/completions',
    unit: 'Messages · 消息',
  },
  {
    id: 'responses',
    name: 'Responses',
    vendor: 'OPENAI',
    endpoint: '/v1/responses',
    unit: 'Items · 类型条目',
  },
  {
    id: 'anthropic',
    name: 'Messages',
    vendor: 'ANTHROPIC',
    endpoint: '/v1/messages',
    unit: 'Content blocks · 内容块',
  },
] as const;
export type Protocol = (typeof protocols)[number]['id'];
export const prompt = '上海天气如何？';
export const instruction = '用中文简短回答。';
export const answer = '上海 22°C，晴。';
export const followup = '适合散步吗？';
export const fragments = ['上海', ' 22°C', '，晴。'];
const schema = {
  type: 'object',
  properties: { city: { type: 'string' } },
  required: ['city'],
  additionalProperties: false,
};
export const toolResult = { temperature_c: 22, condition: '晴' };
const argumentsText = JSON.stringify({ city: '上海' });
export const tools = {
  chat: {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '查询城市天气',
      parameters: schema,
      strict: true,
    },
  },
  responses: {
    type: 'function',
    name: 'get_weather',
    description: '查询城市天气',
    parameters: schema,
    strict: true,
  },
  anthropic: { name: 'get_weather', description: '查询城市天气', input_schema: schema },
};
export const calls = {
  chat: {
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_demo',
        type: 'function',
        function: { name: 'get_weather', arguments: argumentsText },
      },
    ],
  },
  responses: {
    type: 'function_call',
    id: 'fc_demo',
    call_id: 'call_demo',
    name: 'get_weather',
    arguments: argumentsText,
  },
  anthropic: {
    role: 'assistant',
    content: [{ type: 'tool_use', id: 'toolu_demo', name: 'get_weather', input: { city: '上海' } }],
  },
};
export const results = {
  chat: { role: 'tool', tool_call_id: 'call_demo', content: JSON.stringify(toolResult) },
  responses: {
    type: 'function_call_output',
    call_id: 'call_demo',
    output: JSON.stringify(toolResult),
  },
  anthropic: {
    role: 'user',
    content: [
      { type: 'tool_result', tool_use_id: 'toolu_demo', content: JSON.stringify(toolResult) },
    ],
  },
};
export function requestFor(p: Protocol, withTool = false) {
  const user = { role: 'user', content: prompt };
  const base =
    p === 'chat'
      ? { model: 'openai-demo', messages: [{ role: 'developer', content: instruction }, user] }
      : p === 'responses'
        ? { model: 'openai-demo', instructions: instruction, input: [user] }
        : { model: 'claude-demo', max_tokens: 256, system: instruction, messages: [user] };
  return { ...base, ...(withTool ? { tools: [tools[p]] } : {}), stream: true };
}
export function continuationFor(p: Protocol, tool = false) {
  const user = { role: 'user', content: prompt };
  if (p === 'responses')
    return {
      model: 'openai-demo',
      instructions: instruction,
      previous_response_id: tool ? 'resp_tool_demo' : 'resp_demo',
      input: tool ? [results.responses] : [{ role: 'user', content: followup }],
      ...(tool ? { tools: [tools.responses] } : {}),
    };
  if (p === 'chat')
    return {
      model: 'openai-demo',
      messages: [
        { role: 'developer', content: instruction },
        user,
        ...(tool
          ? [calls.chat, results.chat]
          : [
              { role: 'assistant', content: answer },
              { role: 'user', content: followup },
            ]),
      ],
      ...(tool ? { tools: [tools.chat] } : {}),
    };
  return {
    model: 'claude-demo',
    max_tokens: 256,
    system: instruction,
    messages: [
      user,
      ...(tool
        ? [calls.anthropic, results.anthropic]
        : [
            { role: 'assistant', content: [{ type: 'text', text: answer }] },
            { role: 'user', content: followup },
          ]),
    ],
    ...(tool ? { tools: [tools.anthropic] } : {}),
  };
}
// Wire excerpts: lifecycle fields unrelated to this lesson are intentionally omitted.
export type WireEvent = { event?: string; data: Record<string, unknown> | '[DONE]' };
const chunk = (delta: object, finish_reason: string | null = null): WireEvent => ({
  data: { object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason }] },
});
export function streamFor(p: Protocol): WireEvent[] {
  if (p === 'chat')
    return [
      chunk({ role: 'assistant', content: '' }),
      ...fragments.map((content) => chunk({ content })),
      chunk({}, 'stop'),
      { data: '[DONE]' },
    ];
  if (p === 'responses')
    return [
      {
        event: 'response.created',
        data: { type: 'response.created', response: { id: 'resp_demo', status: 'in_progress' } },
      },
      ...fragments.map((delta) => ({
        event: 'response.output_text.delta',
        data: {
          type: 'response.output_text.delta',
          item_id: 'msg_demo',
          output_index: 0,
          content_index: 0,
          delta,
        },
      })),
      {
        event: 'response.completed',
        data: {
          type: 'response.completed',
          response: {
            id: 'resp_demo',
            status: 'completed',
            output: [
              {
                type: 'message',
                role: 'assistant',
                content: [{ type: 'output_text', text: answer }],
              },
            ],
          },
        },
      },
    ];
  return [
    {
      event: 'message_start',
      data: { type: 'message_start', message: { id: 'msg_demo', role: 'assistant', content: [] } },
    },
    {
      event: 'content_block_start',
      data: { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    },
    ...fragments.map((text) => ({
      event: 'content_block_delta',
      data: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    })),
    { event: 'content_block_stop', data: { type: 'content_block_stop', index: 0 } },
    { event: 'message_delta', data: { type: 'message_delta', delta: { stop_reason: 'end_turn' } } },
    { event: 'message_stop', data: { type: 'message_stop' } },
  ];
}
// Small teaching extractor, not a production streaming parser.
export function textFromEvent(p: Protocol, e: WireEvent): string {
  if (typeof e.data === 'string') return '';
  const d = e.data;
  if (p === 'chat') {
    const choices = d.choices as { delta?: { content?: unknown } }[] | undefined;
    const content = choices?.[0]?.delta?.content;
    return typeof content === 'string' ? content : '';
  }
  if (p === 'responses')
    return d.type === 'response.output_text.delta' && typeof d.delta === 'string' ? d.delta : '';
  const delta = d.delta as { type?: string; text?: string } | undefined;
  return d.type === 'content_block_delta' && delta?.type === 'text_delta' ? (delta.text ?? '') : '';
}
export const highlightedKeys = new Set([
  'messages',
  'instructions',
  'input',
  'system',
  'max_tokens',
  'role',
  'content',
  'choices',
  'delta',
  'type',
  'index',
  'finish_reason',
  'stop_reason',
  'function',
  'parameters',
  'input_schema',
  'tool_calls',
  'arguments',
  'call_id',
  'tool_call_id',
  'tool_use_id',
  'previous_response_id',
  'output',
]);
export const sources = [
  [
    'OpenAI：完整 Response 对象',
    'https://developers.openai.com/api/reference/cli/resources/responses/methods/retrieve',
  ],
  ['OpenAI：两种接口对照', 'https://developers.openai.com/api/docs/guides/migrate-to-responses'],
  ['OpenAI：Function calling', 'https://developers.openai.com/api/docs/guides/function-calling'],
  [
    'OpenAI：Chat 流式结构',
    'https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events',
  ],
  [
    'Anthropic：Messages',
    'https://platform.claude.com/docs/en/build-with-claude/working-with-messages',
  ],
  ['Anthropic：Streaming', 'https://platform.claude.com/docs/en/build-with-claude/streaming'],
  [
    'Anthropic：工具回传',
    'https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls',
  ],
];
