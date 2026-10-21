// Teaching contract: docs/demos/protocols/TECHNICAL_DESIGN.md
import { documents, focusItems, type Direction, type FieldFocus, type JsonPath } from './documents';
import { instruction } from './lesson';
import { incrementalComments } from './incremental';

export type Scenario = 'conversation' | 'tools';
const first = { role: 'user', content: '什么是模型网关？' };
const prior = { role: 'assistant', content: '模型网关统一连接不同模型，管理访问、路由和用量。' };
// A complete 1×1 red PNG; presentation abbreviates it without changing the payload.
export const imageBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
export const imageDataUrl = 'data:image/png;base64,' + imageBase64;
const question = '附上一张红色示意图，请用一个生活中的例子解释模型网关。';
const current = {
  chat: {
    role: 'user',
    content: [
      { type: 'text', text: question },
      { type: 'image_url', image_url: { url: imageDataUrl, detail: 'auto' } },
    ],
  },
  responses: {
    role: 'user',
    content: [
      { type: 'input_text', text: question },
      { type: 'input_image', image_url: imageDataUrl, detail: 'auto' },
    ],
  },
  anthropic: {
    role: 'user',
    content: [
      { type: 'text', text: question },
      { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
    ],
  },
};
export function abbreviateImageLine(text: string): string {
  return text.replace(
    imageBase64,
    imageBase64.slice(0, 12) + '…[已省略；共 ' + imageBase64.length + ' 个 base64 字符]',
  );
}
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
      messages: [{ role: 'developer', content: instruction }, first, prior, current.chat],
      stream: false,
    },
    responses: {
      model: 'gpt6',
      instructions: instruction,
      input: [first, prior, current.responses],
      max_output_tokens: 256,
      store: false,
      stream: false,
    },
    anthropic: {
      model: 'claude-ops',
      max_tokens: 256,
      system: instruction,
      messages: [first, prior, current.anthropic],
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
    input: [current.responses],
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
      id: 'image',
      title: '图片输入',
      description: '同一图片：OpenAI 使用 data URL，Messages 使用纯 base64 与 media_type。',
      paths: {
        chat: ['messages', 3, 'content', 1],
        responses: ['input', 2, 'content', 1],
        anthropic: ['messages', 2, 'content', 1],
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
  if (focusId === 'image') return ['input', 0, 'content', 1];
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

export function imageComments(protocol: 'chat' | 'responses' | 'anthropic', incremental: boolean): Record<string, string> {
  const note = '图片数据仅缩略显示，复制 JSON 保留完整内容。';
  if (protocol === 'chat')
    return {
      '/messages/3/content/1/image_url/url':
        'data URL 包含 MIME 类型、base64 标记和图片数据。也可使用图片 URL。' + note,
    };
  if (protocol === 'responses')
    return {
      [incremental ? '/input/0/content/1/image_url' : '/input/2/content/1/image_url']:
        'input_image.image_url 为 data URL 字符串。本轮图片仍需上传，历史 ID 不替代它。' + note,
    };
  return {
    '/messages/2/content/1/source/data':
      '纯 base64 图片数据，不含 data URL 前缀；格式单独放在 media_type。' + note,
  };
}
