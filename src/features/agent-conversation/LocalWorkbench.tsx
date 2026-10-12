import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Folder,
  Play,
  Terminal,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { files, projectPath, skillPath, type Branch } from '../../core/agent-conversation/fixtures';
import type { Call, FlowState } from '../../core/agent-conversation/flow';

export function LocalWorkbench({
  state,
  gate,
  onExecute,
  branch,
  onBranch,
  canConfigure,
  inspectionPath,
}: {
  state: FlowState;
  gate?: Call;
  onExecute: () => void;
  branch: Branch;
  onBranch?: (b: Branch) => void;
  canConfigure: boolean;
  inspectionPath?: string;
}) {
  const [selected, setSelected] = useState(projectPath);
  const [notes, setNotes] = useState(true);
  const [skills, setSkills] = useState(false);
  const terminal = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    const path = inspectionPath ?? state.activeFile;
    if (path) {
      setSelected(path);
      if (path === skillPath) setSkills(true);
      else setNotes(true);
    }
  }, [state.activeFile, inspectionPath]);
  useEffect(() => {
    if (terminal.current && follow.current)
      terminal.current.scrollTop = terminal.current.scrollHeight;
  }, [state.calls]);
  useEffect(() => {
    const el = terminal.current;
    if (!el || !inspectionPath) return;
    const call = state.calls.find((c) => c.path === inspectionPath);
    const entry = Array.from(el.querySelectorAll<HTMLElement>('[data-flow-anchor]')).find(
      (e) => e.dataset.flowAnchor === `terminal-${call?.callId}`,
    );
    if (entry) el.scrollTop += entry.getBoundingClientRect().top - el.getBoundingClientRect().top;
  }, [inspectionPath, state.calls]);
  const missing = branch === 'file-error';
  const current = state.calls.find((c) => c.path === selected);
  const content =
    missing && selected === projectPath
      ? 'FILE_NOT_FOUND\n\nnotes/project.md 不存在。'
      : files[selected];
  const file = (path: string) => (
    <button
      key={path}
      className={`workbench-file ${path === selected ? 'selected' : ''} ${missing && path === projectPath ? 'missing' : ''}`}
      aria-label={`打开 ${path}`}
      aria-pressed={path === selected}
      onClick={() => setSelected(path)}
    >
      <FileText size={13} />
      <span>{path === projectPath ? 'project.md' : 'SKILL.md'}</span>
      <span className="file-status-slot">
        {state.calls.some((c) => c.path === path && c.status === 'succeeded') && (
          <Check size={12} />
        )}
      </span>
    </button>
  );
  return (
    <aside className="workbench-local workbench-window" aria-label="本地工作区">
      <header className="workbench-titlebar">
        <span className="window-mark">
          <Code2 size={16} />
        </span>
        <strong>本地工作区</strong>
        <span className="window-badge">LOCAL</span>
      </header>
      <div className="workbench-filemanager">
        <div className="workbench-filebar">
          <Folder size={13} />
          <span>llm-lens</span>
          <span className="local-preview-status">
            {current?.status === 'running' ? '正在读取' : current?.result ? '工具已读' : '本地预览'}
          </span>
        </div>
        <div className="workbench-files">
          <nav className="workbench-tree" aria-label="文件管理">
            <div className="tree-width-reserve" aria-hidden="true">
              project-summary
            </div>
            <button
              className="workbench-folder"
              onClick={() => setNotes(!notes)}
              aria-expanded={notes}
            >
              {notes ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={13} />
              <span>notes</span>
            </button>
            {notes && file(projectPath)}
            <button
              className="workbench-folder"
              onClick={() => setSkills(!skills)}
              aria-expanded={skills}
            >
              {skills ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={13} />
              <span>skills</span>
            </button>
            {skills && (
              <div className="workbench-skill-folder">
                <span>project-summary</span>
                {file(skillPath)}
              </div>
            )}
          </nav>
          <section
            className="workbench-editor"
            aria-label="文件预览"
            data-flow-anchor={`file-${selected}`}
          >
            <div className="workbench-editor-tab">
              <FileText size={12} />
              <span>{selected === skillPath ? 'SKILL.md' : 'project.md'}</span>
              <span className="editor-read-dot" data-read={Boolean(current?.result)} />
            </div>
            <div className="workbench-editor-lines">
              {content
                .trimEnd()
                .split('\n')
                .map((line, i) => (
                  <div className={line.startsWith('#') ? 'file-heading' : ''} key={i}>
                    <span aria-hidden="true">{i + 1}</span>
                    <code>{line || ' '}</code>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>
      <section
        className="workbench-terminal"
        aria-label="仿真工具终端"
        data-flow-anchor="local-port"
      >
        <div className="terminal-title">
          <Terminal size={13} />
          <strong>工具终端</strong>
          <span>模拟</span>
        </div>
        <div
          className="terminal-scroll"
          ref={terminal}
          onScroll={() => {
            const el = terminal.current!;
            follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          }}
        >
          {!state.calls.some((c) => c.path) && (
            <div className="terminal-idle">
              <span>lens@workspace</span>
              <p>
                等待 Agent 调用
                <span className="terminal-caret" />
              </p>
            </div>
          )}
          {state.calls
            .filter((c) => c.path)
            .map((c) => (
              <div
                tabIndex={-1}
                className="terminal-entry"
                key={c.callId}
                data-flow-anchor={`terminal-${c.callId}`}
              >
                <p className="terminal-command">
                  <span>❯</span> read_file <span className="terminal-path">{c.path}</span>
                </p>
                {c.result !== undefined ? (
                  <>
                    <p className={c.status === 'failed' ? 'terminal-error' : 'terminal-success'}>
                      {c.status === 'failed'
                        ? '✕ FILE_NOT_FOUND'
                        : `✓ 已返回 ${c.result.trimEnd().split('\n').length} 行`}
                    </p>
                    <pre>{c.result}</pre>
                  </>
                ) : (
                  <p className="terminal-muted">
                    {c.status === 'ready' ? '等待执行' : '正在读取…'}
                  </p>
                )}
              </div>
            ))}
        </div>
        <div className="terminal-action-slot">
          {gate && (
            <button
              className="terminal-run"
              onClick={() => {
                const entry = Array.from(
                  terminal.current?.querySelectorAll<HTMLElement>('.terminal-entry') ?? [],
                ).find((el) => el.dataset.flowAnchor === `terminal-${gate.callId}`);
                entry?.focus({ preventScroll: true });
                onExecute();
              }}
            >
              <Play size={12} /> {gate.callId === 'call_skill' ? '加载 Skill' : '执行读取'}
            </button>
          )}
        </div>
      </section>
      <footer className="workbench-local-footer">
        <span>UTF-8 · 预设文件</span>
        {onBranch && (
          <button
            onClick={() => onBranch(missing ? 'normal' : 'file-error')}
            disabled={!canConfigure}
            aria-pressed={missing}
            aria-label="模拟文件缺失"
          >
            {missing ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}文件缺失
          </button>
        )}
      </footer>
    </aside>
  );
}
