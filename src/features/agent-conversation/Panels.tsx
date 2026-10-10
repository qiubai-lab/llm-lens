import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  Check,
  ChevronRight,
  FileText,
  Folder,
  Server,
  Terminal,
  WandSparkles,
} from 'lucide-react';
import { projectPath, skillPath } from '../../core/agent-conversation/fixtures';
import type { FlowState } from '../../core/agent-conversation/flow';
import { Concept } from '../../components/Concept';

export function RawData({ value }: { value: unknown }) {
  return (
    <pre className="agent-code">
      {typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}
export function LocalPanel({ state }: { state: FlowState }) {
  const [selected, setSelected] = useState<string>();
  useEffect(() => setSelected(undefined), [state.activeFile]);
  const path = selected ?? state.activeFile ?? projectPath;
  const read = state.calls.find((c) => c.path === path && c.result !== undefined);
  return (
    <aside className="agent-local agent-panel" aria-label="Agent 本地数据流">
      <div className="agent-panel-heading">
        <Terminal size={16} />
        <strong>Agent 本地</strong>
        <span>工作区</span>
      </div>
      <p className="agent-panel-intro">工具在这里执行，内容读后才回传。</p>
      <div className="agent-folder">
        <Folder size={14} /> 教学工作区
      </div>
      {[projectPath, skillPath].map((p) => (
        <button
          key={p}
          className={`agent-file ${state.activeFile === p ? 'file-active' : ''}`}
          aria-pressed={path === p}
          onClick={() => setSelected(p)}
        >
          <FileText size={15} />
          <span>
            {p === projectPath ? 'notes / project.md' : 'skills / project-summary / SKILL.md'}
          </span>
          {state.calls.some((c) => c.path === p && c.status === 'succeeded') && <Check size={13} />}
        </button>
      ))}
      <div className="agent-skill-catalog">
        <WandSparkles size={15} />
        <div>
          <strong>project-summary</strong>
          <p>读取项目说明并整理为三条中文摘要。</p>
          <Concept title="Skill 元信息">
            初始请求可包含名称、描述和路径。正文在选用后读取；Skill 提供方法，工具负责执行。
          </Concept>
        </div>
      </div>
      <div
        className={`agent-file-preview ${read?.status === 'failed' ? 'agent-error' : ''}`}
        data-flow-anchor="local"
      >
        <div className="agent-preview-label">
          <FileText size={14} />
          <strong>{path === skillPath ? 'SKILL.md' : 'project.md'}</strong>
          <span>{read ? (read.status === 'failed' ? '读取失败' : '已读取') : '尚未读取'}</span>
        </div>
        {read ? (
          <motion.div
            className="agent-preview-content"
            key={read.callId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            <RawData value={read.result} />
          </motion.div>
        ) : (
          <div className="agent-empty-preview">
            文件还在本地。
            <br />
            等待 read_file 的完整调用。
          </div>
        )}
      </div>
      <div className="agent-local-status">
        <span className="status-dot" />
        {state.calls.some((c) => c.status === 'running')
          ? '执行器正在读取预设文件'
          : `已模拟执行 ${state.executionCount} 次读取`}
      </div>
    </aside>
  );
}
export function RemotePanel({ state }: { state: FlowState }) {
  const [chosen, setChosen] = useState<number>();
  const request = state.requests.find((r) => r.round === chosen) ?? state.requests.at(-1);
  const latest = state.last;
  return (
    <aside className="agent-remote agent-panel" aria-label="模型请求与响应数据流">
      <div className="agent-panel-heading">
        <Server size={16} />
        <strong>模型通信</strong>
        <span>HTTP + SSE</span>
      </div>
      <div className="agent-server">
        <Server size={23} />
        <div>
          <strong>模型服务</strong>
          <span>
            {state.response === 'streaming'
              ? '生成正文或工具调用'
              : state.response === 'completed'
                ? '本轮响应已结束'
                : state.response === 'interrupted'
                  ? '流已中断'
                  : '等待请求'}
          </span>
        </div>
        <Concept title="模型服务" compact>
          这里是抽象服务节点。演示不展示模型隐式思考，也不发送真实网络请求。
        </Concept>
      </div>
      <div className="agent-rounds" aria-label="查看请求轮次">
        {[1, 2, 3].map((n) => (
          <button
            key={n}
            disabled={!state.requests.some((r) => r.round === n)}
            aria-pressed={request?.round === n}
            onClick={() => setChosen(n)}
          >
            第 {n} 轮
          </button>
        ))}
      </div>
      <div className="agent-request-box" data-flow-anchor="remote">
        <div className="agent-preview-label">
          <span className="agent-http">POST</span>
          <strong>/v1/responses</strong>
        </div>
        <p>{request ? `${request.body.input.length} 个输入项 · stream: true` : '等待组装请求'}</p>
        <details>
          <summary>
            展开本轮请求 <ChevronRight size={13} />
          </summary>
          {request ? <RawData value={request.body} /> : <p>消息发送后可查看完整教学请求。</p>}
        </details>
      </div>
      <div className="agent-event-box">
        <span className="tiny-label">当前事件 / 本地步骤</span>
        <strong>{latest?.type ?? '等待发送'}</strong>
        <RawData value={latest ? { type: latest.type, ...latest.data } : {}} />
      </div>
      <p className="agent-boundary-note">
        响应结束 ≠ 任务完成
        <br />
        工具结果要进入新的模型请求。
      </p>
    </aside>
  );
}
