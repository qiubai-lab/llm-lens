// Teaching contract: docs/demos/protocols/TECHNICAL_DESIGN.md
import { documents, focusItems, type Direction, type FieldFocus, type JsonPath } from './documents';
import { instruction } from './lesson';
import { incrementalComments } from './incremental';

export type Scenario = 'conversation' | 'tools';
const first = { role: 'user', content: '什么是模型网关？' };
const prior = { role: 'assistant', content: '模型网关统一连接不同模型，管理访问、路由和用量。' };
const current = { role: 'user', content: '用一个生活中的例子解释。' };
const answer = '模型网关像餐厅前台：接收你的需求，交给合适的厨师，再把结果送回来并记录消费。';
const previousId = 'resp_03d8b6a2e4917c600169e3f82a7c51bd9e6f204385a1d47c92';
const output = [
  {
    ...documents.response.responses.output[0],
    id: 'msg_03d8b6a2e4917c600169e3f83b8d62ce0f7a315496b2e58d03',
    content: [{ type: 'output_text', text: answer, annotations: [], logprobs: [] }],
  },
];
export const conversationDocuments = {
  request: {
    chat: {
      model: 'deepseek',
      messages: [{ role: 'developer', content: instruction }, first, prior, current],
      stream: false,
    },
    responses: {
      model: 'gpt6',
      instructions: instruction,
      input: [first, prior, current],
      max_output_tokens: 256,
      store: false,
      stream: false,
    },
    anthropic: {
      model: 'claude-ops',
      max_tokens: 256,
      system: instruction,
      messages: [first, prior, current],
      stream: false,
    },
  },
  response: {
    chat: {
      ...documents.response.chat,
      id: 'chatcmpl-D7nR3xT8vM5qL2sW9bK4pY6h',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: answer, refusal: null, annotations: [] },
          logprobs: null,
          finish_reason: 'stop',
        },
      ],
    },
    responses: {
      ...documents.response.responses,
      id: 'resp_03d8b6a2e4917c600169e3f83c9e73df108b4265a7c3f69e14',
      output,
      tools: [],
      tool_choice: 'none',
    },
    anthropic: {
      ...documents.response.anthropic,
      id: 'msg_01Xb4Qn8Tm3Vr6Ls9Wp2Hk7C',
      content: [{ type: 'text', text: answer }],
      stop_reason: 'end_turn',
    },
  },
};
export const conversationIncremental = {
  request: {
    previous_response_id: previousId,
    ...conversationDocuments.request.responses,
    input: [current],
    store: true,
  },
  response: {
    ...conversationDocuments.response.responses,
    previous_response_id: previousId,
    store: true,
  },
};
export const conversationFocus: Record<Direction, FieldFocus[]> = {
  request: [
    {
      id: 'user',
      title: '用户输入',
      description: '本轮新的追问。',
      paths: {
        chat: ['messages', 3, 'content'],
        responses: ['input', 2, 'content'],
        anthropic: ['messages', 2, 'content'],
      },
    },
    {
      id: 'history',
      title: '历史消息',
      description: '此前的问题和回答。',
      paths: { chat: ['messages', 1], responses: ['input', 0], anthropic: ['messages', 0] },
    },
    ...focusItems.request.filter((item) => item.id === 'instruction' || item.id === 'model'),
  ],
  response: focusItems.response.filter((item) => item.id !== 'call'),
};
export function conversationIncrementalTarget(
  direction: Direction,
  focusId: string | null,
  original: JsonPath,
): JsonPath {
  if (direction !== 'request') return original;
  if (focusId === 'history') return ['previous_response_id'];
  if (focusId === 'user') return ['input', 0, 'content'];
  return original;
}
export const conversationComments: Record<Direction, Record<string, string>> = {
  request: {
    '/previous_response_id':
      '关联上一轮对话的问题和回答，无需重复上传；历史仍占上下文并计入输入计费。',
    '/input': '本轮只发送新的用户追问。没有工具调用或工具结果。',
    '/instructions': incrementalComments.request['/instructions'],
    '/store': incrementalComments.request['/store'],
  },
  response: {
    '/id': incrementalComments.response['/id'],
    '/output': '只返回本轮新生成的文本回答，不重复返回历史消息。',
    '/previous_response_id': incrementalComments.response['/previous_response_id'],
    '/usage': incrementalComments.response['/usage'],
  },
};
