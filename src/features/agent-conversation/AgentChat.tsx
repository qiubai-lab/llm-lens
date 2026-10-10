import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  FileText,
  Square,
  UserRound,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { FlowState } from '../../core/agent-conversation/flow';
import { RawData } from './Panels';
const labels = {
  assembling: '准备调用',
  ready: '参数已校验',
  running: '正在读取',
  succeeded: '读取完成',
  failed: '读取失败',
};
export function AgentChat({
  state,
  question,
  playing,
  cancelled,
  canPlay,
  onPlay,
  onCancel,
}: {
  state: FlowState;
  question: string;
  playing: boolean;
  cancelled: boolean;
  canPlay: boolean;
  onPlay: () => void;
  onCancel: () => void;
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
  const status = cancelled
    ? '任务已取消'
    : state.task === 'finished'
      ? '任务完成'
      : state.task === 'blocked'
        ? '任务受阻'
        : state.calls.some((c) => c.status === 'running')
          ? '正在读取文件'
          : state.response === 'streaming'
            ? '正在接收响应'
            : '等待下一步';
  return (
    <section className="agent-chat" aria-label="Agent 仿真对话框" data-flow-anchor="chat">
      <header className="agent-chat-header">
        <span className="agent-avatar">
          <Bot size={20} />
        </span>
        <div>
          <strong>Lens Agent</strong>
          <span>一个看得见过程的对话</span>
        </div>
        <span className={`agent-task-status ${state.task === 'blocked' ? 'agent-error' : ''}`}>
          {status}
        </span>
      </header>
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
            <Bot size={30} />
            <strong>从一条消息开始</strong>
            <p>
              发送下方的教学问题，
              <br />
              跟着数据走一遍。
            </p>
          </div>
        )}
        {state.user && (
          <div className="agent-message agent-user-message">
            <span className="agent-avatar">
              <UserRound size={14} />
            </span>
            <div>
              <span className="agent-message-label">你</span>
              <p>{state.user}</p>
            </div>
          </div>
        )}
        {state.calls.map((call) => (
          <div className="agent-tool-card" key={call.id} data-call-id={call.callId}>
            <details>
              <summary>
                <FileText size={15} />
                <span>
                  <strong>read_file</strong>
                  <small>{call.path ?? '正在接收路径参数…'}</small>
                </span>
                <span
                  className={`agent-call-status ${call.status === 'failed' ? 'agent-error' : ''}`}
                >
                  {call.status === 'succeeded' && <Check size={12} />} {labels[call.status]}
                </span>
                <ChevronDown size={14} />
              </summary>
              <div className="agent-tool-details">
                <span className="tiny-label">{call.callId}</span>
                <RawData value={call.arguments || '等待参数'} />
                <strong>工具结果</strong>
                {call.result !== undefined ? (
                  <RawData value={call.result} />
                ) : (
                  <p>尚未产生结果；参数片段不会触发执行。</p>
                )}
              </div>
            </details>
            {call.result !== undefined && (
              <div
                className={`agent-result-preview ${call.status === 'failed' ? 'agent-error' : ''}`}
              >
                <span>工具结果预览 · 展开查看全文</span>
                <p>
                  {(call.result.startsWith('---')
                    ? (call.result.split('---')[2]?.trim() ?? call.result)
                    : call.result
                  ).slice(0, 72)}
                  {call.result.length > 72 ? '…' : ''}
                </p>
              </div>
            )}
          </div>
        ))}
        {state.answer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="agent-message agent-assistant-message"
          >
            <span className="agent-avatar">
              <Bot size={15} />
            </span>
            <div>
              <span className="agent-message-label">Lens Agent</span>
              <p>
                {state.answer}
                <span
                  className="agent-text-cursor"
                  hidden={state.response !== 'streaming' || cancelled}
                />
              </p>
            </div>
          </motion.div>
        )}
        {(state.task === 'blocked' || cancelled) && (
          <p className="agent-chat-warning">
            {cancelled
              ? '教学任务已取消。重播可恢复起点。'
              : state.response === 'interrupted'
                ? '连接中断。保留部分回答，未正常完成。'
                : '文件读取失败，无法根据文件完成摘要。'}
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
            <ArrowDown size={13} /> 有新内容，回到底部
          </button>
        )}
      </div>
      <div className="agent-composer">
        <label className="tiny-label" htmlFor="agent-question">
          当前教学问题 · 预设内容
        </label>
        <textarea id="agent-question" value={question} readOnly rows={2} />
        <div>
          <span>本地回放 · 无需密钥</span>
          <button
            className="agent-send"
            disabled={cancelled || !canPlay || (!playing && state.task !== 'active')}
            onClick={playing ? onCancel : onPlay}
            aria-label={playing ? '停止教学任务' : '发送教学问题'}
          >
            {playing ? <Square size={16} /> : <ArrowUp size={17} />}
          </button>
        </div>
      </div>
    </section>
  );
}
