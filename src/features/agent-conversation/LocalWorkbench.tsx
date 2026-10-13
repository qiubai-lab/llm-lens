import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  FileText,
  Folder,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { projectPath, skillPath, type Branch } from '../../core/agent-conversation/fixtures';
import type { Call, FlowState } from '../../core/agent-conversation/flow';
import { summaryPath, toolStatus } from '../../core/agent-conversation/tools';
import { ToolWorkbench } from './ToolWorkbench';

export function LocalWorkbench({
  state,
  gate,
  onExecute,
  branch,
  onBranch,
  canConfigure,
  inspectionPath,
  toolCall,
  inspecting,
  frozen,
  stopped,
}: {
  state: FlowState;
  gate?: Call;
  onExecute: () => void;
  branch: Branch;
  onBranch?: (b: Branch) => void;
  canConfigure: boolean;
  inspectionPath?: string;
  toolCall?: Call;
  inspecting: boolean;
  frozen: boolean;
  stopped: boolean;
}) {
  const [selected, setSelected] = useState(projectPath);
  const [notes, setNotes] = useState(true);
  const [skills, setSkills] = useState(false);
  const tree = useRef<HTMLElement>(null);
  useEffect(() => {
    const path = inspectionPath ?? state.activeFile;
    if (path && path !== 'notes' && path !== 'skills' && path !== 'skills/project-summary') {
      setSelected(path);
      if (path === skillPath) setSkills(true);
      else setNotes(true);
    }
  }, [state.activeFile, inspectionPath]);
  useEffect(() => {
    const path = inspectionPath ?? state.activeFile;
    const item = Array.from(
      tree.current?.querySelectorAll<HTMLElement>('[data-file-path]') ?? [],
    ).find((el) => el.dataset.filePath === path);
    if (item && tree.current) {
      const row = item.getBoundingClientRect(),
        viewport = tree.current.getBoundingClientRect();
      if (row.bottom > viewport.bottom) tree.current.scrollTop += row.bottom - viewport.bottom;
      else if (row.top < viewport.top) tree.current.scrollTop += row.top - viewport.top;
    }
  }, [inspectionPath, state.activeFile, notes, skills]);
  const missing = branch === 'file-error';
  const current = state.calls.filter((c) => c.path === selected).at(-1);
  const content =
    missing && selected === projectPath
      ? 'FILE_NOT_FOUND\n\nnotes/project.md 不存在。'
      : (state.files[selected] ?? '尚未创建此文件。');
  const file = (path: string) => (
    <button
      key={path}
      className={`workbench-file ${path === selected ? 'selected' : ''} ${missing && path === projectPath ? 'missing' : ''}`}
      data-file-path={path}
      data-flow-anchor={`file-${path}`}
      aria-label={`打开 ${path}`}
      aria-pressed={path === selected}
      onClick={() => setSelected(path)}
    >
      <FileText size={13} />
      <span>{path.split('/').at(-1)}</span>
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
            {inspecting ? '历史快照' : current ? toolStatus(current) : '本地预览'}
          </span>
        </div>
        <div className="workbench-files">
          <nav className="workbench-tree" aria-label="文件管理" ref={tree}>
            <div className="tree-width-reserve" aria-hidden="true">
              <span>project-summary</span>
              <span className="tree-file-width-reserve">summary.md</span>
            </div>
            <button
              className="workbench-folder"
              data-flow-anchor="directory-notes"
              onClick={() => setNotes(!notes)}
              aria-expanded={notes}
            >
              {notes ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={13} />
              <span>notes</span>
            </button>
            {notes && (
              <>
                {file(projectPath)}
                {Object.hasOwn(state.files, summaryPath) && file(summaryPath)}
              </>
            )}
            <button
              className="workbench-folder"
              data-flow-anchor="directory-skills"
              onClick={() => setSkills(!skills)}
              aria-expanded={skills}
            >
              {skills ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={13} />
              <span>skills</span>
            </button>
            {skills && (
              <div className="workbench-skill-folder">
                <span data-flow-anchor="directory-skills/project-summary">project-summary</span>
                {file(skillPath)}
              </div>
            )}
          </nav>
          <section className="workbench-editor" aria-label="文件预览">
            <div className="workbench-editor-tab">
              <FileText size={12} />
              <span>{selected.split('/').at(-1)}</span>
              <span className="editor-read-dot" data-read={current?.status === 'succeeded'} />
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
      <ToolWorkbench
        call={toolCall}
        inspecting={inspecting}
        gate={gate}
        onExecute={onExecute}
        frozen={frozen}
        stopped={stopped}
      />
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
