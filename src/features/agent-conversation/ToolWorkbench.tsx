import { useId } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import {
  Check,
  CircleAlert,
  FileText,
  Folder,
  LoaderCircle,
  Pencil,
  Play,
  Wrench,
} from 'lucide-react';
import type { Call } from '../../core/agent-conversation/flow';
import { toolCatalog, toolInfo, toolStatus } from '../../core/agent-conversation/tools';
import { useCalmMotion } from '../../components/MotionPreference';

export function ToolIcon({ name, size = 14 }: { name: string; size?: number }) {
  return name === 'write_file' ? (
    <Pencil size={size} />
  ) : name === 'list_directory' ? (
    <Folder size={size} />
  ) : (
    <FileText size={size} />
  );
}

// Call identity owns connections/results; tool identity only owns the visual promotion.
export function ToolWorkbench({
  call,
  inspecting,
  gate,
  onExecute,
  frozen,
  stopped,
}: {
  call?: Call;
  inspecting: boolean;
  gate?: Call;
  onExecute: () => void;
  frozen: boolean;
  stopped: boolean;
}) {
  const reduced = useCalmMotion();
  const groupId = useId();
  const active = call && call.status !== 'assembling' ? toolInfo(call.name) : undefined;
  const card = (tool: (typeof toolCatalog)[number], executing: boolean) => (
    <motion.div
      layoutId={reduced || inspecting ? undefined : tool.name}
      className={`tool-item ${executing ? 'tool-item-executing' : ''}`}
      transition={{
        type: 'spring',
        duration: reduced || inspecting || frozen ? 0 : 0.35,
        bounce: 0,
      }}
      data-tool-name={tool.name}
    >
      <div className="tool-item-heading">
        <ToolIcon name={tool.name} />
        <strong>{tool.label}</strong>
        {executing && call && (
          <span className={call.status === 'failed' ? 'tool-error' : ''} role="status">
            {call.status === 'running' ? (
              <LoaderCircle className="agent-tool-spinner" size={12} />
            ) : call.status === 'succeeded' ? (
              <Check size={12} />
            ) : call.status === 'failed' ? (
              <CircleAlert size={12} />
            ) : (
              <Play size={12} />
            )}
            {call.status === 'running' && stopped
              ? '执行已停止'
              : call.status === 'running' && frozen
                ? '执行已暂停'
                : toolStatus(call)}
          </span>
        )}
      </div>
      {executing && call && (
        <>
          <code className="tool-target">{call.path}</code>
          {call.result !== undefined ? (
            <p className={`tool-output ${call.status === 'failed' ? 'tool-error' : ''}`}>
              {call.result}
            </p>
          ) : !inspecting && gate?.callId === call.callId ? (
            <button
              className="tool-run"
              onClick={(e) => {
                e.currentTarget
                  .closest<HTMLElement>('.tool-execution')
                  ?.focus({ preventScroll: true });
                onExecute();
              }}
              disabled={frozen}
            >
              <Play size={12} />
              {tool.execute}
            </button>
          ) : (
            <p className="tool-waiting">
              {call.status === 'running' ? '等待工具结果' : '等待执行'}
            </p>
          )}
        </>
      )}
    </motion.div>
  );
  return (
    <section
      className="workbench-tools"
      aria-label="模拟工具区"
      data-flow-anchor="local-port"
      data-motion-paused={frozen || reduced || inspecting}
    >
      <header className="tools-title">
        <Wrench size={13} />
        <strong>工具列表</strong>
        <span>{inspecting ? '历史查看' : '模拟'}</span>
      </header>
      <LayoutGroup id={groupId}>
        <div className="tools-body">
          <section
            className="tool-execution"
            aria-label="工具执行区"
            data-flow-anchor={active && call ? `tool-${call.callId}` : undefined}
            data-call-id={active && call ? call.callId : undefined}
            tabIndex={-1}
          >
            <div className="tool-zone-label">
              <span>执行区</span>
              {active && call && <span>{call.callId}</span>}
            </div>
            {active ? (
              card(active, true)
            ) : (
              <p className="tool-idle">{inspecting ? '此 step 没有工具操作' : '等待 Agent 调用'}</p>
            )}
          </section>
          <section className="tool-candidates" aria-label="候选工具">
            <div className="tool-zone-label">
              <span>候选区</span>
              <span>{toolCatalog.length} 个工具</span>
            </div>
            {toolCatalog.map((tool) =>
              active?.name === tool.name ? (
                <div className="tool-item tool-placeholder" key={tool.name}>
                  <ToolIcon name={tool.name} />
                  <span>{tool.label}</span>
                  <small>{inspecting ? '正在查看' : '已调度'}</small>
                </div>
              ) : (
                <div key={tool.name}>{card(tool, false)}</div>
              ),
            )}
          </section>
        </div>
      </LayoutGroup>
    </section>
  );
}
