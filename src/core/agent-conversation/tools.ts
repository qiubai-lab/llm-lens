// Custom teaching tools, not provider built-ins. TECHNICAL_DESIGN.md §9.
export const toolCatalog = [
  {
    name: 'read_file',
    label: '读取文件',
    running: '正在读取',
    success: '已读取',
    execute: '执行读取',
  },
  {
    name: 'write_file',
    label: '写入文件',
    running: '正在写入',
    success: '已写入',
    execute: '执行写入',
  },
  {
    name: 'list_directory',
    label: '列出目录',
    running: '正在列目录',
    success: '已列出',
    execute: '执行列目录',
  },
] as const;
export type ToolName = (typeof toolCatalog)[number]['name'];
export const toolInfo = (name: string) => toolCatalog.find((t) => t.name === name);
export const toolDefinitions = toolCatalog.map((tool) => ({
  type: 'function',
  name: tool.name,
  description:
    tool.name === 'read_file'
      ? '读取教学工作区中指定文件的完整 UTF-8 文本。'
      : tool.name === 'write_file'
        ? '将摘要文本写入教学工作区的 notes/summary.md。'
        : '列出教学工作区指定目录的直接子项。',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      ...(tool.name === 'write_file' ? { content: { type: 'string' } } : {}),
    },
    required: tool.name === 'write_file' ? ['path', 'content'] : ['path'],
    additionalProperties: false,
  },
  strict: true,
}));
export const directoryPaths = ['notes', 'skills', 'skills/project-summary'];
export const summaryPath = 'notes/summary.md';
export type ToolArguments = { path: string; content?: string };

export function parseToolArguments(
  name: string,
  raw: string,
  files: Record<string, string>,
): ToolArguments | undefined {
  try {
    const args = JSON.parse(raw);
    if (!args || typeof args !== 'object' || Array.isArray(args) || typeof args.path !== 'string')
      return;
    const keys = Object.keys(args);
    if (name === 'write_file') {
      if (keys.length === 2 && args.path === summaryPath && typeof args.content === 'string')
        return args;
    } else if (
      keys.length === 1 &&
      ((name === 'read_file' &&
        (Object.hasOwn(files, args.path) || args.path === 'notes/project.md')) ||
        (name === 'list_directory' && directoryPaths.includes(args.path)))
    )
      return args;
  } catch {
    /* Incomplete or invalid JSON is never executable. */
  }
}

export function simulateTool(name: string, args: ToolArguments, files: Record<string, string>) {
  if (name === 'read_file') {
    const text = files[args.path];
    return text === undefined
      ? {
          failed: true,
          output: JSON.stringify({ ok: false, code: 'FILE_NOT_FOUND', path: args.path }),
        }
      : { failed: false, output: text };
  }
  if (name === 'write_file')
    return {
      failed: false,
      output: JSON.stringify({ ok: true, path: args.path, written: true }),
    };
  const children = new Map<string, 'file' | 'directory'>();
  for (const path of [...directoryPaths, ...Object.keys(files)]) {
    if (!path.startsWith(`${args.path}/`)) continue;
    const rest = path.slice(args.path.length + 1);
    children.set(
      rest.split('/')[0],
      rest.includes('/') || directoryPaths.includes(path) ? 'directory' : 'file',
    );
  }
  return {
    failed: false,
    output: JSON.stringify({
      ok: true,
      path: args.path,
      entries: [...children].map(([name, type]) => ({ name, type })),
    }),
  };
}

export const toolStatus = (call: { name: string; status: string }) => {
  const info = toolInfo(call.name);
  return call.status === 'assembling'
    ? '接收参数'
    : call.status === 'ready'
      ? '等待执行'
      : call.status === 'running'
        ? (info?.running ?? '正在执行')
        : call.status === 'failed'
          ? '执行失败'
          : (info?.success ?? '已完成');
};
