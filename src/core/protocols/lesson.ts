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
    vendor: 'DEEPSEEK',
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
export const prompt = '请读取 /workspace/README.md。';
export const instruction = '用中文简短回答。';
export const answer = 'README 介绍了一个中文交互科普站。';
export const followup = '项目如何启动？';
export const fragments = ['README 介绍了', '一个中文', '交互科普站。'];
const schema = {
  type: 'object',
  properties: {
    file_path: { type: 'string' },
    offset: { type: 'integer', minimum: 1 },
    limit: { type: 'integer', minimum: 1 },
  },
  required: ['file_path', 'offset', 'limit'],
  additionalProperties: false,
};
export const toolResult = {
  file_path: '/workspace/README.md',
  content: '# LLM Lens\n中文交互科普站。',
  lines_read: 2,
};
const argumentsText = JSON.stringify({ file_path: '/workspace/README.md', offset: 1, limit: 100 });
export const tools = {
  chat: {
    type: 'function',
    function: {
      name: 'read',
      description: '读取指定文件的内容，offset 从 1 开始，limit 为最大行数',
      parameters: schema,
      strict: true,
    },
  },
  responses: {
    type: 'function',
    name: 'read',
    description: '读取指定文件的内容，offset 从 1 开始，limit 为最大行数',
    parameters: schema,
    strict: true,
  },
  anthropic: {
    name: 'read',
    description: '读取指定文件的内容，offset 从 1 开始，limit 为最大行数',
    input_schema: schema,
  },
};
export const calls = {
  chat: {
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_K7mP2xV9rT4nQ8sL5wB3hY6d',
        type: 'function',
        function: { name: 'read', arguments: argumentsText },
      },
    ],
  },
  responses: {
    type: 'function_call',
    id: 'fc_06c4e7b9a1328f500169e2d74c19b5ae803f026a7b1c48d659',
    call_id: 'call_K7mP2xV9rT4nQ8sL5wB3hY6d',
    name: 'read',
    arguments: argumentsText,
  },
  anthropic: {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: 'toolu_01Jp4Nx7Qm2Vr8Ls5Th9Wk6B',
        name: 'read',
        input: { file_path: '/workspace/README.md', offset: 1, limit: 100 },
      },
    ],
  },
};
export const results = {
  chat: {
    role: 'tool',
    tool_call_id: 'call_K7mP2xV9rT4nQ8sL5wB3hY6d',
    content: JSON.stringify(toolResult),
  },
  responses: {
    type: 'function_call_output',
    call_id: 'call_K7mP2xV9rT4nQ8sL5wB3hY6d',
    output: JSON.stringify(toolResult),
  },
  anthropic: {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: 'toolu_01Jp4Nx7Qm2Vr8Ls5Th9Wk6B',
        content: JSON.stringify(toolResult),
      },
    ],
  },
};
export function requestFor(p: Protocol, withTool = false) {
  const user = { role: 'user', content: prompt };
  const base =
    p === 'chat'
      ? { model: 'deepseek', messages: [{ role: 'developer', content: instruction }, user] }
      : p === 'responses'
        ? { model: 'gpt6', instructions: instruction, input: [user] }
        : { model: 'claude-ops', max_tokens: 256, system: instruction, messages: [user] };
  return { ...base, ...(withTool ? { tools: [tools[p]] } : {}), stream: true };
}
export function continuationFor(p: Protocol, tool = false) {
  const user = { role: 'user', content: prompt };
  if (p === 'responses')
    return {
      model: 'gpt6',
      instructions: instruction,
      previous_response_id: 'resp_06c4e7b9a1328f500169e2d74b8c03fa9d6e128457b0c35a21',
      input: tool ? [results.responses] : [{ role: 'user', content: followup }],
      ...(tool ? { tools: [tools.responses] } : {}),
    };
  if (p === 'chat')
    return {
      model: 'deepseek',
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
    model: 'claude-ops',
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
        data: {
          type: 'response.created',
          response: {
            id: 'resp_06c4e7b9a1328f500169e2d74b8c03fa9d6e128457b0c35a21',
            status: 'in_progress',
          },
        },
      },
      ...fragments.map((delta) => ({
        event: 'response.output_text.delta',
        data: {
          type: 'response.output_text.delta',
          item_id: 'msg_01Hq7Tm4Vr9Ls2Np8Wx5Kb3C',
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
            id: 'resp_06c4e7b9a1328f500169e2d74b8c03fa9d6e128457b0c35a21',
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
      data: {
        type: 'message_start',
        message: { id: 'msg_01Hq7Tm4Vr9Ls2Np8Wx5Kb3C', role: 'assistant', content: [] },
      },
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
