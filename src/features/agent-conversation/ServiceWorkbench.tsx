import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDownToLine, Braces, Check, ChevronRight, Server, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import type { Activity } from '../../core/agent-conversation/workbench';
import * as Dialog from '@radix-ui/react-dialog';
import type { Item } from '../../core/agent-conversation/fixtures';
import type { FlowState } from '../../core/agent-conversation/flow';
import { JsonData } from './RawData';
import { useCalmMotion } from '../../components/MotionPreference';
import { ExpandContent, RevealText, useFollowExpansion } from './ContentReveal';
import { flowTiming } from './motionTiming';
import { toolInfo } from '../../core/agent-conversation/tools';
import { ToolIcon } from './ToolWorkbench';
export function ServiceWorkbench({
  activities,
  status,
  running,
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
  running: boolean;
  state: FlowState;
  selectedId?: string;
  onSelect: (id: string) => void;
  onFollow: () => void;
  detailId?: string;
  onDetails: (id: string) => void;
  onCloseDetails: () => void;
}) {
  const reduced = useCalmMotion();
  const detailTrigger = useRef<HTMLButtonElement>(null);
  const detail = activities.find((c) => c.id === detailId);
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const autoFollow = running && !selectedId;
  useFollowExpansion(scroll, follow, !selectedId, autoFollow);
  useEffect(() => {
    const el = scroll.current;
    if (!activities.length) follow.current = true;
    if (el && (follow.current || autoFollow) && !selectedId) el.scrollTop = el.scrollHeight;
  }, [activities, selectedId, autoFollow]);
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
          if (autoFollow) {
            follow.current = true;
            el.scrollTop = el.scrollHeight;
            return;
          }
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
          <Fragment key={card.id}>
            <ExpandContent>
              <motion.article
                key={card.id}
                className={`service-action service-${card.kind} ${selectedId === card.id ? 'selected' : ''}`}
                data-flow-anchor={card.id}
                initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: reduced ? 0 : flowTiming.content }}
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
                    <RevealText
                      delay={card.kind === 'request' ? flowTiming.arrival : 0.12}
                      text={
                        card.content
                          ? card.kind === 'call'
                            ? `${card.toolName}(${card.content.startsWith('{') ? '…' : card.content})`
                            : card.content.slice(0, 100) + (card.content.length > 100 ? '…' : '')
                          : '等待内容…'
                      }
                    />
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
            </ExpandContent>
            {card.kind === 'request' && (
              <ThinkingPhase
                request={card}
                output={activities.find((a) => a.round === card.round && a.kind !== 'request')}
                state={state}
                status={status}
                running={running}
                inspecting={Boolean(selectedId)}
                reduced={reduced}
              />
            )}
          </Fragment>
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
                  <span>请求 {detail?.round}</span>
                  <span className="activity-status">{detail?.status}</span>
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
  const body = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (body.current) body.current.scrollTop = 0;
  }, [raw]);
  const call = state.calls.find((c) => c.callId === card.callId);
  const request = state.requests.find((r) => r.round === card.round);
  return (
    <>
      <div className="activity-detail-tabs" aria-label="详情显示方式">
        <button aria-pressed={!raw} onClick={() => setRaw(false)}>
          内容
        </button>
        <button aria-pressed={raw} onClick={() => setRaw(true)}>
          原始数据
        </button>
      </div>
      <div className="activity-detail-body" data-raw={raw} ref={body}>
        <div className="activity-detail-formatted" aria-hidden={raw} inert={raw}>
          {card.kind === 'call' ? (
            <div className="activity-detail-columns">
              <div className="activity-detail-column">
                <section className="activity-section">
                  <h3>
                    本地结果{' '}
                    <span
                      className={`activity-status ${call?.status === 'failed' ? 'activity-status-error' : ''}`}
                    >
                      {call?.status === 'ready'
                        ? '等待执行'
                        : call?.status === 'failed'
                          ? '执行失败'
                          : call?.result !== undefined
                            ? '已返回'
                            : '尚未返回'}
                    </span>
                  </h3>
                  <pre>{formatDetailValue(call?.result ?? '尚无工具结果')}</pre>
                </section>
              </div>
              <aside
                className="activity-detail-column activity-detail-sidebar"
                aria-label="工具与参数"
              >
                <section className="activity-section">
                  <h3>工具</h3>
                  <dl className="activity-metadata">
                    <div>
                      <dt>函数</dt>
                      <dd>
                        <code>{call?.name ?? card.toolName}</code>
                      </dd>
                    </div>
                    <div>
                      <dt>调用 ID</dt>
                      <dd>
                        <code>{card.callId}</code>
                      </dd>
                    </div>
                  </dl>
                </section>
                <section className="activity-section">
                  <h3>参数</h3>
                  <pre>
                    {call?.input
                      ? JSON.stringify(call.input, null, 2)
                      : call?.arguments || '参数生成中…'}
                  </pre>
                </section>
              </aside>
            </div>
          ) : card.kind === 'answer' ? (
            <div className="activity-detail-columns">
              <div className="activity-detail-column">
                <section className="activity-section">
                  <h3>回答内容</h3>
                  <p className="activity-answer activity-copy">{card.content || '等待内容…'}</p>
                </section>
              </div>
              <aside
                className="activity-detail-column activity-detail-sidebar"
                aria-label="响应流事件"
              >
                <section className="activity-section">
                  <h3>
                    流事件{' '}
                    <span className="activity-count">{(card.detail as Item[]).length} 项</span>
                  </h3>
                  {(card.detail as Item[]).map((event, i) => (
                    <div className="activity-input" key={i}>
                      <div className="activity-input-heading">
                        <code>{String(event.type)}</code>
                      </div>
                      <pre>{String(event.delta ?? event.text ?? '')}</pre>
                    </div>
                  ))}
                </section>
              </aside>
            </div>
          ) : (
            <div className="activity-detail-columns">
              <div className="activity-detail-column">
                <section className="activity-section">
                  <h3>
                    输入{' '}
                    <span className="activity-count">{request?.body.input.length ?? 0} 项</span>
                  </h3>
                  {request?.body.input.map((item, i) => (
                    <div className="activity-input" key={i}>
                      <div className="activity-input-heading">
                        <span className="activity-role" data-role={String(item.role ?? item.type)}>
                          {item.type === 'function_call_output'
                            ? `工具结果 · ${item.call_id}`
                            : item.type === 'function_call'
                              ? `工具调用 · ${item.call_id}`
                              : String(item.role ?? 'message')}
                        </span>
                        {item.type === 'function_call' && <code>{String(item.name)}</code>}
                      </div>
                      <pre>
                        {item.type === 'function_call_output'
                          ? formatDetailValue(String(item.output))
                          : item.type === 'function_call'
                            ? formatDetailValue(String(item.arguments))
                            : String(item.content ?? '')}
                      </pre>
                    </div>
                  ))}
                </section>
              </div>
              <aside
                className="activity-detail-column activity-detail-sidebar"
                aria-label="指令与工具"
              >
                <section className="activity-section">
                  <h3>指令</h3>
                  <p className="activity-copy">
                    <DetailText text={request?.body.instructions ?? ''} />
                  </p>
                </section>
                <section className="activity-section">
                  <h3>
                    可用工具{' '}
                    <span className="activity-count">{request?.body.tools.length ?? 0} 个</span>
                  </h3>
                  <ul className="activity-tools">
                    {request?.body.tools.map((tool, i) => (
                      <DetailTool key={i} tool={tool} />
                    ))}
                  </ul>
                </section>
              </aside>
            </div>
          )}
        </div>
        {raw && (
          <div className="activity-detail-raw">
            <JsonData value={card.detail} />
          </div>
        )}
      </div>
    </>
  );
}

function DetailText({ text }: { text: string }) {
  return text
    .split(
      /(\b(?:read_file|write_file|list_directory|project-summary)\b|(?:notes|skills)\/[\w./-]+)/g,
    )
    .map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part));
}

function formatDetailValue(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object') return JSON.stringify(parsed, null, 2);
  } catch {
    /* Partial arguments and plain text stay readable as received. */
  }
  return value;
}

function DetailTool({ tool }: { tool: Item }) {
  const name = String(tool.name);
  const schema = tool.parameters as
    { properties?: Record<string, { type?: string }>; required?: string[] } | undefined;
  return (
    <li>
      <div className="activity-tool-info">
        <div className="activity-tool-name">
          <ToolIcon name={name} />
          <code>{name}</code>
          <span>{toolInfo(name)?.label}</span>
        </div>
        <p>
          <DetailText text={String(tool.description)} />
        </p>
      </div>
      <div className="activity-tool-parameters" aria-label={`${name} 参数`}>
        {Object.entries(schema?.properties ?? {}).map(([key, property]) => (
          <span className="activity-parameter" key={key}>
            <code>{key}</code>
            <span>{property.type ?? 'unknown'}</span>
            {schema?.required?.includes(key) && <span className="activity-required">必填</span>}
          </span>
        ))}
      </div>
    </li>
  );
}

function ThinkingPhase({
  request,
  output,
  state,
  status,
  running,
  inspecting,
  reduced,
}: {
  request: Activity;
  output?: Activity;
  state: FlowState;
  status: string;
  running: boolean;
  inspecting: boolean;
  reduced: boolean;
}) {
  const current = state.requests.at(-1)?.round === request.round;
  const started = Boolean(output) || !current || state.response !== 'waiting';
  if (!started) return null;
  const finished = Boolean(output);
  const stopped = !finished && status === '已停止';
  const paused = !finished && !stopped && !running;
  const label = finished
    ? '思考完成'
    : stopped
      ? '思考已停止'
      : paused
        ? '思考已暂停'
        : 'Thinking…';
  return (
    <ExpandContent>
      <details
        className="service-thinking"
        data-complete={finished}
        data-paused={paused || stopped || reduced || inspecting}
        data-round={request.round}
      >
        <summary>
          {finished ? (
            <Check size={14} aria-hidden="true" />
          ) : (
            <Sparkles size={14} aria-hidden="true" />
          )}
          <span role="status">{label}</span>
          {!finished && !stopped && (
            <span className="service-thinking-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          <ChevronRight className="service-thinking-chevron" size={12} aria-hidden="true" />
        </summary>
        <p>
          {finished
            ? output?.kind === 'call'
              ? `已发起 ${output.toolName} 工具调用。`
              : '已开始生成回答。'
            : stopped
              ? '本轮处理已停止。'
              : paused
                ? '本轮处理已暂停。'
                : '正在处理本轮请求。'}
        </p>
      </details>
    </ExpandContent>
  );
}
