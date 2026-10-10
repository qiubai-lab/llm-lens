// Technical contract: docs/demos/agent-conversation/TECHNICAL_DESIGN.md
export type Branch = 'normal' | 'file-error' | 'interrupted';
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
};
export const projectPath = 'notes/project.md';
export const skillPath = 'skills/project-summary/SKILL.md';
export const projectText =
  '# LLM Lens\n目标：用交互演示帮助初学者理解语言模型。\n技术：Vite、React、TypeScript 和 Motion。\n部署：GitHub Pages；教学模拟不连接真实模型。\n';
export const skillText =
  '---\nname: project-summary\ndescription: 读取项目说明并整理为三条中文摘要。\n---\n先读取用户指定的项目说明文件。\n摘要依次覆盖目标、技术和部署。\n只依据已读内容，不补写不存在的事实。\n';
export const files: Record<string, string> = { [projectPath]: projectText, [skillPath]: skillText };
export const toolDefinition = {
  type: 'function',
  name: 'read_file',
  description: '读取教学工作区中指定文件的完整 UTF-8 文本。',
  parameters: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
    additionalProperties: false,
  },
  strict: true,
};
export const agentScenes = [
  {
    short: '发送请求',
    title: '一句话，怎样抵达模型？',
    kicker: '01 / REQUEST',
    description: '在对话框发送消息，看指令、历史和工具定义怎样组成请求。',
    insight: '文件在工作区里，不会因为发送消息就自动全部上传。',
  },
  {
    short: '流式回答',
    title: '回答，一片一片回到这里',
    kicker: '02 / STREAM',
    description: '服务器发送内容增量，应用解析后，更新同一个回答气泡。',
    insight: 'SSE 事件不是一个 Token，也不一定是一个字。正文结束与响应结束分别记录。',
  },
  {
    short: '工具调用',
    title: '模型提出请求，Agent 来执行',
    kicker: '03 / TOOL CALL',
    description: '工具名和参数也可以流式返回。完整接收后，才轮到本地执行。',
    insight: '模型不能直接读取你的本地文件。工具定义描述能力，实际读取由 Agent 运行时负责。',
  },
  {
    short: '文件与结果',
    title: '读到的文件，成为下一轮上下文',
    kicker: '04 / TOOL RESULT',
    description: '跟随一份文件内容：从本地预览，到工具结果，再到下一轮请求。',
    insight: '工具结果通过 call_id 对应原调用。结果回传需要新的模型请求，文件仍留在本地。',
  },
  {
    short: 'Skill 加载',
    title: '先找到方法，再按方法做事',
    kicker: '05 / SKILL',
    description: '先看 Skill 的名字与描述，需要时读正文，再按步骤调用工具。',
    insight:
      'Skill 提供流程与知识，工具提供执行能力。本章通过 read_file 加载本地 Skill，是教学宿主的设计。',
  },
  {
    short: '完整 Agent 循环',
    title: '一条消息，串起整个循环',
    kicker: '06 / AGENT LOOP',
    description: '读取 Skill、读取文件、回传结果、生成摘要。一次用户请求，三轮模型通信。',
    insight: '一次模型响应完成不等于整个任务完成。回看只是重建历史，不会再次执行工具。',
  },
] as const;
export const agentTopic = {
  id: 'agent' as const,
  title: 'Agent，是怎样完成任务的？',
  subtitle: '从对话框到工具与 Skill',
  duration: '约 7 分钟',
  scenes: agentScenes,
};

export function createLesson(scene: number, branch: Branch): Lesson {
  const useSkill = scene >= 4;
  const simple = scene < 2;
  const question = simple
    ? '用一句话解释什么是 Agent。'
    : useSkill
      ? '请读取 notes/project.md，并按项目摘要 Skill 用三条要点总结。'
      : '请读取 notes/project.md，用三条要点总结这个项目。';
  const instructions =
    '使用简短的中文回答。根据已读资料回答，工作区文件使用 read_file 读取。' +
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
  const call = (path: string, key: string) => {
    start();
    const item = {
      type: 'function_call',
      id: `fc_${key}`,
      call_id: `call_${key}`,
      name: 'read_file',
      arguments: '',
    };
    add('response.output_item.added', '模型请求调用 read_file', 'response', {
      output_index: 0,
      item,
    });
    const args = JSON.stringify({ path });
    for (const delta of ['{"path":', JSON.stringify(path), '}'])
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
    if (scene === 2) return;
    add('local.tool_start', '校验通过，聚焦本地文件', 'local', { call_id: item.call_id, path });
    const failed = branch === 'file-error' && path === projectPath;
    add(
      'local.tool_result',
      failed ? '文件读取失败，生成错误结果' : '读取内容，插入工具结果',
      'local',
      {
        call_id: item.call_id,
        output: failed ? JSON.stringify({ ok: false, code: 'FILE_NOT_FOUND', path }) : files[path],
        failed,
      },
    );
    add('local.result_staged', '工具结果等待送入下一轮请求', 'chat', { call_id: item.call_id });
  };
  if (useSkill) call(skillPath, 'skill');
  if (!simple) call(projectPath, 'file');
  if (scene === 2) return { question, instructions, events, initialCursor: 0 };
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
        initialCursor: scene === 3 ? events.findIndex((e) => e.type === 'local.tool_start') : 0,
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
    initialCursor: scene === 3 ? events.findIndex((e) => e.type === 'local.tool_start') : 0,
  };
}
