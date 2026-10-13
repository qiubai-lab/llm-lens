// Technical contract: docs/demos/agent-conversation/TECHNICAL_DESIGN.md
import { simulateTool, summaryPath, toolDefinitions, type ToolName } from './tools';
export type Branch = 'normal' | 'file-error' | 'interrupted';
export type Task = 'summary' | 'save-summary';
export type Item = { [key: string]: unknown };
export type FlowEvent = {
  id: string;
  round: number;
  type: string;
  label: string;
  lane: 'local' | 'request' | 'response' | 'chat';
  data: Item;
};
export type Lesson = {
  question: string;
  instructions: string;
  events: FlowEvent[];
  initialCursor: number;
  missingFile?: boolean;
};
export const projectPath = 'notes/project.md';
export const skillPath = 'skills/project-summary/SKILL.md';
export const projectText =
  '# LLM Lens\n目标：用交互演示帮助初学者理解语言模型。\n技术：Vite、React、TypeScript 和 Motion。\n部署：GitHub Pages；教学模拟不连接真实模型。\n';
export const skillText =
  '---\nname: project-summary\ndescription: 读取项目说明并整理为三条中文摘要。\n---\n先读取用户指定的项目说明文件。\n摘要依次覆盖目标、技术和部署。\n只依据已读内容，不补写不存在的事实。\n';
export const files: Record<string, string> = { [projectPath]: projectText, [skillPath]: skillText };
export const toolDefinition = toolDefinitions[0];
export const summaryText =
  '# 项目摘要\n1. 目标：用交互演示帮助初学者理解语言模型。\n2. 技术：Vite、React、TypeScript 和 Motion。\n3. 部署：GitHub Pages；教学模拟不连接真实模型。\n';
export const agentTopic = {
  id: 'agent' as const,
  title: 'Agent，是怎样完成任务的？',
  subtitle: '从对话框到工具与 Skill',
  duration: '约 3 分钟',
  scenes: [
    {
      short: '完整演示',
      title: 'Agent，怎样完成一次任务？',
      kicker: 'AGENT / WORKBENCH',
      description: '读取 Skill、读取文件、回传结果、生成摘要。一次用户请求，三轮模型通信。',
      insight: '工具结果进入下一轮请求，模型再据此回答。',
    },
  ],
};

export function createLesson(scene: number, branch: Branch, task: Task = 'summary'): Lesson {
  const useSkill = scene >= 4;
  const simple = scene < 2;
  const saving = !simple && task === 'save-summary';
  const question = saving
    ? '请列出 notes 目录，读取项目说明，按项目摘要 Skill 整理三条要点并保存到 notes/summary.md。'
    : simple
      ? '用一句话解释什么是 Agent。'
      : useSkill
        ? '请读取 notes/project.md，并按项目摘要 Skill 用三条要点总结。'
        : '请读取 notes/project.md，用三条要点总结这个项目。';
  const instructions =
    '使用简短的中文回答。根据已读资料回答，工作区文件使用 read_file 读取。' +
    (saving ? '先列出 notes 目录，将摘要使用 write_file 写入 notes/summary.md。' : '') +
    (useSkill
      ? `可用 Skill：project-summary；描述：读取项目说明并整理为三条中文摘要；路径：${skillPath}。`
      : '');
  const events: FlowEvent[] = [];
  let round = 0;
  const add = (type: string, label: string, lane: FlowEvent['lane'], data: Item = {}) =>
    events.push({ id: `e${events.length}`, round, type, label, lane, data });
  add('local.user_message', '用户消息进入对话', 'chat', { text: question });
  const start = () => {
    round++;
    add('local.request', '组装并发送新的 POST 请求', 'request');
    add('response.created', '模型服务创建响应', 'response', {
      response: { id: `resp_${round}`, status: 'in_progress' },
    });
    add('response.in_progress', '模型服务生成输出', 'response', {
      response: { id: `resp_${round}`, status: 'in_progress' },
    });
  };
  const workspace = { ...files };
  if (branch === 'file-error') delete workspace[projectPath];
  const call = (path: string, key: string, name: ToolName = 'read_file', content?: string) => {
    start();
    const item = {
      type: 'function_call',
      id: `fc_${key}`,
      call_id: `call_${key}`,
      name,
      arguments: '',
    };
    add('response.output_item.added', `模型请求调用 ${name}`, 'response', {
      output_index: 0,
      item,
    });
    const values = { path, ...(content !== undefined ? { content } : {}) };
    const args = JSON.stringify(values);
    for (const delta of [args.slice(0, 8), args.slice(8, -1), '}'])
      add('response.function_call_arguments.delta', '接收工具参数片段', 'response', {
        item_id: item.id,
        output_index: 0,
        delta,
      });
    add('response.function_call_arguments.done', '参数完整，等待调用项结束', 'response', {
      item_id: item.id,
      output_index: 0,
      arguments: args,
    });
    const complete = { ...item, arguments: args, status: 'completed' };
    add('response.output_item.done', '完整调用项已接收', 'response', {
      output_index: 0,
      item: complete,
    });
    add('response.completed', '本轮响应结束，Agent 仍需执行工具', 'response', {
      response: { id: `resp_${round}`, status: 'completed', output: [complete] },
    });
    add('local.tool_start', '校验通过，聚焦本地文件', 'local', { call_id: item.call_id, path });
    const { failed, output } = simulateTool(name, values, workspace);
    add(
      'local.tool_result',
      failed ? '文件读取失败，生成错误结果' : '读取内容，插入工具结果',
      'local',
      {
        call_id: item.call_id,
        output,
        failed,
      },
    );
    if (name === 'write_file' && !failed) workspace[path] = content!;
    add('local.result_staged', '工具结果等待送入下一轮请求', 'chat', { call_id: item.call_id });
  };
  if (saving) call('notes', 'list', 'list_directory');
  if (useSkill) call(skillPath, 'skill');
  if (!simple) call(projectPath, 'file');
  if (saving && branch !== 'file-error') call(summaryPath, 'write', 'write_file', summaryText);
  start();
  if (scene === 0) return { question, instructions, events: events.slice(0, 3), initialCursor: 0 };
  const fragments = simple
    ? ['Agent 是一种', '能围绕目标，', '调用工具并持续推进任务的应用。']
    : branch === 'file-error'
      ? ['无法读取 notes/project.md。', '文件不存在，', '因此我不能根据文件生成摘要。']
      : [
          '1. 目标：用交互演示',
          '帮助初学者理解语言模型。\n',
          '2. 技术：Vite、React、',
          'TypeScript 和 Motion。\n',
          '3. 部署：GitHub Pages；',
          '教学模拟不连接真实模型。',
          ...(saving ? ['\n已保存到 notes/summary.md。'] : []),
        ];
  const message = {
    type: 'message',
    id: `msg_${round}`,
    role: 'assistant',
    status: 'in_progress',
    content: [],
  };
  add('response.output_item.added', '建立助手回答', 'response', { output_index: 0, item: message });
  add('response.content_part.added', '开始一个文本内容块', 'response', {
    item_id: message.id,
    output_index: 0,
    content_index: 0,
    part: { type: 'output_text', text: '', annotations: [] },
  });
  let text = '';
  for (const [i, delta] of fragments.entries()) {
    text += delta;
    add('response.output_text.delta', '文本增量更新回答气泡', 'response', {
      item_id: message.id,
      output_index: 0,
      content_index: 0,
      delta,
    });
    if (branch === 'interrupted' && i === 1) {
      add('local.stream_interrupted', '连接中断，保留已收到的回答', 'response');
      return {
        question,
        instructions,
        events,
        initialCursor: 0,
        missingFile: false,
      };
    }
  }
  add('response.output_text.done', '正文结束，核对最终文本', 'response', {
    item_id: message.id,
    output_index: 0,
    content_index: 0,
    text,
  });
  const part = { type: 'output_text', text, annotations: [] };
  add('response.content_part.done', '文本内容块结束', 'response', {
    item_id: message.id,
    output_index: 0,
    content_index: 0,
    part,
  });
  const done = { ...message, status: 'completed', content: [part] };
  add('response.output_item.done', '助手消息项结束', 'response', { output_index: 0, item: done });
  add('response.completed', '模型响应结束，检查任务结果', 'response', {
    response: { id: `resp_${round}`, status: 'completed', output: [done] },
  });
  add(
    'local.task_end',
    branch === 'file-error' ? '任务受阻：未读到文件' : '没有待执行工具，任务完成',
    'chat',
    { failed: branch === 'file-error' },
  );
  return {
    question,
    instructions,
    events,
    initialCursor: 0,
    missingFile: branch === 'file-error',
  };
}
