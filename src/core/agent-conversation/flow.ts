// Pure replay, never executes a tool. See the topic TECHNICAL_DESIGN.md.
import { files, toolDefinition, type FlowEvent, type Item, type Lesson } from './fixtures';
export type Call = {
  id: string;
  callId: string;
  round: number;
  name: string;
  arguments: string;
  path?: string;
  status: 'assembling' | 'ready' | 'running' | 'succeeded' | 'failed';
  result?: string;
};
export type Request = {
  round: number;
  body: {
    model: string;
    instructions: string;
    input: Item[];
    tools: Item[];
    stream: true;
    parallel_tool_calls: false;
  };
};
export type FlowState = {
  user: string;
  calls: Call[];
  requests: Request[];
  history: Item[];
  answer: string;
  response: 'waiting' | 'streaming' | 'completed' | 'interrupted';
  task: 'active' | 'finished' | 'blocked';
  activeFile?: string;
  executionCount: number;
  last?: FlowEvent;
};
export function replay(lesson: Lesson, cursor: number): FlowState {
  const state: FlowState = {
    user: '',
    calls: [],
    requests: [],
    history: [],
    answer: '',
    response: 'waiting',
    task: 'active',
    executionCount: 0,
  };
  const seenResults = new Set<string>();
  for (const event of lesson.events.slice(0, Math.max(0, cursor))) {
    state.last = event;
    const d = event.data;
    const item = d.item as Item | undefined;
    const call = state.calls.find(
      (c) => c.id === d.item_id || c.callId === d.call_id || c.id === item?.id,
    );
    switch (event.type) {
      case 'local.user_message':
        state.user = String(d.text);
        state.history.push({ role: 'user', content: state.user });
        break;
      case 'local.request':
        state.requests.push({
          round: event.round,
          body: {
            model: '<responses-compatible-model>',
            instructions: lesson.instructions,
            input: state.history.map((i) => ({ ...i })),
            tools: [toolDefinition],
            stream: true,
            parallel_tool_calls: false,
          },
        });
        state.response = 'waiting';
        break;
      case 'response.created':
      case 'response.in_progress':
        state.response = 'streaming';
        break;
      case 'response.output_item.added':
        if (item?.type === 'function_call')
          state.calls.push({
            id: String(item.id),
            callId: String(item.call_id),
            round: event.round,
            name: String(item.name),
            arguments: '',
            status: 'assembling',
          });
        break;
      case 'response.function_call_arguments.delta':
        if (call) call.arguments += String(d.delta);
        break;
      case 'response.function_call_arguments.done':
        if (call) call.arguments = String(d.arguments);
        break;
      case 'response.output_item.done':
        if (call && item?.type === 'function_call') {
          call.arguments = String(item.arguments);
          try {
            const args = JSON.parse(call.arguments);
            if (
              call.name === 'read_file' &&
              Object.keys(args).length === 1 &&
              typeof args.path === 'string' &&
              Object.hasOwn(files, args.path)
            ) {
              call.path = args.path;
              call.status = 'ready';
            } else call.status = 'failed';
          } catch {
            call.status = 'failed';
          }
        }
        break;
      case 'response.completed': {
        state.response = 'completed';
        const output = (d.response as { output: Item[] }).output;
        state.history.push(...output);
        break;
      }
      case 'local.tool_start':
        if (call?.status === 'ready' && state.response === 'completed') {
          call.status = 'running';
          state.activeFile = call.path;
        }
        break;
      case 'local.tool_result':
        if (call?.status === 'running' && !seenResults.has(call.callId)) {
          seenResults.add(call.callId);
          call.result = String(d.output);
          call.status = d.failed ? 'failed' : 'succeeded';
          state.executionCount++;
          state.history.push({
            type: 'function_call_output',
            call_id: call.callId,
            output: call.result,
          });
        }
        break;
      case 'response.output_text.delta':
        state.answer += String(d.delta);
        break;
      case 'response.output_text.done':
        state.answer = String(d.text);
        break;
      case 'local.stream_interrupted':
        state.response = 'interrupted';
        state.task = 'blocked';
        break;
      case 'local.task_end':
        state.task =
          d.failed || state.calls.some((c) => c.status !== 'succeeded') ? 'blocked' : 'finished';
        break;
    }
  }
  return state;
}
