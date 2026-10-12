import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  FileText,
  Paperclip,
  Play,
  RotateCcw,
  Sparkles,
  Square,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Call, FlowState } from '../../core/agent-conversation/flow';
import { RawData } from './RawData';
const labels = {
  assembling: '接收参数',
  ready: '等待执行',
  running: '正在读取',
  succeeded: '已读取',
  failed: '读取失败',
};
export function AgentChat({
  state,
  question,
  busy,
  cancelled,
  ended,
  phase,
  gate,
  suspended,
  onSend,
  onStop,
  onExecute,
  onReset,
  interrupt,
  onInterrupt,
}: {
  state: FlowState;
  question: string;
  busy: boolean;
  cancelled: boolean;
  ended: boolean;
  phase: string;
  gate?: Call;
  suspended: boolean;
  onSend: () => void;
  onStop: () => void;
  onExecute: () => void;
  onReset: () => void;
  interrupt?: boolean;
  onInterrupt?: () => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const [newContent, setNewContent] = useState(false);
  useEffect(() => {
    const el = scroll.current;
    if (!el) return;
    if (follow.current) {
      el.scrollTop = el.scrollHeight;
      setNewContent(false);
    } else setNewContent(true);
  }, [state]);
  const sendLabel = busy
    ? '停止任务'
    : !ended && !cancelled && state.user
      ? '继续任务'
      : '发送消息';
  return (
    <section className="agent-chat workbench-window" aria-label="Agent 聊天窗口">
      <header className="agent-chat-header">
        <span className="agent-avatar agent-brand-avatar">
          <Sparkles size={18} />
        </span>
        <div>
          <strong>Lens Agent</strong>
          <span className="agent-header-subtitle">
            {gate
              ? '工具调用就绪'
              : state.calls.length
                ? `${state.calls.length} 个工具调用`
                : '工作区助手'}
          </span>
        </div>
        <span
          className={`agent-task-status ${state.task === 'blocked' ? 'agent-error' : ''}`}
          role="status"
        >
          <i />
          {phase}
        </span>
        <button className="icon-button" aria-label="重新开始" onClick={onReset}>
          <RotateCcw size={14} />
        </button>
      </header>
      <div className="agent-conversation-port" data-flow-anchor="chat-port">
        <span>对话与工具</span>
        <span>
          {state.requests.length ? `连接模型 · 第 ${state.requests.length} 轮` : '尚未发送'}
        </span>
      </div>
      <div
        className="agent-chat-scroll"
        ref={scroll}
        onScroll={() => {
          const el = scroll.current!;
          follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          if (follow.current) setNewContent(false);
        }}
      >
        {!state.user && (
          <div className="agent-chat-welcome">
            <span className="agent-welcome-mark">
              <Sparkles size={30} />
            </span>
            <strong>让任务，从一句话开始。</strong>
            <p>发送消息，观察 Agent 如何完成任务。</p>
            <div className="agent-welcome-pills">
              <span>
                <FileText size={12} /> 文件
              </span>
              <span>
                <Sparkles size={12} /> Skill
              </span>
            </div>
          </div>
        )}
        {state.user && (
          <div className="agent-user-message">
            <span className="agent-message-label">你</span>
            <p>{state.user}</p>
          </div>
        )}
        {state.calls.map((call) => (
          <article
            className={`agent-tool-card ${call.status === 'running' ? 'tool-active' : ''}`}
            key={call.id}
            data-flow-anchor={`agent-call-${call.callId}`}
          >
            <details>
              <summary>
                <span className="agent-tool-icon">
                  <FileText size={15} />
                </span>
                <span>
                  <strong>
                    {call.callId === 'call_skill' ? '加载项目摘要 Skill' : '读取项目文件'}
                  </strong>
                  <small>{call.path ?? 'read_file · 参数接收中'}</small>
                </span>
                <span
                  className={`agent-call-status ${call.status === 'failed' ? 'agent-error' : ''}`}
                >
                  {call.status === 'succeeded' && <Check size={12} />} {labels[call.status]}
                </span>
                <ChevronDown size={13} />
              </summary>
              <div className="agent-tool-details">
                <span className="tiny-label">{call.callId}</span>
                <RawData value={{ name: call.name, arguments: call.arguments }} />
                {call.result !== undefined && <RawData value={call.result} />}
              </div>
            </details>
            <div className="agent-tool-result" data-flow-anchor={`agent-result-${call.callId}`}>
              {call.result !== undefined ? (
                <>
                  <span>工具结果</span>
                  <p>
                    {(call.result.startsWith('---')
                      ? (call.result.split('---')[2]?.trim() ?? call.result)
                      : call.result
                    ).slice(0, 82)}
                    {call.result.length > 82 ? '…' : ''}
                  </p>
                </>
              ) : gate?.callId === call.callId ? (
                <button
                  className="agent-execute"
                  onClick={(e) => {
                    e.currentTarget
                      .closest('article')
                      ?.querySelector('summary')
                      ?.focus({ preventScroll: true });
                    onExecute();
                  }}
                  disabled={suspended || cancelled}
                >
                  <Play size={13} />
                  {call.callId === 'call_skill' ? '加载 Skill' : '执行读取'}
                  <span>→ 工作区</span>
                </button>
              ) : (
                <span className="agent-tool-pending">
                  {call.status === 'assembling' ? '等待参数完整' : '等待工具结果'}
                </span>
              )}
            </div>
          </article>
        ))}
        {state.answer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="agent-assistant-message"
            data-flow-anchor="answer"
          >
            <div className="assistant-byline">
              <Bot size={15} />
              <span>Lens Agent</span>
              {state.task === 'finished' && <Check size={13} />}
            </div>
            <p>
              {state.answer}
              <span
                className="agent-text-cursor"
                hidden={state.response !== 'streaming' || cancelled}
              />
            </p>
          </motion.div>
        )}
        {(state.task === 'blocked' || cancelled) && (
          <p className="agent-chat-warning">
            {cancelled
              ? '任务已停止，可重新发送。'
              : state.response === 'interrupted'
                ? '连接中断，已保留部分回答。'
                : '文件不存在，无法完成摘要。'}
          </p>
        )}
        {ended && !state.answer && !cancelled && (
          <p className="agent-delivered">
            <Check size={14} /> 请求已送达模型服务。
          </p>
        )}
      </div>
      <div className="agent-new-slot">
        {newContent && (
          <button
            onClick={() => {
              follow.current = true;
              scroll.current!.scrollTop = scroll.current!.scrollHeight;
              setNewContent(false);
            }}
          >
            <ArrowDown size={12} /> 回到最新消息
          </button>
        )}
      </div>
      <form
        className="agent-composer"
        data-flow-anchor="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (!busy) onSend();
        }}
      >
        <label htmlFor="agent-question" className="sr-only">
          当前场景问题
        </label>
        <textarea
          id="agent-question"
          value={question}
          readOnly
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && !busy) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <div className="composer-toolbar">
          <span className="composer-context">
            <Paperclip size={12} /> llm-lens <span className="composer-preset">· 场景问题</span>
          </span>
          <div>
            {onInterrupt && (
              <button
                type="button"
                className="composer-interrupt"
                disabled={busy}
                aria-pressed={interrupt}
                onClick={onInterrupt}
              >
                模拟中断
              </button>
            )}
            <button
              type="button"
              className="agent-send"
              disabled={suspended}
              onClick={busy ? onStop : onSend}
              aria-label={sendLabel}
            >
              {busy ? <Square size={15} /> : <ArrowUp size={17} />}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
