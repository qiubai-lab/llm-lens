import { useEffect, useRef } from 'react';
import { ArrowDownToLine, Braces, Check, ChevronRight, Server, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import type { Activity } from '../../core/agent-conversation/workbench';
import { RawData } from './RawData';
export function ServiceWorkbench({
  activities,
  status,
}: {
  activities: Activity[];
  status: string;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => {
    const el = scroll.current;
    if (el && follow.current) el.scrollTop = el.scrollHeight;
  }, [activities]);
  return (
    <aside className="workbench-service workbench-window" aria-label="服务端处理区">
      <header className="workbench-titlebar">
        <span className="window-mark">
          <Server size={16} />
        </span>
        <strong>模型服务</strong>
        <span className="window-badge">SERVER</span>
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
            className={`service-action service-${card.kind}`}
            data-flow-anchor={card.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
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
            <details>
              <summary>
                查看数据 <ChevronRight size={12} />
              </summary>
              <RawData value={card.detail} />
            </details>
            <span className="service-action-number" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
          </motion.article>
        ))}
      </div>
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
