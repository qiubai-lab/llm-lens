import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Braces, Check, ChevronRight, Server, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Activity } from '../../core/agent-conversation/workbench';
import * as Dialog from '@radix-ui/react-dialog';
import type { Item } from '../../core/agent-conversation/fixtures';
import type { FlowState } from '../../core/agent-conversation/flow';
import { RawData } from './RawData';
export function ServiceWorkbench({
  activities,
  status,
  state,
  selectedId,
  onSelect,
  onFollow,
  detailId,
  onDetails,
  onCloseDetails,
}: {
  activities: Activity[];
  status: string;
  state: FlowState;
  selectedId?: string;
  onSelect: (id: string) => void;
  onFollow: () => void;
  detailId?: string;
  onDetails: (id: string) => void;
  onCloseDetails: () => void;
}) {
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const detail = activities.find((c) => c.id === detailId);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    const el = scroll.current;
    if (el && follow.current && !selectedId) el.scrollTop = el.scrollHeight;
  }, [activities, selectedId]);
  return (
    <aside className="workbench-service workbench-window" aria-label="服务端处理区">
      <header className="workbench-titlebar">
        <span className="window-mark">
          <Server size={16} />
        </span>
        <strong>模型服务</strong>
        {selectedId ? (
          <button
            className="service-follow"
            onClick={() => {
              follow.current = true;
              onFollow();
            }}
          >
            跟随当前流程
          </button>
        ) : (
          <span className="window-badge">SERVER</span>
        )}
      </header>
      <div className="service-status" data-flow-anchor="server-port">
        <span className="service-status-dot" />
        <span>
          {activities.length ? (status === '已停止' ? '连接已停止' : 'Responses API') : '等待请求'}
        </span>
        <span>HTTP / SSE</span>
      </div>
      <div
        className="service-scroll"
        ref={scroll}
        onScroll={() => {
          const el = scroll.current!;
          follow.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
      >
        {!activities.length && (
          <div className="service-empty">
            <span className="server-orbit">
              <Server size={25} />
            </span>
            <strong>一次请求，从这里进入模型</strong>
            <p>发送消息后查看处理过程</p>
          </div>
        )}
        {activities.map((card, i) => (
          <motion.article
            key={card.id}
            className={`service-action service-${card.kind} ${selectedId === card.id ? 'selected' : ''}`}
            data-flow-anchor={card.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              className="service-card-select"
              aria-pressed={selectedId === card.id}
              aria-label={`选择请求 ${card.round}：${card.title}`}
              onClick={() => onSelect(card.id)}
            >
              <div className="service-action-heading">
                <span className="service-action-icon">
                  {card.kind === 'request' ? (
                    <ArrowDownToLine size={14} />
                  ) : card.kind === 'call' ? (
                    <Braces size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                </span>
                <strong>{card.title}</strong>
                <span>
                  {card.status === '输出中' ||
                  card.status === '参数生成中' ||
                  card.status === '中断' ? (
                    card.status
                  ) : (
                    <Check size={13} />
                  )}
                </span>
              </div>
              <div className="service-action-meta">
                <span>请求 {card.round}</span>
                <span>{card.callId ?? (card.kind === 'answer' ? 'output_text' : 'input')}</span>
              </div>
              <p className="service-action-content">
                {card.content
                  ? card.kind === 'call'
                    ? `read_file(${card.content.startsWith('{') ? '…' : card.content})`
                    : card.content.slice(0, 100) + (card.content.length > 100 ? '…' : '')
                  : '等待内容…'}
              </p>
            </button>
            <button
              className="service-detail-trigger"
              aria-label={`查看请求 ${card.round} ${card.title}详情`}
              onClick={(e) => {
                detailTrigger.current = e.currentTarget;
                onDetails(card.id);
              }}
            >
              查看详情 <ChevronRight size={12} />
            </button>
            <span className="service-action-number" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
          </motion.article>
        ))}
      </div>
      <Dialog.Root
        open={Boolean(detail)}
        onOpenChange={(open) => {
          if (!open) onCloseDetails();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="activity-dialog"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              detailTrigger.current?.focus();
            }}
          >
            <header>
              <div>
                <Dialog.Title>{detail?.title}</Dialog.Title>
                <Dialog.Description>
                  请求 {detail?.round} · {detail?.status}
                </Dialog.Description>
              </div>
              <Dialog.Close className="icon-button" aria-label="关闭详情">
                <X size={18} />
              </Dialog.Close>
            </header>
            {detail && <ActivityDetail key={detail.id} card={detail} state={state} />}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <footer className="service-footer">
        <span>
          {activities.length
            ? `${new Set(activities.map((c) => c.round)).size} 轮请求`
            : '0 轮请求'}
        </span>
        <span className="service-foot-dots">
          <i />
          <i />
          <i />
        </span>
      </footer>
    </aside>
  );
}

function ActivityDetail({ card, state }: { card: Activity; state: FlowState }) {
  const [raw, setRaw] = useState(false);
  const call = state.calls.find((c) => c.callId === card.callId);
  const request = state.requests.find((r) => r.round === card.round);
  return (
    <>
      <div className="activity-detail-tabs">
        <button aria-pressed={!raw} onClick={() => setRaw(false)}>
          内容
        </button>
        <button aria-pressed={raw} onClick={() => setRaw(true)}>
          原始数据
        </button>
      </div>
      <div className="activity-detail-body">
        {raw ? (
          <RawData value={card.detail} />
        ) : card.kind === 'call' ? (
          <>
            <section>
              <h3>工具</h3>
              <code>
                {call?.name} · {card.callId}
              </code>
            </section>
            <section>
              <h3>参数</h3>
              <pre>{call?.path ? `path: ${call.path}` : call?.arguments || '参数生成中…'}</pre>
            </section>
            <section>
              <h3>
                本地结果 ·{' '}
                {call?.status === 'ready'
                  ? '等待执行'
                  : call?.status === 'failed'
                    ? '读取失败'
                    : call?.result !== undefined
                      ? '已返回'
                      : '尚未返回'}
              </h3>
              <pre>{call?.result ?? '尚无工具结果'}</pre>
            </section>
          </>
        ) : card.kind === 'answer' ? (
          <>
            <section>
              <h3>回答内容</h3>
              <p className="activity-answer">{card.content || '等待内容…'}</p>
            </section>
            <section>
              <h3>流事件</h3>
              {(card.detail as Item[]).map((event, i) => (
                <div className="activity-input" key={i}>
                  <span>{String(event.type)}</span>
                  <pre>{String(event.delta ?? event.text ?? '')}</pre>
                </div>
              ))}
            </section>
          </>
        ) : (
          <>
            <section>
              <h3>指令</h3>
              <p>{request?.body.instructions}</p>
            </section>
            <section>
              <h3>输入</h3>
              {request?.body.input.map((item, i) => (
                <div className="activity-input" key={i}>
                  <span>
                    {item.type === 'function_call_output'
                      ? `工具结果 · ${item.call_id}`
                      : item.type === 'function_call'
                        ? `工具调用 · ${item.call_id}`
                        : String(item.role ?? 'message')}
                  </span>
                  <pre>
                    {item.type === 'function_call_output'
                      ? String(item.output)
                      : item.type === 'function_call'
                        ? `${item.name}(${item.arguments})`
                        : String(item.content ?? '')}
                  </pre>
                </div>
              ))}
            </section>
            <section>
              <h3>可用工具</h3>
              {request?.body.tools.map((tool, i) => (
                <div className="activity-input" key={i}>
                  <code>{String(tool.name)}</code>
                  <p>{String(tool.description)}</p>
                  <span>
                    参数：
                    {Object.keys(
                      (tool.parameters as { properties?: object })?.properties ?? {},
                    ).join('、')}
                  </span>
                </div>
              ))}
            </section>
          </>
        )}
      </div>
    </>
  );
}
