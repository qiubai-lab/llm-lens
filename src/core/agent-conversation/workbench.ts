// Teaching interaction/visual mapping; see the topic TECHNICAL_DESIGN.md §5.
import type { Lesson } from './fixtures';
import { replay, type Call } from './flow';
export function interactionGate(lesson: Lesson, cursor: number): Call | undefined {
  const next = lesson.events[cursor];
  if (next?.type !== 'local.tool_start') return;
  const state = replay(lesson, cursor);
  if (state.response !== 'completed') return;
  return state.calls.find((c) => c.callId === next.data.call_id && c.status === 'ready');
}
export type Activity = {
  id: string;
  round: number;
  kind: 'request' | 'call' | 'answer';
  title: string;
  content: string;
  status: string;
  callId?: string;
  detail: unknown;
};
export function buildActivities(lesson: Lesson, cursor: number): Activity[] {
  const state = replay(lesson, cursor);
  const events = lesson.events.slice(0, cursor);
  return state.requests.flatMap((request) => {
    const result = request.body.input.filter((i) => i.type === 'function_call_output').at(-1);
    const cards: Activity[] = [
      {
        id: `server-request-${request.round}`,
        round: request.round,
        kind: 'request',
        title: result ? '接收工具结果' : '收到用户请求',
        content: result ? String(result.output) : lesson.question,
        status: '已接收',
        callId: result ? String(result.call_id) : undefined,
        detail: request.body,
      },
    ];
    for (const call of state.calls.filter((c) => c.round === request.round))
      cards.push({
        id: `server-call-${call.callId}`,
        callId: call.callId,
        round: request.round,
        kind: 'call',
        title: '提出工具调用',
        content: call.path ?? call.arguments,
        status: call.status === 'assembling' ? '参数生成中' : '已发送',
        detail: {
          type: 'function_call',
          name: call.name,
          call_id: call.callId,
          arguments: call.arguments,
        },
      });
    if (events.some((e) => e.round === request.round && e.type === 'response.content_part.added'))
      cards.push({
        id: `server-answer-${request.round}`,
        round: request.round,
        kind: 'answer',
        title: '生成回答',
        content: state.answer,
        status:
          state.response === 'interrupted'
            ? '中断'
            : state.response === 'completed'
              ? '已完成'
              : '输出中',
        detail: events
          .filter((e) => e.round === request.round && e.type.startsWith('response.output_text'))
          .map((e) => ({ type: e.type, ...e.data })),
      });
    return cards;
  });
}
export type Transfer = {
  id: string;
  kind: 'request' | 'call' | 'execute' | 'result' | 'continuation' | 'text';
  from: string;
  to: string;
  fromArea: 'chat' | 'local' | 'server';
  toArea: 'chat' | 'local' | 'server';
  label: string;
  tone: 'blue' | 'purple' | 'green';
  pending?: boolean;
};
export function currentTransfer(lesson: Lesson, cursor: number): Transfer | undefined {
  const state = replay(lesson, cursor);
  for (const event of lesson.events.slice(0, cursor).reverse()) {
    const base = { id: event.id };
    const call = state.calls.find(
      (c) => c.id === event.data.item_id || c.callId === event.data.call_id,
    );
    if (event.type === 'local.request') {
      const request = state.requests.find((r) => r.round === event.round);
      const result = request?.body.input.filter((i) => i.type === 'function_call_output').at(-1);
      return {
        ...base,
        kind: result ? 'continuation' : 'request',
        from: result ? `agent-result-${result.call_id}` : 'composer',
        to: `server-request-${event.round}`,
        fromArea: 'chat',
        toArea: 'server',
        label: result ? '回传结果' : '发送请求',
        tone: 'blue',
      };
    }
    if (event.type === 'response.function_call_arguments.done' && call)
      return {
        ...base,
        kind: 'call',
        from: `server-call-${call.callId}`,
        to: `agent-call-${call.callId}`,
        fromArea: 'server',
        toArea: 'chat',
        label: '调用工具',
        tone: 'purple',
      };
    if (event.type === 'local.tool_start' && call)
      return {
        ...base,
        kind: 'execute',
        from: `agent-call-${call.callId}`,
        to: `file-${call.path}`,
        fromArea: 'chat',
        toArea: 'local',
        label: call.callId === 'call_skill' ? '加载 Skill' : '读取文件',
        tone: 'purple',
      };
    if (event.type === 'local.tool_result' && call)
      return {
        ...base,
        kind: 'result',
        from: `terminal-${call.callId}`,
        to: `agent-result-${call.callId}`,
        fromArea: 'local',
        toArea: 'chat',
        label: call.status === 'failed' ? '返回错误' : '返回内容',
        tone: 'green',
      };
    if (event.type === 'response.output_text.delta')
      return {
        ...base,
        kind: 'text',
        from: `server-answer-${event.round}`,
        to: 'answer',
        fromArea: 'server',
        toArea: 'chat',
        label: '流式响应',
        tone: 'green',
      };
  }
}

// Inspection restores visual associations only; replay remains the source of execution state.
export function activityTransfers(lesson: Lesson, cursor: number, cardId: string): Transfer[] {
  const card = buildActivities(lesson, cursor).find((c) => c.id === cardId);
  if (!card) return [];
  const state = replay(lesson, cursor);
  const link = (
    kind: Transfer['kind'],
    from: string,
    to: string,
    fromArea: Transfer['fromArea'],
    toArea: Transfer['toArea'],
    label: string,
    tone: Transfer['tone'],
    pending = false,
  ): Transfer => ({
    id: `${cardId}-${kind}`,
    kind,
    from,
    to,
    fromArea,
    toArea,
    label,
    tone,
    pending,
  });
  if (card.kind === 'answer')
    return [link('text', card.id, 'answer', 'server', 'chat', '流式响应', 'green')];
  const links =
    card.kind === 'call'
      ? [link('call', card.id, `agent-call-${card.callId}`, 'server', 'chat', '调用工具', 'purple')]
      : [
          link(
            card.callId ? 'continuation' : 'request',
            card.callId ? `agent-result-${card.callId}` : 'composer',
            card.id,
            'chat',
            'server',
            card.callId ? '回传结果' : '发送请求',
            'blue',
          ),
        ];
  const call = state.calls.find((c) => c.callId === card.callId);
  if (call?.path) {
    const pending = call.status === 'ready' || call.status === 'assembling';
    links.push(
      link(
        'execute',
        `agent-call-${call.callId}`,
        `file-${call.path}`,
        'chat',
        'local',
        pending ? '待读取' : call.callId === 'call_skill' ? '加载 Skill' : '读取文件',
        'purple',
        pending,
      ),
    );
    if (call.result !== undefined)
      links.push(
        link(
          'result',
          `terminal-${call.callId}`,
          `agent-result-${call.callId}`,
          'local',
          'chat',
          call.status === 'failed' ? '返回错误' : '返回内容',
          'green',
        ),
      );
  }
  return links;
}

export const transferKey = (transfer: Transfer) =>
  `${transfer.kind}:${transfer.from}:${transfer.to}`;
export type NumberedTransfer = Transfer & { sequence: number };
// Ordered, pure history: a streaming answer contributes one semantic connection.
export function transferHistory(lesson: Lesson, cursor: number): NumberedTransfer[] {
  const types = new Set([
    'local.request',
    'response.function_call_arguments.done',
    'local.tool_start',
    'local.tool_result',
    'response.output_text.delta',
  ]);
  const seen = new Set<string>();
  const history: NumberedTransfer[] = [];
  lesson.events.slice(0, cursor).forEach((event, index) => {
    if (!types.has(event.type)) return;
    const transfer = currentTransfer(lesson, index + 1);
    if (!transfer || seen.has(transferKey(transfer))) return;
    seen.add(transferKey(transfer));
    history.push({ ...transfer, sequence: history.length + 1 });
  });
  return history;
}
