// Contract and teaching scope: docs/demos/protocols/TECHNICAL_DESIGN.md
import { documents, type Direction, type JsonPath } from './documents';

export const incrementalDocuments = {
  request: {
    previous_response_id: 'resp_06c4e7b9a1328f500169e2d74b8c03fa9d6e128457b0c35a21',
    ...documents.request.responses,
    input: [documents.request.responses.input[2]],
    store: true,
  },
  response: {
    ...documents.response.responses,
    previous_response_id: 'resp_06c4e7b9a1328f500169e2d74b8c03fa9d6e128457b0c35a21',
    store: true,
  },
} as const;

export function incrementalTarget(
  direction: Direction,
  focusId: string | null,
  original: JsonPath,
): JsonPath {
  if (direction !== 'request') return original;
  if (focusId === 'user' || focusId === 'call') return ['previous_response_id'];
  if (focusId === 'result') return ['input', 0];
  return original;
}

export const incrementalComments: Record<Direction, Record<string, string>> = {
  request: {
    '/instructions': '本轮重新提供指令；previous_response_id 不继承上一轮的 instructions。',
    '/input': '只上传本轮新增的README 读取工具结果；用户问题与历史工具调用已由上一轮保存。',
    '/input/0/call_id': '匹配上一轮README 读取工具调用的 call_id；不是响应 ID。',
    '/tools': '本轮仍提供可用工具的定义，供模型继续读取 package.json。',
    '/store': '保存本轮响应，以便后续请求通过新的响应 ID 继续。',
    '/previous_response_id':
      '引用已保存的README 读取响应。减少历史重复传输，历史仍占上下文并计入输入计费。',
  },
  response: {
    '/id': '本轮新响应 ID；下一轮可将它作为 previous_response_id。',
    '/output': '只包含本轮新生成的文字和package.json 读取工具调用。普通响应也不重复返回整段历史。',
    '/output/1/call_id':
      'package.json 读取工具调用 ID；执行工具后，用它关联 function_call_output。',
    '/previous_response_id': '本轮关联的上一响应 ID，不是本轮的新 ID。',
    '/usage': '输入用量包含关联历史；增量传输不等于只对新增 input 计费。数值为教学示例。',
  },
};
